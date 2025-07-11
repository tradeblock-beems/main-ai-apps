
import os
import re

def create_tagging_rules():
    """
    Creates a dictionary of rules for tagging campaigns based on subject line keywords.
    Returns a dictionary where keys are tags and values are regex patterns.
    """
    rules = {
        # Category
        'Lifecycle': re.compile(r'unlocked|you’ve earned|congrats', re.IGNORECASE),
        'Promotional': re.compile(r'fee|dropped by|off your trade fees', re.IGNORECASE),
        # Topic
        'Trusted Trader': re.compile(r'trusted trader', re.IGNORECASE),
        'Fee Discount': re.compile(r'fee|40%', re.IGNORECASE),
        # Tone
        'Congratulatory': re.compile(r'congrats|unlocked|you’ve earned', re.IGNORECASE),
        'Exclusive': re.compile(r'you’ve earned this', re.IGNORECASE),
        'Financial Benefit': re.compile(r'fee|%', re.IGNORECASE),
        # Framework
        'Reward': re.compile(r'you’ve earned', re.IGNORECASE),
        'Status': re.compile(r'trusted trader|unlocked', re.IGNORECASE),
        'Financial Benefit': re.compile(r'fee|%', re.IGNORECASE),
    }
    return rules

def tag_campaigns():
    """
    Reads the consolidated analysis file, applies tags based on subject lines,
    and writes the enriched data to a new file.
    """
    phase_3_output_dir = "projects/email-impact/generated_outputs/phase_3"
    input_file = os.path.join(phase_3_output_dir, "master_impact_analysis.txt")
    output_file = os.path.join(phase_3_output_dir, "master_impact_analysis_tagged.txt")

    if not os.path.exists(input_file):
        print(f"Input file not found: {input_file}")
        return

    with open(input_file, 'r') as f:
        content = f.read()

    campaign_blocks = content.split("="*80)
    tagging_rules = create_tagging_rules()
    enriched_content = []

    for block in campaign_blocks:
        if "Subject Line:" not in block:
            continue

        subject_line_match = re.search(r"Subject Line: (.+)", block)
        if not subject_line_match:
            enriched_content.append(block)
            continue
        
        subject_line = subject_line_match.group(1).strip()
        
        applied_tags = set()
        for tag, pattern in tagging_rules.items():
            if pattern.search(subject_line):
                applied_tags.add(tag)
        
        tags_string = "\n".join(f"- {tag}" for tag in sorted(list(applied_tags)))
        
        # Replace the placeholder with the new tags
        enriched_block = re.sub(
            r"- \(no tags identified in this phase\)", 
            tags_string, 
            block
        )
        enriched_content.append(enriched_block)

    with open(output_file, 'w') as f:
        f.write(("="*80).join(enriched_content))

    print(f"Successfully tagged campaigns and saved to:\n{output_file}")


if __name__ == "__main__":
    tag_campaigns() 