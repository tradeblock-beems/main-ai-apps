# Execution Checklist: Email Impact Analysis Framework

This checklist is the single source of truth for executing the Email Impact project. Each phase represents a feature branch and must be completed in sequence.

---

### Phase 0: Execution Checklist Improvement
-   **Primary Owner:** `@squad-agent-conductor`
-   **Branch:** `feature/email-impact/phase-0`

-   [x] **Task 1: Create Feature Branch.**
    -   `@squad-agent-conductor` to create the `feature/email-impact/phase-0` branch from the latest `main`.

-   [x] **Task 2: Review and Improve This Checklist.**
    -   `@squad-agent-conductor`: After reviewing all project materials (`project-brief.md`, agent rules), critically evaluate this execution checklist. Identify any missing steps, unclear instructions, or potential roadblocks. Update this file to create a more robust and executable plan.

-   [x] **Task 3: Align with Standard Approaches.**
    -   `@squad-agent-conductor`: Review `@technical-standard-approaches.md` and ensure this checklist and the project plan align with our company's established technical workflows.

-   [x] **Task 4: Phase 0 Closeout.**
    -   [x] `@squad-agent-conductor`: The conductor must systematically review the execution checklist for this phase. This includes: marking all completed tasks, appending notes to checklist items about key challenges or learnings encountered, and documenting any undocumented deviations by creating a new checked-off checklist item starting with `IN-FLIGHT ADDITION:` to clearly flag tasks that were performed but not planned.
    -   [x] `@squad-agent-scribe`: Create the worklog entry for Phase 0.
    -   [x] `@squad-agent-conductor`: Merge `feature/email-impact/phase-0` into `main`.
    -   [x] **Delete feature branch:** After merging, the conductor will delete the feature branch from local and remote repositories.

---

### Phase 1: Block 1 - Mailjet Data Extraction & Cleansing
-   **Primary Owner:** `@data-agent-mailjet-API`
-   **Branch:** `feature/email-impact/phase-1`

-   [x] **Task 1: Create Feature Branch.**
    -   `@squad-agent-conductor` to create the `feature/email-impact/phase-1` branch from the latest `main`.

-   [x] **Task 2: Fetch All Campaign Data.**
    -   `@data-agent-mailjet-API`: Using the `Mailjet API Guide`, pull all historical campaign data.
    -   *Note: Implemented a robust caching mechanism to prevent re-running this expensive step on script failure.*

-   [x] **Task 3: Filter Out Test Campaigns.**
    -   `@data-agent-mailjet-API`: Remove any campaigns with fewer than 10 recipients.

-   [x] **Task 4: Identify and Group A/B/C Tests.**
    -   `@data-agent-mailjet-API`: Implement logic to find campaigns with send timestamps within a few minutes of each other and similar audience sizes. Create a unique `subject_line_test_ID` for each group so that we can easily group together subject line test sends for a campaign.

-   [x] **Task 5: Generate Per-Campaign Outputs.**
    -   `@data-agent-mailjet-API`: For each valid campaign, generate the two required outputs:
        -   [x] A `[campaignID]-raw-data` report containing campaign info, stats, and the `subject_line_test_ID` and a "subject line test" tag if applicable.
        -   [x] A `[campaignID]-recipient-actions.csv` file with user-level engagement data.
    -   *Note: The script was refactored to use parallel processing, resulting in a ~10x speedup. Performance was validated with sequential vs. parallel test runs.*
    -   *Note: Corrected a `ModuleNotFoundError` by adding the project root to `sys.path` in the script.*

-   [ ] **Task 6: Phase 1 Closeout.**
    -   [x] `@squad-agent-conductor`: The conductor must systematically review the execution checklist for this phase. This includes: marking all completed tasks, appending notes to checklist items about key challenges or learnings encountered, and documenting any undocumented deviations by creating a new checked-off checklist item starting with `IN-FLIGHT ADDITION:` to clearly flag tasks that were performed but not planned.
    -   [x] `@squad-agent-scribe`: Create the worklog entry for Phase 1.
    -   [x] `@squad-agent-conductor`: Merge `feature/email-impact/phase-1` into `main`.
    -   [x] **Delete feature branch:** After merging, the conductor will delete the feature branch from local and remote repositories.

---

### Phase 2: Block 2 - Offer Uplift Analysis
-   **Primary Owner:** `@squad-agent-database-master`
-   **Branch:** `feature/email-impact/phase-2`

-   [x] **Task 1: Create Feature Branch.**
    -   `@squad-agent-conductor` to create the `feature/email-impact/phase-2` branch from the latest `main`.

-   [x] **Task 2: Process All Campaign CSVs.**
    -   `@squad-agent-database-master`: Ingest all `[campaignID]-recipient-actions.csv` files generated in Phase 1.
    -   *Note: This task required significant iteration. The initial script was inefficient (N+1 queries). It was refactored to use a cohort-based approach at the user's direction, querying the database once per user group (received, opened, clicked) instead of once per user.*

-   [x] **Task 3: Calculate Impact Metrics for Each Campaign.**
    -   `@squad-agent-database-master`: For each campaign's recipient list:
        -   [x] Query the internal database to fetch offer creation data 30 days before and 48 hours after the email was received.
        -   [x] Calculate the normalized daily averages for both periods.
        -   [x] Compute the final "offer uplift %".
    -   *Note: The GraphQL query was optimized to use the `_in` operator to fetch data for an entire cohort in a single call, dramatically improving performance.*

-   [x] **Task 4: Generate Impact Summary Files.**
    -   `@squad-agent-database-master`: For each campaign, create a `[campaignID]-impact-summary` file by duplicating the `raw-data` report and appending the new "Impact Summary" section with the calculated metrics.
    -   *Note: The output format was refined to include both cohort-level and per-user averages for clarity, along with additional formatting for readability. The script was also updated to purge the output directory before running to ensure a clean final state.*

-   [x] **Task 5: Phase 2 Closeout.**
    -   [x] `@squad-agent-conductor`: The conductor must systematically review the execution checklist for this phase. This includes: marking all completed tasks, appending notes to checklist items about key challenges or learnings encountered, and documenting any undocumented deviations by creating a new checked-off checklist item starting with `IN-FLIGHT ADDITION:` to clearly flag tasks that were performed but not planned.
    -   [x] `@squad-agent-scribe`: Create the worklog entry for Phase 2.
    -   [x] `@squad-agent-conductor`: Merge `feature/email-impact/phase-2` into `main`.
    -   [x] **Delete feature branch:** After merging, the conductor will delete the feature branch from local and remote repositories.

---

### Phase 3: Block 3 - Final Analysis & Reporting
-   **Primary Owner:** `@project-agent-email-growth`
-   **Branch:** `feature/email-impact/phase-3`

-   [x] **Task 1: Create Feature Branch.**
    -   `@squad-agent-conductor` to create the `feature/email-impact/phase-3` branch from the latest `main`.

-   [x] **Task 1.5: Level Up The Email Agent.**
    -   `@project-agent-email-growth`:
        -   [x] Read through `@what-were-building.md` (location: /Users/AstroLab/Desktop/tradeblock-cursor/knowledge-blocks/tradeblock-foundational-knowledge/what-were-building.md) and suggest a series of edits to your own rules file based on what you learn. The goal is to tailor your rules to our Tradeblock-specific context, and also to identify crucial knowledge about things like our target users, key differentiators, etc. that will make you a more effective marketer.
        -   [x] Present these proposed changes to the user as a numbered list so that he can approve or reject different changes based on their list nubmer.
        -   [x] After the approved changes are adopted, use sequential thinking to formulate the three most important questions you need answers to in order to be great at your job and ask those questions to the user. Follow up questions are encouraged. Once you have good answers, update your rules file to enshrine that newly acquired knowlege for yourself in perpetuity.
        -   [x] Ask the user about the different types of emails we already send today / that we've sent in the past to form a basic mental model of our existing email playbook. Add this knowledge to your rules file as well.

-   [x] **Task 2: Synthesize Campaign Data.**
    -   `@project-agent-email-growth`: Consolidate all `[campaignID]-impact-summary.txt` files into a single, master analysis file.

-   [x] **Task 3: Conduct Holistic Performance Analysis.**
    -   `@project-agent-email-growth`:
        -   [x] Enrich each campaign's summary with a rich set of tags (email type, topic, tone, etc.). Suggest and apply thematic and semantic tags to our emails to enable us to better understand what is and isn’t working re: the actual language, tone, and content focus of our emails.
        -   [x] Analyze the full, enriched dataset to identify key drivers of opens, clicks, and offer creation. Document your thought process and findings in full detail.

-   [x] **Task 4: Generate Final Reports.**
    -   `@project-agent-email-growth`: Produce the two final deliverables:
        -   [x] A detailed `initial-email-impact-analysis-report.md`.
        -   [x] A separate document (`weekly-email-brief-[date].md`) with concrete recommendations for the next week's email slate, including experiments.

-   [ ] **Task 5: Phase 3 Closeout.**
    -   [ ] `@squad-agent-conductor`: The conductor must systematically review the execution checklist for this phase. This includes: marking all completed tasks, appending notes to checklist items about key challenges or learnings encountered, and documenting any undocumented deviations by creating a new checked-off checklist item starting with `IN-FLIGHT ADDITION:` to clearly flag tasks that were performed but not planned.
    -   [ ] `@squad-agent-scribe`: Create the worklog entry for Phase 3.
    -   [ ] `@squad-agent-conductor`: Merge `feature/email-impact/phase-3` into `main`.
    -   [ ] **Delete feature branch:** After merging, the conductor will delete the feature branch from local and remote repositories. 