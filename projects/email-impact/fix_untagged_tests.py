import re
import os
from datetime import datetime, timedelta

def parse_campaign_data(campaign_text, campaign_id_from_filename=None):
    """Parses a campaign block and extracts relevant data for A/B test identification."""
    data = {'id': campaign_id_from_filename}
    
    # Use regex to be more robust
    id_match = re.search(r"Campaign ID: (\d+)", campaign_text)
    if id_match:
        data['id'] = id_match.group(1)
        
    subject_match = re.search(r"Subject Line: (.*?)\n", campaign_text)
    data['subject'] = subject_match.group(1).strip() if subject_match else None
    
    ts_match = re.search(r"Send Timestamp: (.*?)\n", campaign_text)
    if ts_match:
        try:
            data['timestamp'] = datetime.fromisoformat(ts_match.group(1).strip())
        except ValueError:
            data['timestamp'] = None
    else:
        data['timestamp'] = None

    audience_match = re.search(r"Total Audience Size: (\d+)", campaign_text)
    data['audience'] = int(audience_match.group(1)) if audience_match else 0
    
    test_id_match = re.search(r"Subject Line Test ID: (.*?)\n", campaign_text)
    data['test_id'] = test_id_match.group(1).strip() if test_id_match else None
    
    data['original_text'] = campaign_text
    
    return data

def main():
    master_file = 'projects/email-impact/generated_outputs/phase_3/master_impact_analysis_tagged_v2.txt'
    phase_2_dir = 'projects/email-impact/generated_outputs/phase_2/'

    try:
        with open(master_file, 'r') as f:
            master_content = f.read()
    except FileNotFoundError:
        print(f"Error: Master analysis file not found at {master_file}")
        return

    # --- Step 1: Parse all campaigns and identify known tests ---
    campaign_blocks = master_content.split('================================================================================')
    all_campaigns = [parse_campaign_data(block) for block in campaign_blocks if block.strip()]
    
    known_tests = [c for c in all_campaigns if c['test_id']]
    unknowns = [c for c in all_campaigns if not c['test_id'] and c['timestamp']]

    # --- Step 2: Find untagged tests based on heuristics ---
    newly_identified_tests = {} # {campaign_id: test_id}
    
    print("--- Identifying Untagged A/B Test Variants ---")
    
    for unknown in unknowns:
        for known in known_tests:
            # Heuristic 1: Timestamp is very close (e.g., within 5 minutes)
            time_diff = abs(unknown['timestamp'] - known['timestamp'])
            if time_diff <= timedelta(minutes=5):
                # Heuristic 2: Audience size is similar (e.g., within 25%)
                if known['audience'] > 0 and abs(unknown['audience'] - known['audience']) / known['audience'] <= 0.25:
                    newly_identified_tests[unknown['id']] = known['test_id']
                    print(f"  - Match Found! Campaign {unknown['id']} ({unknown['subject']}) is likely part of test '{known['test_id']}'.")
                    print(f"    Reason: Time diff {time_diff}, Audience sizes {unknown['audience']} vs {known['audience']}. \n")
                    break # Move to next unknown

    if not newly_identified_tests:
        print("No new untagged test variants found.")
        return

    # --- Step 3: Update the master file ---
    print(f"\n--- Updating Master File: {master_file} ---")
    updated_master_content = master_content
    for campaign_id, test_id in newly_identified_tests.items():
        print(f"  - Updating Campaign ID: {campaign_id}")
        # Use regex to find and replace the whole campaign block to be safe
        # Find the block for the specific campaign ID
        block_regex = re.compile(f"(Campaign ID: {campaign_id}.*?)(--- Raw Campaign Performance ---)", re.DOTALL)
        match = block_regex.search(updated_master_content)
        
        if match:
            original_block_header = match.group(1)
            # Add the test ID line
            new_header = original_block_header + f"Subject Line Test ID: {test_id}\n"
            updated_master_content = updated_master_content.replace(original_block_header, new_header)

            # Also update the tag
            updated_master_content = re.sub(
                f"(Campaign ID: {campaign_id}.*?test_details:) Not a Test",
                f"\\1 Subject Line A/B Test",
                updated_master_content,
                flags=re.DOTALL
            )

    with open(master_file, 'w') as f:
        f.write(updated_master_content)
    print("Master file update complete.")

    # --- Step 4: Update individual phase 2 files ---
    print(f"\n--- Updating Phase 2 Files in: {phase_2_dir} ---")
    for campaign_id, test_id in newly_identified_tests.items():
        filepath = os.path.join(phase_2_dir, f"{campaign_id}-impact-summary.txt")
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r') as f:
                    file_content = f.read()
                
                # Check if it already has an ID, just in case
                if 'Subject Line Test ID:' not in file_content:
                    print(f"  - Updating file: {filepath}")
                    # Insert the Test ID after the Subject Line
                    updated_content = re.sub(
                        r"(Subject Line: .*?\n)",
                        f"\\1Subject Line Test ID: {test_id}\n",
                        file_content
                    )
                    with open(filepath, 'w') as f:
                        f.write(updated_content)
                else:
                    print(f"  - Skipping file (already has Test ID): {filepath}")

            except Exception as e:
                print(f"  - Error processing file {filepath}: {e}")
        else:
            print(f"  - Warning: File not found for campaign {campaign_id} at {filepath}")

    print("\nOperation complete.")

if __name__ == '__main__':
    main() 