import re

def parse_campaign_data(file_path):
    """Parses the campaign data from the master input file."""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: Input file not found at {file_path}")
        return []

    campaign_blocks = re.split(r'================================================================================', content)
    
    parsed_data = []
    for block in campaign_blocks:
        if not block.strip():
            continue

        campaign_info = {}
        # Set defaults
        campaign_info['subject'] = 'N/A'
        campaign_info['audience_size'] = 0
        campaign_info['offer_uplift_percentage'] = 0.0

        for line in block.strip().split('\n'):
            if line.startswith('Campaign ID:'):
                campaign_info['campaign_id'] = line.split(':')[1].strip()
            elif line.startswith('Subject:'):
                campaign_info['subject'] = line.split(':', 1)[1].strip()
            elif line.startswith('Audience Size:'):
                try:
                    campaign_info['audience_size'] = int(line.split(':')[1].strip())
                except (ValueError, IndexError):
                    pass 
            elif 'Offer Uplift:' in line:
                try:
                    opened_cohort_section = block.split('--- Opened Cohort ---')[1].split('---')[0]
                    for cohort_line in opened_cohort_section.strip().split('\n'):
                        if 'Offer Uplift:' in cohort_line:
                            uplift_str = cohort_line.split(':')[1].strip().replace('%', '')
                            campaign_info['offer_uplift_percentage'] = float(uplift_str) if 'inf' not in uplift_str else 1000.0
                except (IndexError, ValueError):
                    pass

        tags_section_match = re.search(r'--- Tags ---(.*?)---', block, re.DOTALL)
        if tags_section_match:
            campaign_info['tags'] = dict(re.findall(r'(\w+):\s(.*?)\n', tags_section_match.group(1)))
        else:
            campaign_info['tags'] = {}


        if 'campaign_id' in campaign_info:
            parsed_data.append(campaign_info)

    return parsed_data

def main():
    input_file = 'projects/email-impact/generated_outputs/phase_3/master_impact_analysis_tagged_v2.txt'
    campaigns = parse_campaign_data(input_file)

    # Filter for Core Impact campaigns (winners or non-tests)
    core_campaigns = [c for c in campaigns if '_winner' in c.get('tags', {}).get('test_details', '') or 'Not a Test' in c.get('tags', {}).get('test_details', '')]

    # Filter out Trusted Trader campaigns
    non_tt_campaigns = [c for c in core_campaigns if 'Trusted Trader' not in c.get('tags', {}).get('topic_focus', '')]

    # Sort by performance
    sorted_campaigns = sorted(non_tt_campaigns, key=lambda x: x.get('offer_uplift_percentage', 0), reverse=True)

    print("--- Top 5 Non-Trusted Trader Performers (Markdown Table) ---")
    print("| Uplift (%) | Audience | Subject | Key Tags |")
    print("|---|---|---|---|")
    for c in sorted_campaigns[:5]:
        key_tags = f"`{c['tags'].get('playbook_type', 'N/A')}`, `{c['tags'].get('topic_focus', 'N/A')}`, `{c['tags'].get('framing', 'N/A')}`"
        print(f"| {c['offer_uplift_percentage']:.2f} | {c['audience_size']} | {c['subject']} | {key_tags} |")

if __name__ == '__main__':
    main() 