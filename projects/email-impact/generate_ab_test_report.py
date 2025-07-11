from collections import defaultdict
import os
import re
from datetime import datetime

def parse_campaign_for_report(campaign_text):
    """Parses a campaign block and extracts all necessary information for the A/B report."""
    data = {
        'campaign_id': None, 'subject': None, 'timestamp': None, 'test_id': None,
        'audience_size': 0, 'total_opens': 0, 'total_clicks': 0,
        'is_winner': False,
        'received_cohort_users': 'N/A', 'opened_cohort_users': 'N/A', 'clicked_cohort_users': 'N/A',
        'received_uplift': 'N/A', 'opened_uplift': 'N/A', 'clicked_uplift': 'N/A'
    }

    # --- Basic Info ---
    data['campaign_id'] = (re.search(r"Campaign ID: (.*)", campaign_text) or ('', None))[1]
    data['subject'] = (re.search(r"Subject Line: (.*)", campaign_text) or ('', None))[1]
    data['test_id'] = (re.search(r"Subject Line Test ID: (.*)", campaign_text) or ('', None))[1]
    
    ts_match = re.search(r"Send Timestamp: (.*)", campaign_text)
    if ts_match:
        data['timestamp'] = ts_match.group(1)

    # --- Performance Stats ---
    audience_match = re.search(r"Total Audience Size: (\d+)", campaign_text)
    if audience_match:
        data['audience_size'] = int(audience_match.group(1))

    opens_match = re.search(r"Total Opens: (\d+)", campaign_text)
    if opens_match:
        data['total_opens'] = int(opens_match.group(1))

    clicks_match = re.search(r"Total Clicks: (\d+)", campaign_text)
    if clicks_match:
        data['total_clicks'] = int(clicks_match.group(1))
        
    # --- Tag Info ---
    if 'test_details: Subject Line A/B Test_winner' in campaign_text:
        data['is_winner'] = True

    # --- Cohort & Uplift Data ---
    for cohort in ['Received', 'Opened', 'Clicked']:
        # Regex to find the cohort block, including the case with (0 users)
        cohort_regex = re.compile(f"--- {cohort} Cohort \(([\d,]+) users\) ---\n(.*?)\n- Offer Uplift: (.*?)\n", re.DOTALL)
        match = cohort_regex.search(campaign_text)
        
        if match:
            users, _, uplift = match.groups()
            data[f'{cohort.lower()}_cohort_users'] = users
            data[f'{cohort.lower()}_uplift'] = uplift.strip()
        elif f"--- {cohort} Cohort (0 users) ---" in campaign_text or f"No users in this cohort" in campaign_text:
            data[f'{cohort.lower()}_cohort_users'] = '0'
            data[f'{cohort.lower()}_uplift'] = '0.00%'

    return data

def main():
    input_file = 'projects/email-impact/generated_outputs/phase_3/master_impact_analysis_tagged_v2.txt'
    output_file = 'projects/email-impact/generated_outputs/phase_3/subject_line_test_campaign_sets.md'

    try:
        with open(input_file, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: Input file not found at {input_file}")
        return

    campaign_blocks = content.split('================================================================================')
    
    all_campaigns = [parse_campaign_for_report(block) for block in campaign_blocks if "Subject Line:" in block]

    test_variants = defaultdict(list)
    winners_by_subject = {c['subject']: c for c in all_campaigns if c['is_winner']}

    for campaign in all_campaigns:
        if campaign['test_id']:
            test_variants[campaign['test_id']].append(campaign)

    output_md = "# Subject Line A/B Test Campaign Sets\n\nThis document aggregates all A/B tested campaigns, with the mass-send winner listed first in each set, followed by the test variants.\n\n"

    for test_id in sorted(test_variants.keys()):
        variants = sorted(test_variants[test_id], key=lambda v: v['subject'])
        
        winner = None
        for v in variants:
            if v['subject'] in winners_by_subject:
                winner = winners_by_subject[v['subject']]
                break

        output_md += f"================================================================================\n\n"
        output_md += f"## Campaign Set: {test_id}\n\n"

        if winner:
            open_rate = (winner['total_opens'] / winner['audience_size'] * 100) if winner['audience_size'] > 0 else 0
            ctr = (winner['total_clicks'] / winner['total_opens'] * 100) if winner['total_opens'] > 0 else 0
            
            output_md += "### Winner (Mass Send)\n\n"
            output_md += "--- Campaign Info and Stats ---\n"
            output_md += f"Campaign ID: {winner['campaign_id']}\n"
            output_md += f"Subject Line: {winner['subject']}\n"
            output_md += f"Send Timestamp: {winner['timestamp']}\n"
            output_md += f"Total Audience Size: {winner['audience_size']}\n\n"
            output_md += "--- Raw Campaign Performance ---\n"
            output_md += f"Open Rate: {open_rate:.1f}%\n"
            output_md += f"CTR: {ctr:.1f}%\n\n"
            output_md += "--- Offer Uplift ---\n"
            output_md += f"- Received Cohort ({winner['received_cohort_users']} users): {winner['received_uplift']}\n"
            output_md += f"- Opened Cohort ({winner['opened_cohort_users']} users): {winner['opened_uplift']}\n"
            output_md += f"- Clicked Cohort ({winner['clicked_cohort_users']} users): {winner['clicked_uplift']}\n\n"

        else:
            output_md += "### (No mass-send winner identified for this test set)\n\n"

        output_md += "### Test Variants\n\n"
        for i, variant in enumerate(variants):
            open_rate = (variant['total_opens'] / variant['audience_size'] * 100) if variant['audience_size'] > 0 else 0
            ctr = (variant['total_clicks'] / variant['total_opens'] * 100) if variant['total_opens'] > 0 else 0
            
            output_md += f"Campaign ID: {variant['campaign_id']}\n"
            output_md += f"Subject Line: {variant['subject']}\n"
            output_md += f"Send Timestamp: {variant['timestamp']}\n"
            output_md += f"Open Rate: {open_rate:.1f}%\n"
            output_md += f"CTR: {ctr:.1f}%\n"
            if i < len(variants) - 1:
                output_md += "\n---\n\n"
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w') as f:
        f.write(output_md)
        
    print(f"Successfully generated A/B test campaign set report at {output_file}")

if __name__ == '__main__':
    main() 