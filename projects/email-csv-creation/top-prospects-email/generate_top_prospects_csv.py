#!/usr/bin/env python3
import argparse
import csv
import datetime
import os
import sys
from typing import List, Dict, Any

# Adjust the path to include the parent directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from basic_capabilities.internal_db_queries_toolbox.email_csv_queries import (
    get_user_data_by_ids,
    get_top_target_shoe_for_users
)

def parse_args():
    """Parses command-line arguments."""
    parser = argparse.ArgumentParser(description="Generate a CSV of 'Top Prospects' for an email campaign.")
    parser.add_argument(
        '--input-file', 
        type=str, 
        required=True,
        help="Path to the input CSV file containing user IDs."
    )
    parser.add_argument(
        '--output-dir', 
        type=str, 
        default='outputs',
        help="Directory to save the generated CSV file."
    )
    return parser.parse_args()

def read_user_ids(file_path: str) -> List[str]:
    """Reads user IDs from a CSV file."""
    user_ids = []
    try:
        with open(file_path, 'r', newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if 'user_id' in row:
                    user_ids.append(row['user_id'])
    except FileNotFoundError:
        print(f"Error: The file at {file_path} was not found.")
        sys.exit(1)
    except Exception as e:
        print(f"An error occurred while reading the CSV file: {e}")
        sys.exit(1)
    
    if not user_ids:
        print("Warning: No user IDs found in the input file.")
        
    return user_ids

def main():
    """Main function to generate the Top Prospects CSV."""
    args = parse_args()

    # Create output directory if it doesn't exist
    output_path = os.path.join(os.path.dirname(__file__), args.output_dir)
    if not os.path.exists(output_path):
        os.makedirs(output_path)

    user_ids = read_user_ids(args.input_file)
    if not user_ids:
        print("Exiting: No user IDs to process.")
        return

    print("Fetching user data...")
    user_data = {item['user_id']: item for item in get_user_data_by_ids(user_ids)}
    
    print("Fetching top target shoes...")
    target_shoe_data = {item['user_id']: item for item in get_top_target_shoe_for_users(user_ids)}

    final_data = []
    for user_id in user_ids:
        if user_id not in user_data:
            print(f"Warning: Skipping user {user_id} - missing basic data (email, name, or size).")
            continue
        if user_id not in target_shoe_data:
            print(f"Warning: Skipping user {user_id} - no desired items found.")
            continue
            
        # Merge data
        combined_record = {**user_data[user_id], **target_shoe_data[user_id]}
        final_data.append(combined_record)

    # TODO: Implement CSV writing logic
    print(f"Successfully processed {len(final_data)} users with complete data.")
    print("Main logic complete. CSV writing to be implemented.")


if __name__ == '__main__':
    main() 