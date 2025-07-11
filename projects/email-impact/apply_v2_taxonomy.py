import re
import os

def get_v2_tags(subject):
    """
    Analyzes an email subject line and returns a dictionary of V2 tags.
    """
    subject_lower = subject.lower()
    tags = {
        'playbook_type': ['Transactional'], # Default
        'topic_focus': [],
        'framing': [],
        'personalization_level': ['Generic Broadcast'], # Default
        'call_to_action': ['Make Offer'], # Default
        'test_details': ['Not a Test'] # Default
    }

    # Playbook Type
    if 'you’ve earned' in subject_lower or 'unlocked' in subject_lower or 'you just got' in subject_lower:
        tags['playbook_type'] = ['Lifecycle']
    elif 'just dropped' in subject_lower or 'running the app' in subject_lower or 'trending on the block' in subject_lower or 'throwback thursday' in subject_lower:
        tags['playbook_type'] = ['Promotional']
    elif 'upgrade' in subject_lower or 'app update' in subject_lower:
        tags['playbook_type'] = ['Product Update']
    elif 'top hunters' in subject_lower or 'most active' in subject_lower or 'top offer creators' in subject_lower or 'you’re not the only one' in subject_lower:
        tags['playbook_type'] = ['Community']
    elif 'your tradeblock fees just dropped' in subject_lower or 'start trading again' in subject_lower or 'you like paying higher fees' in subject_lower or 'save $20' in subject_lower:
        tags['playbook_type'] = ['Promotional']


    # Topic Focus
    if 'fee' in subject_lower or 'fees' in subject_lower:
        tags['topic_focus'].append('Fee Discount')
    if 'trusted trader' in subject_lower:
        tags['topic_focus'].append('Status')
        tags['topic_focus'].append('Trusted Trader')
    if 'upgrade' in subject_lower or 'app update' in subject_lower or 'ai-generated' in subject_lower:
        tags['topic_focus'].append('New Feature')
    if 'trending' in subject_lower or 'running the app' in subject_lower or 'hottest shoes' in subject_lower or 'market movers' in subject_lower:
        tags['topic_focus'].append('Market Trend')
    if 'ferrari 14' in subject_lower or 'pine green sb4' in subject_lower or 'white cement 3' in subject_lower:
        tags['topic_focus'].append('Shoe Spotlight')
    if 'ds-only' in subject_lower or 'trade for ds' in subject_lower or 'trade used' in subject_lower:
        tags['topic_focus'].append('Community Norms')
    if 'top hunters' in subject_lower or 'top offer creators' in subject_lower or 'most active' in subject_lower:
        tags['topic_focus'].append('Top Hunters')


    # Framing
    if 'congrats' in subject_lower or 'you’ve earned' in subject_lower or 'unlocked' in subject_lower or 'you just got' in subject_lower:
        tags['framing'].append('Congratulatory')
        tags['framing'].append('Reward')
    if 'you’re leaving money on the table' in subject_lower or 'wait...' in subject_lower or 'done with' in subject_lower or 'tired of' in subject_lower:
        tags['framing'].append('Pain Point Agitation')
    if 'you’re so close' in subject_lower:
        tags['framing'].append('Urgency')
    if 'exclusive' in subject_lower: # V1 tag, placeholder
        tags['framing'].append('Exclusivity')
    if 'saved >$10k' in subject_lower or 'saved $10k' in subject_lower:
        tags['framing'].append('Social Proof')
    if 'fee' in subject_lower or 'fees' in subject_lower or 'save $' in subject_lower or '$20' in subject_lower:
        tags['framing'].append('Financial Benefit')
    if 'see what’s new' in subject_lower or 'app update' in subject_lower:
        tags['framing'].append('Informational')
    if 'who’s making moves' in subject_lower or 'meet size' in subject_lower or 'what they want' in subject_lower:
        tags['framing'].append('Social Proof')


    # Personalization Level
    if re.search(r'size \d+', subject_lower) or 'your size' in subject_lower:
        tags['personalization_level'] = ['Personalized']
    elif 'you’ve earned' in subject_lower or 'unlocked' in subject_lower or 'you just got' in subject_lower or 'top hunters' in subject_lower:
        tags['personalization_level'] = ['Segmented']


    # Call to Action
    if 'see what’s new' in subject_lower or 'what they want' in subject_lower:
        tags['call_to_action'] = ['Explore Feature']
    elif 'top hunters' in subject_lower or 'meet size' in subject_lower:
        tags['call_to_action'] = ['Learn More']

    # Test Details
    if 'ab_test' in subject_lower:
        tags['test_details'] = ['Subject Line A/B Test']

    # Clean up empty lists and ensure no duplicates
    final_tags = {}
    for key, value in tags.items():
        if isinstance(value, list):
            unique_values = sorted(list(set(value)))
            if unique_values:
                final_tags[key] = unique_values
        else:
            final_tags[key] = value
            
    # Add a special case for subject line tests to make them easier to analyze
    if 'ab_test' in subject:
        tags['test_details'] = ['Subject Line A/B Test']
    
    # ensure no duplicates
    for key in tags:
        if isinstance(tags[key], list):
            tags[key] = sorted(list(set(tags[key])))


    return tags

def main():
    input_file = 'projects/email-impact/generated_outputs/phase_3/master_impact_analysis_tagged.txt'
    output_file = 'projects/email-impact/generated_outputs/phase_3/master_impact_analysis_tagged_v2.txt'

    try:
        with open(input_file, 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: Input file not found at {input_file}")
        return

    campaigns = content.split('================================================================================')

    new_campaigns_content = []

    for campaign in campaigns:
        if campaign.strip() == "":
            continue

        lines = campaign.strip().split('\n')
        subject = ''
        subject_line_test_id = ''

        for line in lines:
            if line.startswith('Subject Line:'):
                subject = line.replace('Subject Line:', '').strip()
            if line.startswith('Subject Line Test ID:'):
                subject_line_test_id = line.replace('Subject Line Test ID:', '').strip()
        
        if subject_line_test_id:
            subject_for_tagging = f"{subject} ({subject_line_test_id})"
        else:
            subject_for_tagging = subject

        if not subject:
            new_campaigns_content.append(campaign)
            continue
            
        v2_tags = get_v2_tags(subject_for_tagging)

        # Create the new tags section
        new_tags_section = ['--- Tags ---']
        for key, values in v2_tags.items():
            if values: # Only add if there are tags
                 new_tags_section.append(f"{key}: {', '.join(values)}")

        # Replace old tags in the campaign block
        new_campaign_lines = []
        in_tags_section = False
        tags_section_replaced = False
        for line in lines:
            if line.strip() == '--- Tags ---':
                if not tags_section_replaced:
                    new_campaign_lines.extend(new_tags_section)
                    tags_section_replaced = True
                in_tags_section = True
            elif in_tags_section and line.startswith('---'):
                in_tags_section = False
                new_campaign_lines.append(line)
            elif not in_tags_section:
                new_campaign_lines.append(line)

        new_campaigns_content.append('\n'.join(new_campaign_lines))

    # Ensure the output directory exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w') as f:
        f.write('\n\n================================================================================\n\n'.join(new_campaigns_content))

    print(f"Successfully processed file and wrote output to {output_file}")


if __name__ == '__main__':
    main() 