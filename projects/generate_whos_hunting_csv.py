#!/usr/bin/env python3

import argparse
import csv
import datetime
import os
import sys
from typing import Dict, Any, List

# Add the project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from basic_capabilities.internal_db_queries_toolbox.email_csv_queries import get_audience, get_whos_hunting_data_by_size

# Standard set of men's shoe sizes for this campaign
STANDARD_SHOE_SIZES = [
    '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', 
    '10', '10.5', '11', '11.5', '12', '12.5', '13', '14', '15', '16', '17', '18'
]

def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Generate a CSV for the 'Who's Huntin'' email campaign.")
    parser.add_argument('--audience-size', type=int, default=1000, help="The maximum number of users to include in the audience.")
    parser.add_argument('--days-since-last-active', type=int, default=30, help="The maximum number of days since a user was last active.")
    parser.add_argument('--min-closet-items', type=int, default=1, help="The minimum number of items a user must have in their closet.")
    parser.add_argument('--min-lifetime-trades', type=int, default=0, help="The minimum number of completed trades a user must have.")
    parser.add_argument('--lookback-days', type=int, default=7, help="The number of days to look back for hunter offer activity.")
    return parser.parse_args()

def format_hunter_data_for_row(hunters: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Flattens the list of up to 3 hunter dictionaries for a single CSV row.
    """
    flat_data = {}
    for i, hunter in enumerate(hunters, 1):
        flat_data[f'hunter{i}_username'] = hunter.get('hunter_username')
        flat_data[f'hunter{i}_avatar'] = hunter.get('hunter_avatar_path')
        flat_data[f'hunter{i}_userid'] = hunter.get('hunter_user_id')
        flat_data[f'hunter{i}_tradecount'] = hunter.get('hunter_trade_count')
        flat_data[f'hunter{i}_offers7d'] = hunter.get('offers_for_product')
        flat_data[f'hunter{i}_target1_name'] = hunter.get('target_product_name')
        flat_data[f'hunter{i}_target1_image'] = hunter.get('target_product_image_path')
    # Fill remaining hunter columns with nulls if fewer than 3 hunters were found
    for i in range(len(hunters) + 1, 4):
        flat_data[f'hunter{i}_username'] = None
        flat_data[f'hunter{i}_avatar'] = None
        flat_data[f'hunter{i}_userid'] = None
        flat_data[f'hunter{i}_tradecount'] = None
        flat_data[f'hunter{i}_offers7d'] = None
        flat_data[f'hunter{i}_target1_name'] = None
        flat_data[f'hunter{i}_target1_image'] = None
    return flat_data

def main():
    """Main function to generate the CSV."""
    args = parse_args()

    print("--- Starting Who's Huntin' CSV Generation ---")
    
    # 1. Fetch the top hunters for all standard shoe sizes
    print(f"Finding hunters for {len(STANDARD_SHOE_SIZES)} standard sizes...")
    hunters_by_size = get_whos_hunting_data_by_size(STANDARD_SHOE_SIZES, args.lookback_days)

    if not hunters_by_size:
        print("Error: Could not find any hunters for the standard sizes. Exiting.")
        sys.exit(1)

    # 2. Fetch the audience
    print("Fetching audience...")
    audience = get_audience(
        days_since_last_active=args.days_since_last_active,
        min_closet_items=args.min_closet_items,
        min_lifetime_trades=args.min_lifetime_trades,
        limit=args.audience_size
    )

    if not audience:
        print("No users found in the audience for the given criteria. Exiting.")
        sys.exit(0)
    
    # 3. Combine data and prepare for CSV
    final_data = []
    for recipient in audience:
        recipient_size = recipient.get('shoe_size')
        if not recipient_size:
            continue
        
        # Find the hunter data for this recipient's size
        # The keys in hunters_by_size are strings, so we match directly.
        top_hunters_for_size = hunters_by_size.get(recipient_size)

        if top_hunters_for_size and len(top_hunters_for_size) >= 3:
            # Flatten the hunter data for the CSV row
            hunter_data_flat = format_hunter_data_for_row(top_hunters_for_size[:3])
            
            row_data = {
                'email': recipient.get('email'),
                'firstname': recipient.get('first_name'),
                'usersize': recipient_size
            }
            row_data.update(hunter_data_flat)
            final_data.append(row_data)

    # 4. Prepare CSV file and headers
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    output_filename = f"whos_hunting_audience_csv_{timestamp}.csv"
    output_dir = os.path.join(os.path.dirname(__file__), "generated_csvs")
    os.makedirs(output_dir, exist_ok=True)
    filename = os.path.join(output_dir, output_filename)

    header = [
        'email', 'firstname', 'usersize',
        'hunter1_username', 'hunter1_avatar', 'hunter1_userid', 'hunter1_tradecount', 'hunter1_offers7d', 'hunter1_target1_name', 'hunter1_target1_image',
        'hunter2_username', 'hunter2_avatar', 'hunter2_userid', 'hunter2_tradecount', 'hunter2_offers7d', 'hunter2_target1_name', 'hunter2_target1_image',
        'hunter3_username', 'hunter3_avatar', 'hunter3_userid', 'hunter3_tradecount', 'hunter3_offers7d', 'hunter3_target1_name', 'hunter3_target1_image'
    ]

    print(f"Writing {len(final_data)} rows to {filename}...")

    # 5. Write data to CSV
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=header)
        writer.writeheader()
        writer.writerows(final_data)

    print("--- CSV Generation Complete ---")
    print(f"Successfully created: {filename}")

if __name__ == '__main__':
    main() 