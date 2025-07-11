# Execution Checklist: "Top Prospects" Email CSV Generation

## Phase 0: Execution Checklist Improvement
*   **Primary Owner:** `@squad-agent-database-master`
*   [x] Review this execution checklist for clarity, completeness, and correctness.
*   [x] Propose any necessary additions, removals, or modifications to ensure a smooth and successful execution.
*   [x] **Phase Worklog Entry by the Scribe:** The scribe agent must create a worklog entry summarizing this completed phase.

## Phase 1: Script Scaffolding & Data Ingestion
*   **Primary Owner:** `@squad-agent-database-master`
*   [x] Create a new feature branch for this phase's work, following the guidelines in `@technical-standard-approaches.md`. @squad-agent-architect
*   [x] Analyze existing email CSV scripts and `basic_capabilities` to identify specific helper functions (e.g., for database queries, user data fetching) to be reused.
*   [x] Create the new script file: `projects/email-csv-creation/top-prospects-email/generate_top_prospects_csv.py`.
*   [x] Add standard script boilerplate, including argument parsing for input/output files and necessary imports, referencing existing email CSV scripts.
*   [x] Implement the function to read the user IDs from the input CSV (`reengagement_audience_20250710_094433.csv`).
*   [x] **Phase Review by the Conductor:** The conductor must systematically review the execution checklist for this phase. This includes: marking all completed tasks, appending notes to checklist items about key challenges or learnings encountered, and documenting any undocumented deviations by creating a new checked-off checklist item starting with `IN-FLIGHT ADDITION:` to clearly flag tasks that were performed but not planned.
*   [x] **Phase Worklog Entry by the Scribe:** The scribe agent must create a worklog entry summarizing this completed phase.
*   [x] **Phase GitHub commit by the Architect:** Commit this now completed phase-branch to Github, following the standard approaches defined in `@technical-standard-approaches.md`
*   [x] **Delete feature branch:** After merging, the Architect will delete the feature branch from local and remote repositories.

## Phase 2: Core Logic Implementation & Data Fetching
*   **Primary Owner:** `@squad-agent-database-master`
*   [x] Create a new feature branch for this phase's work, following the guidelines in `@technical-standard-approaches.md`. @squad-agent-architect
*   [x] Investigate the `desired_items` table schema by fetching a sample of data to understand its structure and identify a metric for "most desired item".
    ***CLOSEOUT NOTES:*** The initial assumption about using `created_at` was incorrect. Direct schema exploration via a temporary script revealed the `offers_count` column, which was adopted as a much stronger proxy for user desire. This is a key learning for future query development.
*   [x] Based on the schema investigation, implement the primary SQL query to fetch the #1 Top Target Shoe for a single user ID.
    ***CLOSEOUT NOTES:*** Logic was implemented in the new `get_top_target_shoe_for_users` reusable function. It correctly ranks items by `offers_count` DESC, then `created_at` DESC as a tie-breaker.
*   [x] Implement a function that takes a `user_id` and executes the above query, returning the required shoe data.
    ***CLOSEOUT NOTES:*** This was consolidated into the more efficient, bulk function `get_top_target_shoe_for_users` and added to `email_csv_queries.py`.
*   [x] Adapt existing functions from other scripts to create a helper function that fetches `email`, `firstname`, and `usersize` for a given `user_id`.
    ***CLOSEOUT NOTES:*** A new reusable function, `get_user_data_by_ids`, was added to `email_csv_queries.py`. This is more efficient for our needs than adapting broad, audience-based functions.
*   [x] Define and implement the behavior for users who have no items in their wishlist. The script should log a warning and skip these users, excluding them from the final CSV.
    ***CLOSEOUT NOTES:*** This logic was successfully integrated into the `main` function of the `generate_top_prospects_csv.py` script, ensuring the final data is clean.
*   [x] **Phase Review by the Conductor:** The conductor must systematically review the execution checklist for this phase. This includes: marking all completed tasks, appending notes to checklist items about key challenges or learnings encountered, and documenting any undocumented deviations by creating a new checked-off checklist item starting with `IN-FLIGHT ADDITION:` to clearly flag tasks that were performed but not planned.
*   [x] **Phase Worklog Entry by the Scribe:** The scribe agent must create a worklog entry summarizing this completed phase.
*   [ ] **Phase GitHub commit by the Architect:** Commit this now completed phase-branch to Github, following the standard approaches defined in `@technical-standard-approaches.md`
*   [ ] **Delete feature branch:** After merging, the Architect will delete the feature branch from local and remote repositories.

## Phase 3: Final Integration & Output Generation
*   **Primary Owner:** `@squad-agent-database-master`
*   [ ] Create a new feature branch for this phase's work, following the guidelines in `@technical-standard-approaches.md`. @squad-agent-architect
*   [ ] Integrate all the functions into the main script logic. The script should loop through each user ID, fetch all required data points, and compile the results.
*   [ ] Implement the final function to write the collected data to a new, timestamped CSV file in an `outputs` subdirectory.
*   [ ] Perform a full test run of the script to generate a sample CSV.
*   [ ] Manually review the output CSV to validate data integrity for a small sample of users.
*   [ ] Add comments and docstrings to the script to clarify the logic.
*   [ ] **Phase Review by the Conductor:** The conductor must systematically review the execution checklist for this phase. This includes: marking all completed tasks, appending notes to checklist items about key challenges or learnings encountered, and documenting any undocumented deviations by creating a new checked-off checklist item starting with `IN-FLIGHT ADDITION:` to clearly flag tasks that were performed but not planned.
*   [ ] **Phase Worklog Entry by the Scribe:** The scribe agent must create a worklog entry summarizing this completed phase.
*   [ ] **Phase GitHub commit by the Architect:** Commit this now completed phase-branch to Github, following the standard approaches defined in `@technical-standard-approaches.md`
*   [ ] **Delete feature branch:** After merging, the Architect will delete the feature branch from local and remote repositories. 