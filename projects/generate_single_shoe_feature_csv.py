import os
import sys
import csv
from datetime import datetime
from typing import List, Dict, Any
import argparse

# Add the project root to the Python path to allow importing from basic_capabilities
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from basic_capabilities.internal_db_queries_toolbox.email_csv_queries import (
    get_audience,
    get_products_by_ids,
    get_variants_by_product_ids,
)

def parse_args():
    """Parses command-line arguments."""
    parser = argparse.ArgumentParser(description="Generate a 'Single Shoe Feature' email CSV for a product and a target audience.")
    parser.add_argument("product_id", type=str, help="The UUID of the target product for the campaign.")
    parser.add_argument("--days_since_last_active", type=int, default=365, help="Maximum number of days since a user was last active.")
    parser.add_argument("--stats_lookback_days", type=int, default=30, help="Number of days to look back for product statistics.")
    return parser.parse_args()

def generate_single_shoe_feature_csv(
    product_id: str, 
    stats_lookback_days: int,
    days_since_last_active: int, 
    min_closet_items: int, 
    min_lifetime_trades: int,
    output_dir: str = 'projects/email-csv-creation/generated_csvs'
):
    """
    Generates a CSV for a "Single Shoe Feature" email campaign for a single product.

    This script first fetches a general audience of engaged users based on activity criteria.
    Then, it gathers detailed data about a specific product and its variants.
    Finally, it combines the data, matching users to the product's variants based on their
    preferred shoe size, and creates a single CSV file formatted for an email campaign.

    Args:
        product_id: The UUID of the target product for the campaign.
        stats_lookback_days: The lookback period in days for product/variant stats.
        days_since_last_active: Max days since a user was active to be in the audience.
        min_closet_items: Min closet items for a user to be in the audience.
        min_lifetime_trades: Min lifetime trades for a user to be in the audience.
        output_dir: The directory where the generated CSV will be saved.

    Returns:
        The file path of the generated CSV.
    """
    print("--- Starting 'Single Shoe Feature' CSV Generation ---")
    print(f"Audience Criteria: Last Active <= {days_since_last_active}d, Min Closet >= {min_closet_items}, Min Trades >= {min_lifetime_trades}")
    print(f"Product: {product_id}, Stats Lookback: {stats_lookback_days}d")
    
    # --- 1. EXTRACT: Fetch all the necessary data ---
    print("Fetching audience data...")
    audience_data = get_audience(days_since_last_active, min_closet_items, min_lifetime_trades)
    print(f"--- Found {len(audience_data)} users in the audience. ---")

    print("Fetching product data...")
    product_data = get_products_by_ids([product_id], stats_lookback_days)

    print("Fetching variant data...")
    variants_data = get_variants_by_product_ids([product_id], stats_lookback_days)

    if not audience_data or not product_data:
        print("Error: Could not retrieve audience or product data. Aborting.")
        return None

    # --- 2. TRANSFORM: Process and combine the data ---
    print("Processing and combining data...")
    
    # Create a dictionary for quick variant lookup by size
    # Normalize the size to a float to ensure consistent matching
    variants_by_size = {float(v['size']): v for v in variants_data}

    # Since we are fetching for a single product, we can grab it directly.
    product_info = product_data[0] if product_data else {}

    # Combine data
    final_data = []
    for user in audience_data:
        try:
            # Normalize the user's shoe size to a float for lookup
            user_size = float(user.get('shoe_size'))
            
            if user_size in variants_by_size:
                variant = variants_by_size[user_size]
                
                # Create the final flat dictionary for the CSV row by mapping data
                # from our queries to the required CSV fieldnames.
                row = {
                    'email': user.get('user_email'),
                    'firstname': user.get('user_first_name'),
                    'usersize': user.get('shoe_size'),
                    'feat_shoe1_offers_7d': product_info.get('recent_offers_to_get'),
                    'feat_shoe1_closet_7d': product_info.get('recent_closet_adds'),
                    'feat_shoe1_wishlist_7d': product_info.get('recent_wishlist_adds'),
                    'feat_shoe1_variantid': variant.get('variant_id'),
                    'feat_shoe1_offers_in_size': variant.get('recent_offers_to_get'),
                    'feat_shoe1_inventory_in_size': variant.get('total_closet_owners'),
                    'feat_shoe1_wishlist_in_size': variant.get('total_wishlist_adds'),
                }
                final_data.append(row)
        except (ValueError, TypeError):
            # Handle cases where shoe_size is not a valid number
            continue

    if not final_data:
        print("--- No matching users and variants found. Resulting CSV will be empty. ---")
        
    # Define the order of columns for the CSV
    fieldnames = [
        'email', 'firstname', 'usersize', 
        'feat_shoe1_offers_7d', 'feat_shoe1_closet_7d', 'feat_shoe1_wishlist_7d', 
        'feat_shoe1_variantid', 'feat_shoe1_offers_in_size', 
        'feat_shoe1_inventory_in_size', 'feat_shoe1_wishlist_in_size'
    ]

    # --- 3. LOAD: Write the data to a CSV file ---
    
    # Create the output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Generate a unique filename
    product_name_slug = product_info.get('name', 'product').lower().replace(' ', '_').replace("'", "")
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    file_path = os.path.join(output_dir, f"single_shoe_{product_name_slug}_{timestamp}.csv")
    
    print(f"Writing data to {file_path}...")
    
    with open(file_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(final_data)

    print(f"--- CSV Generation Complete. {len(final_data)} rows written. ---")
    
    return file_path


if __name__ == '__main__':
    args = parse_args()
    
    generate_single_shoe_feature_csv(
        product_id=args.product_id, 
        stats_lookback_days=args.stats_lookback_days,
        days_since_last_active=args.days_since_last_active,
        min_closet_items=args.min_closet_items,
        min_lifetime_trades=args.min_lifetime_trades
    )