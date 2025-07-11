"""
Email Hub Microsite
Flask application for CSV generation and email performance dashboard
"""

from flask import Flask, render_template, request, jsonify, send_file, abort
import os
import json
import subprocess
import tempfile
import time
from datetime import datetime
from typing import Dict, List, Any
import re

# Initialize Flask application
app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

def load_campaign_data():
    """Load and parse campaign data from JSON file with error handling"""
    try:
        # Path to the campaign data JSON file
        data_path = os.path.join(os.path.dirname(__file__), '..', 'email-impact', 'generated_outputs', 'microsite_campaign_data.json')
        
        with open(data_path, 'r', encoding='utf-8') as f:
            campaigns = json.load(f)
        
        # Process and normalize the data
        processed_campaigns = []
        for campaign in campaigns:
            try:
                # Parse timestamp and format send date
                send_timestamp = datetime.fromisoformat(campaign['send_timestamp_iso'].replace('Z', '+00:00'))
                send_date = send_timestamp.strftime('%Y-%m-%d %H:%M')
                
                # Handle potential infinite percentage_lift values
                percentage_lift = campaign['business_impact']['percentage_lift']
                if percentage_lift == float('inf') or percentage_lift == float('-inf'):
                    percentage_lift = 0
                
                processed_campaign = {
                    'id': campaign['campaign_id'],
                    'subject': campaign['subject'],
                    'send_date': send_date,
                    'send_timestamp': send_timestamp,
                    'tags': campaign['tags'],
                    'audience_size': campaign['email_performance']['audience_size'],
                    'open_rate': round(campaign['email_performance']['open_rate_pct'], 2),
                    'click_rate': round(campaign['email_performance']['click_rate_pct'], 2),
                    'total_clicks': campaign['email_performance']['total_clicks'],
                    'offers_before': campaign['business_impact']['offers_before'],
                    'offers_after': campaign['business_impact']['offers_after'],
                    'absolute_lift': campaign['business_impact']['absolute_lift'],
                    'percentage_lift': round(percentage_lift, 2) if isinstance(percentage_lift, (int, float)) else 0
                }
                processed_campaigns.append(processed_campaign)
                
            except (KeyError, ValueError, TypeError) as e:
                # Skip individual campaigns with data issues
                app.logger.warning(f"Skipping campaign {campaign.get('campaign_id', 'unknown')} due to data error: {e}")
                continue
        
        return processed_campaigns
        
    except FileNotFoundError:
        app.logger.error("Campaign data file not found")
        return []
    except json.JSONDecodeError:
        app.logger.error("Invalid JSON in campaign data file")
        return []
    except Exception as e:
        app.logger.error(f"Error loading campaign data: {e}")
        return []

def sort_campaigns(campaigns, sort_by='chronological'):
    """Sort campaigns based on the specified criteria"""
    if sort_by == 'lift':
        # Sort by percentage lift (descending - highest lift first)
        return sorted(campaigns, key=lambda x: x['percentage_lift'], reverse=True)
    else:
        # Default to chronological (most recent first)
        return sorted(campaigns, key=lambda x: x['send_timestamp'], reverse=True)

# CSV Generation Functions
def get_csv_scripts():
    """Discover and return available CSV generation scripts"""
    scripts = {}
    
    # Base path for email-csv-creation scripts
    base_path = os.path.join(os.path.dirname(__file__), '..', 'email-csv-creation')
    
    # Define available scripts and their metadata
    script_definitions = {
        'whos_hunting': {
            'file_path': os.path.join(base_path, 'generate_whos_hunting_csv.py'),
            'display_name': "Who's Hunting",
            'description': 'Generate CSV with hunters actively trading specific shoe sizes',
            'requires_product_id': False,
            'requires_multiple_products': False,
            'requires_input_file': False,
            'fields': [
                'email', 'firstname', 'usersize',
                'hunter1_username', 'hunter1_avatar', 'hunter1_userid', 'hunter1_tradecount', 
                'hunter1_offers7d', 'hunter1_target1_name', 'hunter1_target1_image',
                'hunter2_username', 'hunter2_avatar', 'hunter2_userid', 'hunter2_tradecount', 
                'hunter2_offers7d', 'hunter2_target1_name', 'hunter2_target1_image',
                'hunter3_username', 'hunter3_avatar', 'hunter3_userid', 'hunter3_tradecount', 
                'hunter3_offers7d', 'hunter3_target1_name', 'hunter3_target1_image'
            ]
        },
        'single_shoe_feature': {
            'file_path': os.path.join(base_path, 'generate_single_shoe_feature_csv.py'),
            'display_name': 'Single Shoe Feature',
            'description': 'Generate CSV featuring a specific product with detailed metrics',
            'requires_product_id': True,
            'requires_multiple_products': False,
            'requires_input_file': False,
            'fields': [
                'email', 'firstname', 'usersize',
                'feat_shoe1_offers_7d', 'feat_shoe1_closet_7d', 'feat_shoe1_wishlist_7d',
                'feat_shoe1_variantid', 'feat_shoe1_offers_in_size', 
                'feat_shoe1_inventory_in_size', 'feat_shoe1_wishlist_in_size'
            ]
        },
        'trending_shoes': {
            'file_path': os.path.join(base_path, 'generate_trending_shoes_csv.py'),
            'display_name': 'Trending Shoes',
            'description': 'Generate CSV featuring 3 trending products with variant data',
            'requires_product_id': False,
            'requires_multiple_products': True,
            'requires_input_file': False,
            'fields': [
                'email', 'firstname', 'usersize',
                'feat_shoe1_variantid', 'feat_shoe1_offers_in_size', 'feat_shoe1_inventory_in_size', 'feat_shoe1_wishlist_in_size',
                'feat_shoe2_variantid', 'feat_shoe2_offers_in_size', 'feat_shoe2_inventory_in_size', 'feat_shoe2_wishlist_in_size',
                'feat_shoe3_variantid', 'feat_shoe3_offers_in_size', 'feat_shoe3_inventory_in_size', 'feat_shoe3_wishlist_in_size'
            ]
        },
        'top_prospects': {
            'file_path': os.path.join(base_path, 'top-prospects-email', 'generate_top_prospects_csv.py'),
            'display_name': 'Top Prospects',
            'description': 'Generate CSV for re-engagement targeting based on user file input',
            'requires_product_id': False,
            'requires_multiple_products': False,
            'requires_input_file': True,
            'fields': [
                'email', 'firstname', 'usersize',
                'target_shoe_name', 'target_shoe_image', 'target_variantid',
                'target_offers_in_size', 'target_inventory_in_size', 'target_wishlist_in_size'
            ]
        }
    }
    
    # Only include scripts that actually exist
    for script_id, script_info in script_definitions.items():
        if os.path.exists(script_info['file_path']):
            scripts[script_id] = script_info
    
    return scripts

def validate_script_name(script_name: str) -> bool:
    """Validate script name against whitelist"""
    allowed_scripts = list(get_csv_scripts().keys())
    return script_name in allowed_scripts

def validate_input_parameters(params: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and sanitize input parameters"""
    validated = {}
    
    # Validate email_type
    if 'email_type' not in params:
        raise ValueError("email_type is required")
    
    email_type = params['email_type']
    if not validate_script_name(email_type):
        raise ValueError(f"Invalid email type: {email_type}")
    
    validated['email_type'] = email_type
    
    # Validate product_id if provided
    if 'product_id' in params and params['product_id']:
        product_id = params['product_id'].strip()
        # Basic UUID validation
        if not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', product_id, re.I):
            raise ValueError("Invalid product ID format")
        validated['product_id'] = product_id
    
    # Validate product_ids if provided (for trending shoes)
    if 'product_ids' in params and params['product_ids']:
        product_ids = []
        for pid in params['product_ids']:
            pid = pid.strip()
            if not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', pid, re.I):
                raise ValueError("Invalid product ID format")
            product_ids.append(pid)
        validated['product_ids'] = product_ids
    
    return validated

def execute_csv_script(script_name: str, params: Dict[str, Any]) -> str:
    """Execute CSV generation script with security safeguards"""
    scripts = get_csv_scripts()
    
    if script_name not in scripts:
        raise ValueError(f"Unknown script: {script_name}")
    
    script_info = scripts[script_name]
    script_path = script_info['file_path']
    
    # Build command arguments
    cmd = ['python3', script_path]
    
    # Add script-specific arguments
    if script_name == 'single_shoe_feature':
        if 'product_id' not in params:
            raise ValueError("product_id is required for single_shoe_feature")
        cmd.append(params['product_id'])
    
    elif script_name == 'trending_shoes':
        if 'product_ids' not in params or len(params['product_ids']) != 3:
            raise ValueError("Exactly 3 product_ids are required for trending_shoes")
        cmd.extend(['--product_ids'] + params['product_ids'])
    
    elif script_name == 'top_prospects':
        if 'input_file' not in params:
            raise ValueError("input_file is required for top_prospects")
        cmd.extend(['--input-file', params['input_file']])
    
    # Execute with timeout and capture output
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout
            check=False
        )
        
        if result.returncode != 0:
            raise RuntimeError(f"Script execution failed: {result.stderr}")
        
        # Parse output to find generated CSV file path
        # Most scripts print "Successfully created: <filepath>"
        output_lines = result.stdout.split('\n')
        csv_file_path = None
        
        for line in output_lines:
            if 'Successfully created:' in line:
                csv_file_path = line.split('Successfully created: ')[-1].strip()
                break
            elif '.csv' in line and 'Writing' in line:
                # Alternative pattern for some scripts
                parts = line.split()
                for part in parts:
                    if part.endswith('.csv'):
                        csv_file_path = part
                        break
        
        if not csv_file_path or not os.path.exists(csv_file_path):
            raise RuntimeError("CSV file not found after script execution")
        
        return csv_file_path
        
    except subprocess.TimeoutExpired:
        raise RuntimeError("Script execution timed out")
    except Exception as e:
        raise RuntimeError(f"Script execution error: {str(e)}")

@app.route('/')
def index():
    """CSV Generator page"""
    return render_template('index.html')

@app.route('/performance')
def performance():
    """Performance Dashboard page"""
    # Get sort parameter from query string
    sort_by = request.args.get('sort', 'chronological')
    
    # Load campaign data
    campaigns = load_campaign_data()
    
    # Sort campaigns based on the requested view
    sorted_campaigns = sort_campaigns(campaigns, sort_by)
    
    # Pass current sort method to template for UI state
    return render_template('performance.html', campaigns=sorted_campaigns, current_sort=sort_by)

# CSV Generation API Routes
@app.route('/api/email-types')
def api_email_types():
    """Return available email types/scripts"""
    try:
        scripts = get_csv_scripts()
        
        # Format response for frontend consumption
        email_types = []
        for script_id, script_info in scripts.items():
            email_types.append({
                'id': script_id,
                'name': script_info['display_name'],
                'description': script_info['description'],
                'requires_product_id': script_info['requires_product_id'],
                'requires_multiple_products': script_info['requires_multiple_products'],
                'requires_input_file': script_info['requires_input_file']
            })
        
        return jsonify({
            'success': True,
            'email_types': email_types
        })
    
    except Exception as e:
        app.logger.error(f"Error getting email types: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve email types'
        }), 500

@app.route('/api/email-type-fields/<email_type>')
def api_email_type_fields(email_type):
    """Return CSV field information for a specific email type"""
    try:
        scripts = get_csv_scripts()
        
        if email_type not in scripts:
            return jsonify({
                'success': False,
                'error': f'Unknown email type: {email_type}'
            }), 404
        
        script_info = scripts[email_type]
        
        return jsonify({
            'success': True,
            'email_type': email_type,
            'fields': script_info['fields'],
            'field_count': len(script_info['fields'])
        })
    
    except Exception as e:
        app.logger.error(f"Error getting fields for {email_type}: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve field information'
        }), 500

@app.route('/generate-csv', methods=['POST'])
def generate_csv():
    """Generate CSV file based on email type and parameters"""
    try:
        # Get form data
        form_data = request.form.to_dict()
        
        # Handle multiple product IDs for trending shoes
        if 'product_ids' in request.form:
            product_ids = request.form.getlist('product_ids')
            form_data['product_ids'] = [pid for pid in product_ids if pid.strip()]
        
        # Validate parameters
        try:
            validated_params = validate_input_parameters(form_data)
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
        
        # Execute CSV generation script
        try:
            csv_file_path = execute_csv_script(validated_params['email_type'], validated_params)
            
            # Return CSV file as download
            return send_file(
                csv_file_path,
                as_attachment=True,
                download_name=os.path.basename(csv_file_path),
                mimetype='text/csv'
            )
            
        except Exception as e:
            app.logger.error(f"CSV generation error: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'CSV generation failed: {str(e)}'
            }), 500
    
    except Exception as e:
        app.logger.error(f"Request processing error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Request processing failed'
        }), 500

if __name__ == '__main__':
    # Local development settings
    app.run(debug=True, host='0.0.0.0', port=5001) 