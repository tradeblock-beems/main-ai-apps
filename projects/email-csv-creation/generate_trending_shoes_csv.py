import os
import sys
import csv
from datetime import datetime
from typing import List, Dict, Any
import argparse
import pandas as pd

# Add the project root to the Python path to allow importing from basic_capabilities
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from basic_capabilities.internal_db_queries_toolbox.email_csv_queries import (
    get_audience,
    get_products_by_ids,
    get_variants_by_product_ids,
)
from basic_capabilities.internal_db_queries_toolbox.sql_utils import execute_query

def parse_args():
    """Parses command-line arguments."""
    parser = argparse.ArgumentParser(description="Generate a 'Trending Shoes' email CSV for a list of products and a target audience.")
    parser.add_argument("--product_ids", nargs=3, required=True, help="A list of exactly 3 product IDs to feature.")
    parser.add_argument("--days_since_last_active", type=int, default=365, help="Maximum number of days since a user was last active.")
    parser.add_argument("--min_closet_items", type=int, default=0, help="Minimum number of items in a user's closet.")
    parser.add_argument("--min_lifetime_trades", type=int, default=0, help="Minimum number of lifetime trades for a user.")
    parser.add_argument("--stats_lookback_days", type=int, default=30, help="Number of days to look back for product statistics.")
    return parser.parse_args()

def generate_trending_shoes_csv(
    product_ids: List[str], 
    stats_lookback_days: int,
    days_since_last_active: int, 
    min_closet_items: int, 
    min_lifetime_trades: int,
    output_dir: str = 'projects/email-csv-creation/generated_csvs'
):
    """
    Generates a CSV for a "Trending Shoes" email campaign for a list of products.

    This script first fetches a general audience of engaged users based on activity criteria.
    Then, it gathers detailed data about the specified products and their variants.
    Finally, it combines the data, matching users to the product variants based on their
    preferred shoe size, and creates a single CSV file formatted for the email campaign.

    Args:
        product_ids: A list of exactly 3 product IDs to feature.
        stats_lookback_days: The lookback period in days for product/variant stats.
        days_since_last_active: Max days since a user was active to be in the audience.
        min_closet_items: Min closet items for a user to be in the audience.
        min_lifetime_trades: Min lifetime trades for a user to be in the audience.
        output_dir: The directory where the generated CSV will be saved.

    Returns:
        The file path of the generated CSV.
    """
    print("--- Starting 'Trending Shoes' CSV Generation ---")
    print(f"Audience Criteria: Last Active <= {days_since_last_active}d, Min Closet >= {min_closet_items}, Min Trades >= {min_lifetime_trades}")
    print(f"Products: {product_ids}, Stats Lookback: {stats_lookback_days}d")
    
    # --- 1. EXTRACT: Fetch all the necessary data ---
    print("Fetching audience data...")
    audience_data = get_audience(days_since_last_active, min_closet_items, min_lifetime_trades)
    print(f"--- Found {len(audience_data)} users in the audience. ---")

    print("Fetching product data...")
    product_data = get_products_by_ids(product_ids, stats_lookback_days)

    print("Fetching variant data...")
    variants_data = get_variants_by_product_ids(product_ids, stats_lookback_days)

    if not audience_data or not product_data:
        print("Error: Could not retrieve audience or product data. Aborting.")
        return None

    # --- 2. TRANSFORM: Process and combine the data ---
    print("Processing and combining data...")
    
    # Create a nested dictionary for quick variant lookup by product_id and then size
    # {product_id: {size: variant_dict}}
    variants_by_product_and_size = {}
    for v in variants_data:
        try:
            product_id = v['product_id']
            size = float(v['size'])
            if product_id not in variants_by_product_and_size:
                variants_by_product_and_size[product_id] = {}
            variants_by_product_and_size[product_id][size] = v
        except (ValueError, TypeError, KeyError):
            continue

    # Combine data
    final_data = []
    for user in audience_data:
        try:
            # Normalize the user's shoe size to a float for lookup
            user_size = float(user.get('shoe_size'))
            
            # Create the base row with user info
            row = {
                'email': user.get('user_email'),
                'firstname': user.get('user_first_name'),
                'usersize': user.get('shoe_size'),
            }
            
            # Flag to ensure we only include users who can be matched to at least one shoe
            matched_at_least_one = False

            # Iterate through the three featured product IDs to populate the row
            for i, product_id in enumerate(product_ids, 1):
                variant = variants_by_product_and_size.get(product_id, {}).get(user_size)
                
                if variant:
                    matched_at_least_one = True
                    row[f'feat_shoe{i}_variantid'] = variant.get('variant_id')
                    row[f'feat_shoe{i}_offers_in_size'] = variant.get('recent_offers_to_get')
                    row[f'feat_shoe{i}_inventory_in_size'] = variant.get('total_closet_owners')
                    row[f'feat_shoe{i}_wishlist_in_size'] = variant.get('total_wishlist_adds')
                else:
                    # If no matching variant, fill with empty values
                    row[f'feat_shoe{i}_variantid'] = None
                    row[f'feat_shoe{i}_offers_in_size'] = None
                    row[f'feat_shoe{i}_inventory_in_size'] = None
                    row[f'feat_shoe{i}_wishlist_in_size'] = None
            
            if matched_at_least_one:
                final_data.append(row)
        except (ValueError, TypeError):
            # Handle cases where shoe_size is not a valid number
            continue

    if not final_data:
        print("--- No matching users and variants found. Resulting CSV will be empty. ---")
        
    # Define the order of columns for the CSV, matching the example file
    fieldnames = [
        'email', 'firstname', 'usersize',
        'feat_shoe1_variantid', 'feat_shoe1_offers_in_size', 'feat_shoe1_inventory_in_size', 'feat_shoe1_wishlist_in_size',
        'feat_shoe2_variantid', 'feat_shoe2_offers_in_size', 'feat_shoe2_inventory_in_size', 'feat_shoe2_wishlist_in_size',
        'feat_shoe3_variantid', 'feat_shoe3_offers_in_size', 'feat_shoe3_inventory_in_size', 'feat_shoe3_wishlist_in_size',
    ]

    # --- 3. LOAD: Write the data to a CSV file ---
    
    # Create the output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Generate a unique filename
    product_name_slug = "trending_shoes"
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    file_path = os.path.join(output_dir, f"{product_name_slug}_{timestamp}.csv")
    
    print(f"Writing data to {file_path}...")
    
    with open(file_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(final_data)

    print(f"--- CSV Generation Complete. {len(final_data)} rows written. ---")
    
    return file_path


if __name__ == '__main__':
    args = parse_args()
    
    generate_trending_shoes_csv(
        product_ids=args.product_ids, 
        stats_lookback_days=args.stats_lookback_days,
        days_since_last_active=args.days_since_last_active,
        min_closet_items=args.min_closet_items,
        min_lifetime_trades=args.min_lifetime_trades
    )