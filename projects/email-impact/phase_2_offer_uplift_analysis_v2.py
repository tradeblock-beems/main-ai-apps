import os
import sys
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
from tqdm import tqdm
import time

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from basic_capabilities.internal_db_queries_toolbox.graphql_utils import execute_graphql_query

# A simple in-memory cache for email to user_id lookups
email_to_id_cache = {}

def get_config():
    """Loads environment variables."""
    load_dotenv()
    return {
        "hasura_url": os.getenv("HASURA_URL"),
        "hasura_admin_secret": os.getenv("HASURA_ADMIN_SECRET"),
    }

def get_user_ids_by_emails(emails):
    """
    Fetches user IDs for a list of email addresses, using a cache.
    """
    uncached_emails = [email for email in emails if email not in email_to_id_cache]
    
    if uncached_emails:
        query = """
        query GetUsersByEmails($emails: [String!]) {
          users(where: {email: {_in: $emails}}) {
            id
            email
          }
        }
        """
        variables = {"emails": uncached_emails}
        try:
            result = execute_graphql_query(query, variables)
            if result and result.get('data') and result['data'].get('users'):
                for user in result['data']['users']:
                    email_to_id_cache[user['email']] = user['id']
        except Exception as e:
            print(f"Error fetching user IDs for emails: {e}")

    return {email: email_to_id_cache.get(email) for email in emails}

def get_offer_count_for_cohort(user_ids, start_date, end_date):
    """
    Fetches the number of offers created by a cohort of users within a date range.
    """
    if not user_ids:
        return 0
        
    query = """
    query GetCohortOfferCount($userIds: [uuid!], $startDate: timestamptz!, $endDate: timestamptz!) {
      offers_aggregate(where: {
        creator_user_id: {_in: $userIds},
        created_at: {_gte: $startDate, _lte: $endDate}
      }) {
        aggregate {
          count
        }
      }
    }
    """
    variables = {
        "userIds": user_ids,
        "startDate": start_date,
        "endDate": end_date
    }
    try:
        result = execute_graphql_query(query, variables)
        if result and result.get('data') and result['data'].get('offers_aggregate'):
            return result['data']['offers_aggregate']['aggregate']['count']
    except Exception as e:
        print(f"Error fetching offer count for cohort: {e}")
    return 0

def process_campaign_file(input_csv_path, input_raw_path, output_dir):
    """
    Processes a single campaign file to calculate offer uplift for multiple cohorts.
    """
    try:
        df = pd.read_csv(input_csv_path)
        if df.empty:
            print(f"Skipping empty file: {input_csv_path}")
            return
    except FileNotFoundError:
        print(f"File not found: {input_csv_path}")
        return

    # --- 1. Build Cohorts ---
    all_emails = df['user_email'].dropna().unique().tolist()
    user_id_map = get_user_ids_by_emails(all_emails)
    
    df['user_id'] = df['user_email'].map(user_id_map)
    df.dropna(subset=['user_id'], inplace=True)
    
    received_users = df['user_id'].unique().tolist()
    opened_users = df[df['opened? (y/n)'] == 'y']['user_id'].unique().tolist()
    clicked_users = df[df['clicked? (y/n)'] == 'y']['user_id'].unique().tolist()

    cohorts = {
        "Received": received_users,
        "Opened": opened_users,
        "Clicked": clicked_users
    }

    # --- 2. Calculate Uplift for Each Cohort ---
    email_sent_time = pd.to_datetime(df['delivered_at'].iloc[0])
    pre_period_start = (email_sent_time - timedelta(days=30)).isoformat()
    pre_period_end = email_sent_time.isoformat()
    post_period_start = email_sent_time.isoformat()
    post_period_end = (email_sent_time + timedelta(hours=48)).isoformat()
    
    summary_lines = []

    for cohort_name, user_ids in cohorts.items():
        num_users = len(user_ids)
        if num_users == 0:
            summary_lines.append(f"--- {cohort_name} Cohort (0 users) ---\n- No users in this cohort.\n")
            continue

        pre_period_offers = get_offer_count_for_cohort(user_ids, pre_period_start, pre_period_end)
        post_period_offers = get_offer_count_for_cohort(user_ids, post_period_start, post_period_end)

        # Cohort-level daily averages
        cohort_avg_daily_pre = pre_period_offers / 30
        cohort_avg_daily_post = post_period_offers / 2

        # Per-user daily averages
        avg_daily_offers_pre = (pre_period_offers / num_users) / 30 if num_users > 0 else 0
        avg_daily_offers_post = (post_period_offers / num_users) / 2 if num_users > 0 else 0
        
        if avg_daily_offers_pre > 0:
            uplift_percentage = ((avg_daily_offers_post - avg_daily_offers_pre) / avg_daily_offers_pre) * 100
        else:
            uplift_percentage = float('inf') if avg_daily_offers_post > 0 else 0

        summary_lines.append(f"--- {cohort_name} Cohort ({num_users} users) ---")
        summary_lines.append(f"- Pre-Campaign Daily Offer Average (cohort): {cohort_avg_daily_pre:.1f}")
        summary_lines.append(f"- Post-Campaign Daily Offer Average (cohort): {cohort_avg_daily_post:.1f}")
        summary_lines.append(f"- Pre-Campaign Daily Offer Average (per user): {avg_daily_offers_pre:.4f}")
        summary_lines.append(f"- Post-Campaign Daily Offer Average (per user): {avg_daily_offers_post:.4f}")
        summary_lines.append(f"- Offer Uplift: {uplift_percentage:.2f}%\n")

    # --- 3. Generate Summary File ---
    campaign_id = os.path.basename(input_csv_path).split('-')[0]
    output_summary_path = os.path.join(output_dir, f"{campaign_id}-impact-summary.txt")
    
    with open(input_raw_path, 'r') as f:
        raw_data_content = f.read()

    summary_content = f"{raw_data_content}\n\n### Impact Summary ###\n\n" + "\n".join(summary_lines)

    with open(output_summary_path, 'w') as f:
        f.write(summary_content)
    
    # print(f"Generated impact summary: {output_summary_path}")


def main():
    start_time = time.time()
    config = get_config() # Loads .env
    
    input_dir = "projects/email-impact/generated_outputs/phase_1/"
    output_dir = "projects/email-impact/generated_outputs/phase_2/"
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    files_to_process = [f for f in os.listdir(input_dir) if f.endswith('-recipient-actions.csv')]

    for filename in tqdm(files_to_process, desc="Processing Campaigns"):
        input_csv_path = os.path.join(input_dir, filename)
        campaign_id = filename.split('-')[0]
        input_raw_path = os.path.join(input_dir, f"{campaign_id}-raw-data.txt")
        
        process_campaign_file(input_csv_path, input_raw_path, output_dir)
        
    end_time = time.time()
    print(f"\nCompleted processing all campaigns in {end_time - start_time:.2f} seconds.")

if __name__ == "__main__":
    main() 