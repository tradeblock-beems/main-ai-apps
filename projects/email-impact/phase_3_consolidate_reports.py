
import os
import glob

def consolidate_impact_summaries():
    """
    Consolidates all individual campaign impact summary text files
    from Phase 2 into a single master analysis file for Phase 3.
    """
    # Define directories
    phase_2_output_dir = "projects/email-impact/generated_outputs/phase_2"
    phase_3_output_dir = "projects/email-impact/generated_outputs/phase_3"
    output_file = os.path.join(phase_3_output_dir, "master_impact_analysis.txt")

    # Ensure the output directory exists
    os.makedirs(phase_3_output_dir, exist_ok=True)

    # Find all impact summary files
    summary_files = glob.glob(os.path.join(phase_2_output_dir, "*-impact-summary.txt"))

    if not summary_files:
        print("No impact summary files found to consolidate.")
        return

    print(f"Found {len(summary_files)} impact summary files. Consolidating...")

    # Consolidate files
    with open(output_file, 'w') as outfile:
        for filename in sorted(summary_files):
            with open(filename, 'r') as infile:
                content = infile.read()
                outfile.write(content)
                outfile.write("\n\n" + "="*80 + "\n\n")

    print(f"Successfully consolidated all summaries into:\n{output_file}")

if __name__ == "__main__":
    consolidate_impact_summaries() 