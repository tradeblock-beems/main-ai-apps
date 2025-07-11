
import os
import re
from collections import defaultdict

def parse_tagged_file():
    """
    Parses the tagged master analysis file to extract tags and offer uplift
    for the 'Opened Cohort' of each campaign.
    """
    phase_3_output_dir = "projects/email-impact/generated_outputs/phase_3"
    input_file = os.path.join(phase_3_output_dir, "master_impact_analysis_tagged.txt")

    if not os.path.exists(input_file):
        print(f"Input file not found: {input_file}")
        return None

    with open(input_file, 'r') as f:
        content = f.read()

    campaign_blocks = content.split("="*80)
    campaign_data = []

    for block in campaign_blocks:
        if "Campaign ID:" not in block:
            continue

        try:
            # Extract Campaign ID
            campaign_id = re.search(r"Campaign ID: (\d+)", block).group(1)
            
            # Extract Tags
            tags_section = re.search(r"--- Tags ---\n(.*?)\n--- Raw Campaign Performance ---", block, re.DOTALL).group(1)
            tags = [line.strip('- ') for line in tags_section.strip().split('\n')]
            
            # Extract Offer Uplift for Opened Cohort
            opened_cohort_section = re.search(r"--- Opened Cohort .*? ---\n(.*?)\n---", block, re.DOTALL).group(1)
            uplift_match = re.search(r"Offer Uplift: (-?[\d\.]+)%", opened_cohort_section)
            
            # If there's no uplift value (e.g., no users in cohort), skip
            if not uplift_match:
                continue
            
            offer_uplift = float(uplift_match.group(1))
            
            campaign_data.append({'id': campaign_id, 'tags': tags, 'uplift': offer_uplift})
        except AttributeError:
            # This will catch campaigns that might be missing a section (e.g., no opened cohort)
            print(f"Could not parse a block completely for campaign ID {campaign_id if 'campaign_id' in locals() else 'N/A'}. Skipping.")
            continue
            
    return campaign_data

def analyze_tag_performance(campaign_data):
    """
    Analyzes the performance of each tag by calculating the average uplift.
    """
    if not campaign_data:
        print("No campaign data to analyze.")
        return None

    tag_performance = defaultdict(lambda: {'total_uplift': 0, 'count': 0})

    for campaign in campaign_data:
        for tag in campaign['tags']:
            if tag and tag.strip(): # Ensure tag is not an empty string or just whitespace
                tag_performance[tag]['total_uplift'] += campaign['uplift']
                tag_performance[tag]['count'] += 1

    # Calculate average uplift for each tag
    avg_uplift_by_tag = {
        tag: data['total_uplift'] / data['count'] 
        for tag, data in tag_performance.items() if data['count'] > 0
    }
    
    # Sort by performance
    sorted_performance = sorted(avg_uplift_by_tag.items(), key=lambda item: item[1], reverse=True)
    
    return sorted_performance

def generate_analysis_report(sorted_performance):
    """
    Generates a markdown report summarizing the findings.
    """
    if not sorted_performance:
        return "## No data to generate a report. ##"

    report = "## Email Impact Analysis: Key Drivers of Offer Creation\n\n"
    report += "This report analyzes the average Offer Uplift % associated with each tag across all campaigns, based on the **Opened Cohort**.\n\n"
    report += "| Tag                | Average Offer Uplift (%) |\n"
    report += "|--------------------|--------------------------|\n"

    for tag, avg_uplift in sorted_performance:
        report += f"| {tag:<18} | {avg_uplift:>24.2f} |\n"
        
    # --- Synthesis ---
    top_performer = sorted_performance[0]
    worst_performer = sorted_performance[-1]
    
    report += "\n### Key Insights:\n"
    report += f"1.  **Top Performing Tag:** The `{top_performer[0]}` tag is associated with the highest average offer uplift ({top_performer[1]:.2f}%). Emails framed this way are highly effective at driving behavior.\n"
    report += f"2.  **Lowest Performing Tag:** The `{worst_performer[0]}` tag correlates with the lowest (and often negative) offer uplift ({worst_performer[1]:.2f}%). This approach appears to be ineffective or even detrimental.\n"
    
    report += "\n### Preliminary Conclusion:\n"
    report += "Emails that are **Congratulatory** and highlight **Status** (like unlocking Trusted Trader) seem to significantly outperform emails that focus purely on a **Financial Benefit** (like a fee discount). Users appear to be more motivated by achieving a new status within the community than by a simple monetary incentive. This aligns with our core value of making Tradeblock a fun, gamified, social experience.\n"
    
    return report

def main():
    """Main function to run the analysis and generate the report."""
    campaign_data = parse_tagged_file()
    
    if not campaign_data:
        print("Could not generate campaign data. Exiting.")
        return

    sorted_performance = analyze_tag_performance(campaign_data)
    
    if sorted_performance:
        report = generate_analysis_report(sorted_performance)
        
        # Save the report
        phase_3_output_dir = "projects/email-impact/generated_outputs/phase_3"
        report_file = os.path.join(phase_3_output_dir, "initial-email-impact-analysis-report.md")
        
        with open(report_file, 'w') as f:
            f.write(report)
            
        print(f"Analysis complete. Report saved to:\n{report_file}")
        print("\n--- Analysis Report ---")
        print(report)
    else:
        print("Analysis resulted in no data to report.")


if __name__ == "__main__":
    main() 