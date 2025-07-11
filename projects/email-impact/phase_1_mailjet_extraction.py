import os
import csv
import sys
import time
import json
import argparse
from datetime import datetime, timedelta
from mailjet_rest import Client
import pandas as pd
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Import credentials securely from the config module
from basic_capabilities.internal_db_queries_toolbox.config import MAILJET_API_KEY, MAILJET_API_SECRET

# --- Configuration ---
OUTPUT_DIR = "projects/email-impact/generated_outputs/phase_1"
CACHE_FILE = os.path.join(OUTPUT_DIR, "_all_messages_cache.json")
MAILJET_API_VERSION = 'v3'
MAX_WORKERS = 10 # Number of parallel workers for API calls

# --- Helper Functions ---

def get_mailjet_client():
    """Initializes and returns the Mailjet API client."""
    return Client(auth=(MAILJET_API_KEY, MAILJET_API_SECRET), version=MAILJET_API_VERSION)

def fetch_all_messages(client, limit=None):
    """Fetches all messages from Mailjet, handling pagination."""
    all_messages = []
    page_limit = 1000
    offset = 0
    with tqdm(desc="Fetching message list") as pbar:
        while True:
            # Break if we've hit the user-defined limit
            if limit and len(all_messages) >= limit:
                all_messages = all_messages[:limit]
                pbar.update(limit)
                break

            params = {
                "Limit": page_limit,
                "Offset": offset,
                "ShowContactAlt": True,
                "ShowSubject": True
            }
            result = client.message.get(filters=params).json()
            messages = result.get('Data', [])
            if not messages:
                break
            
            all_messages.extend(messages)
            pbar.update(len(messages))
            offset += page_limit
            
    return all_messages

def get_message_history(client, message_id):
    """Fetches the event history for a single message."""
    history = {'opened': False, 'opened_at': None, 'clicked': False, 'clicked_at': None}
    try:
        result = client.messagehistory.get(id=message_id).json()
        events = result.get('Data', [])
        for event in events:
            if event['EventType'] == 'opened' and not history['opened']:
                history['opened'] = True
                history['opened_at'] = event.get('EventAt')
            if event['EventType'] == 'clicked' and not history['clicked']:
                history['clicked'] = True
                history['clicked_at'] = event.get('EventAt')
    except Exception as e:
        print(f"Could not retrieve history for message {message_id}: {e}")
    return history

def process_message_with_history(client, message):
    """Helper function to combine message data with its history."""
    history = get_message_history(client, message['ID'])
    return {
        'campaign_id': message.get('CampaignID'),
        'subject': message.get('Subject'),
        'user_email': message.get('ContactAlt'),
        'delivered_at': message.get('ArrivedAt'),
        'opened': history['opened'],
        'opened_at': history['opened_at'],
        'clicked': history['clicked'],
        'clicked_at': history['clicked_at'],
    }

def identify_ab_tests(campaigns_df, time_window_minutes=5, size_tolerance_percent=10):
    """Identifies A/B test groups within campaigns."""
    campaigns_df['send_timestamp'] = pd.to_datetime(campaigns_df['send_timestamp'])
    campaigns_df = campaigns_df.sort_values(by='send_timestamp').reset_index(drop=True)
    
    test_group_id = 0
    campaigns_df['subject_line_test_id'] = None
    processed_indices = set()

    for i in range(len(campaigns_df)):
        if i in processed_indices:
            continue

        current_campaign = campaigns_df.iloc[i]
        time_window = current_campaign['send_timestamp'] + timedelta(minutes=time_window_minutes)
        
        # Find campaigns within the time window
        potential_matches = campaigns_df[
            (campaigns_df['send_timestamp'] > current_campaign['send_timestamp']) &
            (campaigns_df['send_timestamp'] <= time_window)
        ]
        
        # Check audience size tolerance
        lower_bound = current_campaign['audience_size'] * (1 - size_tolerance_percent / 100)
        upper_bound = current_campaign['audience_size'] * (1 + size_tolerance_percent / 100)
        
        actual_matches = potential_matches[
            (potential_matches['audience_size'] >= lower_bound) &
            (potential_matches['audience_size'] <= upper_bound)
        ]

        if not actual_matches.empty:
            test_group_id += 1
            test_id_str = f"ab_test_{test_group_id}"
            
            # Assign test ID to the current campaign and all matches
            campaigns_df.loc[i, 'subject_line_test_id'] = test_id_str
            processed_indices.add(i)
            for match_index in actual_matches.index:
                campaigns_df.loc[match_index, 'subject_line_test_id'] = test_id_str
                processed_indices.add(match_index)
                
    return campaigns_df

# --- Main Execution Logic ---

def main():
    """Main function to execute the data extraction and processing phase."""
    parser = argparse.ArgumentParser(description="Run Phase 1 Mailjet data extraction.")
    parser.add_argument(
        '--no-parallel', 
        action='store_true', 
        help="Run the script in sequential mode for comparison."
    )
    parser.add_argument(
        '--limit', 
        type=int, 
        default=None,
        help="Limit the number of messages to process for testing."
    )
    parser.add_argument(
        '--force-refetch',
        action='store_true',
        help="Ignore the local cache and fetch all messages from the API."
    )
    args = parser.parse_args()

    print("--- Phase 1: Mailjet Data Extraction & Cleansing ---")
    if args.no_parallel:
        print("*** RUNNING IN SEQUENTIAL MODE ***")
    if args.limit:
        print(f"*** PROCESSING A LIMIT OF {args.limit} MESSAGES ***")

    # 1. Initialize client and create output directory
    client = get_mailjet_client()
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 2. Fetch all messages (with caching)
    messages = []
    if not args.force_refetch and os.path.exists(CACHE_FILE):
        print(f"Found cache file. Loading messages from {CACHE_FILE}...")
        with open(CACHE_FILE, 'r') as f:
            messages = json.load(f)
        print(f"Loaded {len(messages)} messages from cache.")
        if args.limit:
            messages = messages[:args.limit]
            print(f"  ...trimmed to {len(messages)} messages based on --limit.")

    else:
        print("Task: Fetching all message data from Mailjet (no cache found or --force-refetch used)...")
        messages = fetch_all_messages(client, limit=args.limit)
        print(f"Task: Saving {len(messages)} messages to cache file: {CACHE_FILE}")
        with open(CACHE_FILE, 'w') as f:
            json.dump(messages, f, indent=2)

    if not messages:
        print("No messages found. Exiting.")
        return

    # 3. Process each message to get its history
    print("Task: Fetching detailed event history for each message...")
    start_time = time.time()
    processed_data = []

    if args.no_parallel:
        # Sequential execution
        for msg in tqdm(messages, desc="Fetching message history (Sequential)"):
            processed_data.append(process_message_with_history(client, msg))
    else:
        # Parallel execution
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = [executor.submit(process_message_with_history, client, msg) for msg in messages]
            for future in tqdm(as_completed(futures), total=len(messages), desc="Fetching message history (Parallel)"):
                try:
                    processed_data.append(future.result())
                except Exception as e:
                    print(f"A task generated an exception: {e}")

    end_time = time.time()
    duration = end_time - start_time
    print(f"--- History fetching complete in {duration:.2f} seconds ---")

    df = pd.DataFrame(processed_data)
    df = df[df['campaign_id'].notna()] # Filter out messages without a campaign
    df['campaign_id'] = df['campaign_id'].astype(int)

    # 4. Group by campaign and filter
    print("Task: Grouping data by campaign and filtering out test sends...")
    campaign_groups = df.groupby('campaign_id')
    
    campaign_summaries = []
    for campaign_id, group_df in campaign_groups:
        audience_size = len(group_df)
        if audience_size >= 10:
            campaign_summaries.append({
                'campaign_id': campaign_id,
                'subject': group_df['subject'].iloc[0],
                'send_timestamp': group_df['delivered_at'].min(),
                'audience_size': audience_size,
                'total_opens': group_df['opened'].sum(),
                'total_clicks': group_df['clicked'].sum(),
            })

    campaigns_df = pd.DataFrame(campaign_summaries)
    
    # 5. Identify A/B tests
    print("Task: Identifying A/B test campaigns...")
    campaigns_df = identify_ab_tests(campaigns_df)

    # 6. Generate outputs for each valid campaign
    print(f"Task: Generating reports for {len(campaigns_df)} valid campaigns...")
    for _, campaign_row in campaigns_df.iterrows():
        campaign_id = campaign_row['campaign_id']
        is_ab_test = pd.notna(campaign_row['subject_line_test_id'])

        # Get the original group data for this campaign
        recipient_data = campaign_groups.get_group(campaign_id)

        # --- Generate [campaignID]-raw-data report ---
        report_path = os.path.join(OUTPUT_DIR, f"{campaign_id}-raw-data.txt")
        with open(report_path, 'w') as f:
            f.write("--- Campaign Info and Stats ---\n")
            f.write(f"Campaign ID: {campaign_id}\n")
            f.write(f"Subject Line: {campaign_row['subject']}\n")
            f.write(f"Send Timestamp: {campaign_row['send_timestamp']}\n")
            f.write(f"Total Audience Size: {campaign_row['audience_size']}\n")
            if is_ab_test:
                f.write(f"Subject Line Test ID: {campaign_row['subject_line_test_id']}\n")
            
            f.write("\n--- Tags ---\n")
            if is_ab_test:
                f.write("- subject line test\n")
            else:
                f.write("- (no tags identified in this phase)\n")

            f.write("\n--- Raw Campaign Performance ---\n")
            f.write(f"Total Opens: {campaign_row['total_opens']}\n")
            f.write(f"Total Clicks: {campaign_row['total_clicks']}\n")

        # --- Generate [campaignID]-recipient-actions.csv ---
        csv_path = os.path.join(OUTPUT_DIR, f"{campaign_id}-recipient-actions.csv")
        csv_df = recipient_data[['user_email', 'delivered_at', 'opened', 'opened_at', 'clicked', 'clicked_at']].copy()
        csv_df.rename(columns={'opened': 'opened? (y/n)', 'clicked': 'clicked? (y/n)'}, inplace=True)
        csv_df['opened? (y/n)'] = csv_df['opened? (y/n)'].map({True: 'y', False: 'n'})
        csv_df['clicked? (y/n)'] = csv_df['clicked? (y/n)'].map({True: 'y', False: 'n'})
        csv_df.to_csv(csv_path, index=False, quoting=csv.QUOTE_ALL)

    print(f"--- Phase 1 Complete. All files generated in {OUTPUT_DIR} ---")


if __name__ == "__main__":
    main() 