import re
import os
import json
from collections import defaultdict

def parse_campaign(campaign_text):
    """Parses a single campaign block from the text file."""
    lines = campaign_text.strip().split('\n')
    data = {'tags': {}}
    in_tags_section = False
    
    for line in lines:
        if line.startswith('Campaign ID:'):
            data['campaign_id'] = line.split(':')[1].strip()
        elif line.startswith('Subject Line:'):
            data['subject'] = line.split(':', 1)[1].strip()
        elif 'Offer Uplift:' in line:
            # Look for the uplift value specifically in the "Opened Cohort"
            if 'Opened Cohort' in campaign_text:
                try:
                    opened_cohort_section = campaign_text.split('--- Opened Cohort ---')[1].split('--- Clicked Cohort ---')[0]
                    for cohort_line in opened_cohort_section.strip().split('\n'):
                        if 'Offer Uplift:' in cohort_line:
                            uplift_str = cohort_line.split(':')[1].strip().replace('%', '')
                            if 'inf' in uplift_str:
                                # Replace 'inf' with a large number for analysis, will be noted in report
                                data['offer_uplift'] = 1000.0 
                            else:
                                data['offer_uplift'] = float(uplift_str)
                except (IndexError, ValueError) as e:
                    # print(f"Could not parse uplift for campaign. Error: {e}")
                    data['offer_uplift'] = 0.0
            else:
                 data['offer_uplift'] = 0.0


        elif line.strip() == '--- Tags ---':
            in_tags_section = True
        elif in_tags_section and ':' in line:
            key, value = line.split(':', 1)
            data['tags'][key.strip()] = [v.strip() for v in value.split(',')]
        elif in_tags_section and line.startswith('---'):
            in_tags_section = False
            
    if 'offer_uplift' not in data:
        data['offer_uplift'] = 0.0

    return data


def analyze_data(campaigns):
    """Performs a detailed analysis of the parsed campaign data."""
    
    # Analysis 1: Average uplift per single tag value
    tag_performance = defaultdict(lambda: defaultdict(list))
    for campaign in campaigns:
        uplift = campaign.get('offer_uplift', 0.0)
        for category, tags in campaign.get('tags', {}).items():
            for tag in tags:
                tag_performance[category][tag].append(uplift)

    avg_tag_performance = defaultdict(dict)
    for category, tags in tag_performance.items():
        for tag, uplifts in tags.items():
            avg_tag_performance[category][tag] = {
                'average_uplift': sum(uplifts) / len(uplifts),
                'campaign_count': len(uplifts)
            }

    # Analysis 2: Performance of tag combinations
    combo_performance = defaultdict(list)
    for campaign in campaigns:
        uplift = campaign.get('offer_uplift', 0.0)
        
        # We'll focus on Playbook + Framing as a key combo
        playbook_tags = campaign.get('tags', {}).get('playbook_type', [])
        framing_tags = campaign.get('tags', {}).get('framing', [])
        
        if playbook_tags and framing_tags:
            # Create a sorted tuple to represent the combination
            combo_key = (tuple(sorted(playbook_tags)), tuple(sorted(framing_tags)))
            combo_performance[combo_key].append(uplift)

    avg_combo_performance = {}
    for combo, uplifts in combo_performance.items():
        avg_combo_performance[str(combo)] = {
            'average_uplift': sum(uplifts) / len(uplifts),
            'campaign_count': len(uplifts)
        }

    # Analysis 3: Identify top and bottom 5 campaigns
    sorted_campaigns = sorted(campaigns, key=lambda c: c.get('offer_uplift', 0.0), reverse=True)
    top_5 = sorted_campaigns[:5]
    bottom_5 = sorted_campaigns[-5:]

    return {
        'single_tag_performance': avg_tag_performance,
        'combo_performance': avg_combo_performance,
        'top_5_campaigns': top_5,
        'bottom_5_campaigns': bottom_5,
    }


def main():
    """Main function to run the analysis and print results."""
    input_file = 'projects/email-impact/generated_outputs/phase_3/master_impact_analysis_tagged_v2.txt'
    output_file = 'projects/email-impact/generated_outputs/phase_3/analysis_results.json'

    try:
        with open(input_file, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: Input file not found at {input_file}")
        return

    campaign_blocks = content.split('================================================================================')
    
    parsed_campaigns = [parse_campaign(block) for block in campaign_blocks if block.strip()]
    
    # Filter out campaigns where parsing might have failed completely
    valid_campaigns = [c for c in parsed_campaigns if 'campaign_id' in c]

    analysis_results = analyze_data(valid_campaigns)

    # Save results to JSON file to be used by the reporting step
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump(analysis_results, f, indent=4)
        
    print(f"Analysis complete. Results saved to {output_file}")

if __name__ == '__main__':
    main() 