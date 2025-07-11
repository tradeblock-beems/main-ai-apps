import re
import json
from datetime import datetime

def parse_campaign_data(master_file_path):
    """
    Parses the master campaign data file and transforms it into a structured
    list of dictionaries suitable for a web frontend.
    """
    try:
        with open(master_file_path, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: Master file not found at {master_file_path}")
        return []

    campaign_blocks = re.split(r'================================================================================', content)
    
    all_campaigns_data = []
    for block in campaign_blocks:
        if not block.strip():
            continue

        # --- Basic Info ---
        campaign_id_match = re.search(r'Campaign ID: (\S+)', block)
        campaign_id = campaign_id_match.group(1) if campaign_id_match else None
        if not campaign_id:
            continue

        subject_match = re.search(r'Subject Line: (.*)', block)
        subject = subject_match.group(1).strip() if subject_match else "No Subject Found"

        timestamp_match = re.search(r'Send Timestamp: (.*)', block)
        timestamp_str = timestamp_match.group(1).strip() if timestamp_match else ""
        try:
            # Parse the timestamp and format to ISO 8601 UTC (Zulu time)
            dt_object = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S%z')
            send_timestamp_iso = dt_object.isoformat()
        except (ValueError, TypeError):
            send_timestamp_iso = None

        # --- Tags ---
        tags_section_match = re.search(r'--- Tags ---(.*?)---', block, re.DOTALL)
        tags_list = []
        if tags_section_match:
            tags_raw = tags_section_match.group(1)
            # Find all values from the key: value pairs
            raw_values = re.findall(r':\s(.*?)\n', tags_raw)
            for val in raw_values:
                # Split comma-separated values and add to the list
                tags_list.extend([tag.strip() for tag in val.split(',')])

        # --- Email Performance ---
        audience_size_match = re.search(r'Total Audience Size: (\d+)', block)
        audience_size = int(audience_size_match.group(1)) if audience_size_match else 0

        total_opens_match = re.search(r'Total Opens: (\d+)', block)
        total_opens = int(total_opens_match.group(1)) if total_opens_match else 0
        
        total_clicks_match = re.search(r'Total Clicks: (\d+)', block)
        total_clicks = int(total_clicks_match.group(1)) if total_clicks_match else 0

        open_rate_pct = round((total_opens / audience_size) * 100, 2) if audience_size > 0 else 0
        click_rate_pct = round((total_clicks / audience_size) * 100, 2) if audience_size > 0 else 0

        # --- Business Impact (from Opened Cohort) ---
        offers_before = 0.0
        offers_after = 0.0
        percentage_lift = 0.0
        opened_cohort_match = re.search(r'--- Opened Cohort \(.*?\) ---(.*?)---', block, re.DOTALL)
        if opened_cohort_match:
            opened_cohort_text = opened_cohort_match.group(1)
            
            offers_before_match = re.search(r'Pre-Campaign Daily Offer Average \(cohort\): (\d+\.?\d*)', opened_cohort_text)
            offers_before = float(offers_before_match.group(1)) if offers_before_match else 0.0
            
            offers_after_match = re.search(r'Post-Campaign Daily Offer Average \(cohort\): (\d+\.?\d*)', opened_cohort_text)
            offers_after = float(offers_after_match.group(1)) if offers_after_match else 0.0

            percentage_lift_match = re.search(r'Offer Uplift: (.*?)%', opened_cohort_text)
            if percentage_lift_match:
                uplift_str = percentage_lift_match.group(1).strip()
                try:
                    percentage_lift = float(uplift_str)
                except ValueError:
                     percentage_lift = 1000.0 # Use 1000% as cap for 'inf' or other non-float values
        
        absolute_lift = round(offers_after - offers_before, 2)
        
        # --- Assemble final JSON object ---
        campaign_json = {
            "campaign_id": campaign_id,
            "subject": subject,
            "send_timestamp_iso": send_timestamp_iso,
            "tags": list(set(tags_list)), # Use set to ensure unique tags
            "email_performance": {
                "audience_size": audience_size,
                "open_rate_pct": open_rate_pct,
                "click_rate_pct": click_rate_pct,
                "total_clicks": total_clicks
            },
            "business_impact": {
                "offers_before": offers_before,
                "offers_after": offers_after,
                "absolute_lift": absolute_lift,
                "percentage_lift": percentage_lift
            }
        }
        all_campaigns_data.append(campaign_json)

    return all_campaigns_data

def main():
    master_file = 'projects/email-impact/generated_outputs/phase_3/master_impact_analysis_tagged_v2.txt'
    output_file = 'projects/email-impact/generated_outputs/microsite_campaign_data.json'

    print("Parsing master data file with corrected logic...")
    microsite_data = parse_campaign_data(master_file)
    
    if not microsite_data:
        print("No data parsed. Exiting.")
        return

    print(f"Successfully parsed {len(microsite_data)} campaigns.")

    print(f"Writing structured data to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(microsite_data, f, indent=4)
    
    print("Operation complete. The JSON data file for the microsite has been regenerated.")

if __name__ == '__main__':
    main() 