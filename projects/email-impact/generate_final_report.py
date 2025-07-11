import re
import os
import json
from collections import defaultdict

def parse_campaign_data(content):
    campaigns = []
    # Split by the main delimiter and filter out any empty strings
    blocks = [block for block in content.split(
        '================================================================================') if block.strip()]

    for block in blocks:
        data = {}
        data['full_block'] = block.strip()
        
        # Enhanced regex to capture all fields, including the new Test ID
        cid_match = re.search(r"Campaign ID: (\d+)", block)
        subject_match = re.search(r"Subject Line: (.*)", block)
        audience_size_match = re.search(r"Audience Size: ([\d,]+)", block)
        uplift_match = re.search(
            r"Offer Uplift: ([\d.-]+)% \(Opened Cohort\)", block)
        tags_match = re.search(r"--- Tags ---\n(.*?)\n---", block, re.DOTALL)
        test_id_match = re.search(r"Subject Line Test ID: (.*)", block)
        test_details_match = re.search(r"test_details: (.*)", block)

        if not cid_match:
            continue  # Skip blocks without a campaign ID

        data['campaign_id'] = cid_match.group(1)
        data['subject'] = subject_match.group(1).strip() if subject_match else 'N/A'
        
        if audience_size_match:
            data['audience_size'] = int(audience_size_match.group(1).replace(',', ''))
        else:
            data['audience_size'] = 0

        if uplift_match:
            try:
                data['offer_uplift'] = float(uplift_match.group(1))
            except ValueError:
                data['offer_uplift'] = 0.0 # Default to 0.0 if uplift is not a valid number
        else:
            data['offer_uplift'] = 0.0 # Default to 0.0 if uplift is not found

        if tags_match:
            tags_data = {}
            for line in tags_match.group(1).split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    tags_data[key.strip()] = [t.strip() for t in value.split(',')]
            data['tags'] = tags_data
        else:
            data['tags'] = {} # Ensure tags is always a dict

        if test_id_match:
            data['test_id'] = test_id_match.group(1).strip()
        else:
            data['test_id'] = 'N/A'

        data['test_details'] = test_details_match.group(
            1).strip() if test_details_match else 'Not a Test'

        # FILTERING LOGIC FOR CORE IMPACT
        # We only include campaigns that are either winners or not part of a test.
        is_winner = '_winner' in data.get('tags', [])
        is_not_a_test = data['test_details'] == 'Not a Test'

        if is_winner or is_not_a_test:
            campaigns.append(data)

    return campaigns


def calculate_average_uplift(campaigns):
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
    """Main function to run the analysis."""
    input_file = 'projects/email-impact/generated_outputs/phase_3/master_impact_analysis_tagged_v2.txt'
    output_file = 'projects/email-impact/generated_outputs/phase_3/core_impact_analysis_results.json'

    try:
        with open(input_file, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: Input file not found at {input_file}")
        return
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

    parsed_campaigns = parse_campaign_data(content)

    analysis_results = calculate_average_uplift(parsed_campaigns)

    # Add the full list of campaigns to the results for reporting
    analysis_results['all_campaigns'] = parsed_campaigns

    # Save results to JSON file to be used by the reporting step
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump(analysis_results, f, indent=4)
        
    print(f"Analysis complete. Results saved to {output_file}")

if __name__ == '__main__':
    main() 