import re
from datetime import datetime
import os

def parse_campaign_for_ab_testing(campaign_text):
    """Parses a single campaign block for details needed for A/B winner tagging."""
    data = {
        'campaign_id': None,
        'subject': None,
        'timestamp': None,
        'audience_size': 0,
        'is_test': False,
        'original_text': campaign_text
    }
    
    lines = campaign_text.strip().split('\n')
    
    in_tags_section = False
    for line in lines:
        if line.startswith('Campaign ID:'):
            data['campaign_id'] = line.split(':')[1].strip()
        elif line.startswith('Subject Line:'):
            data['subject'] = line.split(':', 1)[1].strip()
        elif line.startswith('Send Timestamp:'):
            try:
                ts_str = line.split(':', 1)[1].strip()
                data['timestamp'] = datetime.fromisoformat(ts_str)
            except (IndexError, ValueError):
                pass # Keep timestamp as None if parsing fails
        elif line.startswith('Total Audience Size:'):
            try:
                data['audience_size'] = int(line.split(':')[1].strip())
            except (IndexError, ValueError):
                pass
        elif line.strip() == '--- Tags ---':
            in_tags_section = True
        elif in_tags_section and line.startswith('test_details:'):
            if 'Subject Line A/B Test' in line and '_winner' not in line:
                data['is_test'] = True
        elif in_tags_section and line.startswith('---'):
            in_tags_section = False
            
    # Basic validation
    if data['campaign_id'] and data['subject'] and data['timestamp']:
        return data
    return None

def main():
    input_file = 'projects/email-impact/generated_outputs/phase_3/master_impact_analysis_tagged_v2.txt'

    try:
        with open(input_file, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: Input file not found at {input_file}")
        return

    campaign_blocks = content.split('================================================================================')
    
    all_campaigns = [parse_campaign_for_ab_testing(block) for block in campaign_blocks if block.strip()]
    all_campaigns = [c for c in all_campaigns if c is not None]

    test_campaigns = [c for c in all_campaigns if c['is_test']]
    potential_winners = [c for c in all_campaigns if not c['is_test']]

    test_subjects = {c['subject'] for c in test_campaigns}
    
    winner_ids = set()

    for p_winner in potential_winners:
        if p_winner['subject'] in test_subjects:
            # Find all tests with this subject
            matching_tests = [t for t in test_campaigns if t['subject'] == p_winner['subject']]
            for test in matching_tests:
                # Check if it's a winner (later time, bigger audience)
                if p_winner['timestamp'] > test['timestamp'] and p_winner['audience_size'] > test['audience_size']:
                    winner_ids.add(p_winner['campaign_id'])
                    break # Found a test it's a winner for, no need to check others
    
    # Now, let's reconstruct the file content
    new_campaign_blocks = []
    for campaign_data in all_campaigns:
        original_text = campaign_data['original_text']
        if campaign_data['campaign_id'] in winner_ids:
            # It's a winner, so replace the tag
            modified_text = original_text.replace(
                'test_details: Not a Test', 
                'test_details: Subject Line A/B Test_winner'
            )
            new_campaign_blocks.append(modified_text)
        else:
            # Not a winner, so keep original text
            new_campaign_blocks.append(original_text)
            
    # Write the updated content back to the file
    with open(input_file, 'w') as f:
        f.write('\n\n================================================================================\n\n'.join(new_campaign_blocks))
        
    print(f"Successfully identified {len(winner_ids)} A/B test winners and updated the tags in {input_file}")

if __name__ == '__main__':
    main() 