import re
import os
from datetime import datetime

def parse_campaign_for_final_check(campaign_text):
    """Parses a campaign block and extracts data needed for the final check."""
    data = {}

    # Basic Info
    id_match = re.search(r"Campaign ID: (\d+)", campaign_text)
    data['id'] = id_match.group(1) if id_match else None

    subject_match = re.search(r"Subject Line: (.*?)\n", campaign_text)
    data['subject'] = subject_match.group(1).strip() if subject_match else None

    ts_match = re.search(r"Send Timestamp: (.*?)\n", campaign_text)
    data['timestamp'] = ts_match.group(1).strip() if ts_match else None

    audience_match = re.search(r"Total Audience Size: (\d+)", campaign_text)
    data['audience'] = int(audience_match.group(1)) if audience_match else 0

    test_id_match = re.search(r"Subject Line Test ID: (.*?)\n", campaign_text)
    data['test_id'] = test_id_match.group(1).strip() if test_id_match else None
    
    # Tag Parsing
    data['tags'] = {}
    tags_section_match = re.search(r"--- Tags ---\n(.*?)--- Raw Campaign Performance ---", campaign_text, re.DOTALL)
    if tags_section_match:
        tags_str = tags_section_match.group(1)
        for line in tags_str.strip().split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                data['tags'][key.strip()] = [v.strip() for v in value.split(',')]

    return data

def main():
    master_file = 'projects/email-impact/generated_outputs/phase_3/master_impact_analysis_tagged_v2.txt'
    output_file = 'projects/email-impact/generated_outputs/phase_3/final_check_untagged_small_campaigns.txt'

    try:
        with open(master_file, 'r') as f:
            master_content = f.read()
    except FileNotFoundError:
        print(f"Error: Master analysis file not found at {master_file}")
        return

    campaign_blocks = master_content.split('================================================================================')
    all_campaigns = [parse_campaign_for_final_check(block) for block in campaign_blocks if block.strip()]

    # Filter campaigns based on the specified criteria
    filtered_campaigns = []
    for c in all_campaigns:
        if not c.get('id'):
            continue

        is_under_audience = c.get('audience', 0) <= 6000
        has_no_test_id = not c.get('test_id')
        
        topic_focus_tags = c.get('tags', {}).get('topic_focus', [])
        is_not_trusted_trader = 'Trusted Trader' not in topic_focus_tags

        if is_under_audience and has_no_test_id and is_not_trusted_trader:
            filtered_campaigns.append(c)

    # Generate the report content
    report_lines = [
        "Campaigns with Audience <= 6000, No A/B Test ID, and No 'Trusted Trader' Tag",
        "==========================================================================",
        ""
    ]
    if not filtered_campaigns:
        report_lines.append("No campaigns matched the specified criteria.")
    else:
        for c in filtered_campaigns:
            report_lines.append(f"Campaign ID:   {c['id']}")
            report_lines.append(f"Subject:       {c['subject']}")
            report_lines.append(f"Timestamp:     {c['timestamp']}")
            report_lines.append(f"Audience Size: {c['audience']}")
            report_lines.append("--------------------------------------------------------------------------")

    # Ensure the output directory exists and write the file
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w') as f:
        f.write('\n'.join(report_lines))

    print(f"Final check report generated successfully at: {output_file}")

if __name__ == '__main__':
    main() 