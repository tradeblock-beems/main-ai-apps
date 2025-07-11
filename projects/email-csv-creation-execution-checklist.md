# Execution Checklist: Email CSV Creation

***Note: For this project, the `@squad-agent-database-master` will operate under the persona and rules defined in `@project-agent-csv-crafter.md`.***

## Phase 0: Project Setup & Execution Plan Refinement

*Branch: `feature/email-csv-creation/phase-0`*
*Primary Owner: @squad-agent-database-master*

- [x] **Onboarding & Review:** As the `squad-agent-database-master`, I will onboard to the project, digest the project brief, and review all related documents.
- [x] **Execution Checklist Improvement:** I will apply my expertise to scrutinize and improve this execution checklist, adding any necessary details or steps to ensure a smooth and successful project.
- [x] **Technical Standards Alignment:** I will review `@technical-standard-approaches.md` and update this checklist to ensure the project aligns with our standard technical practices.
- [x] **Phase Review by Conductor:** @squad-agent-conductor to review the completed phase, ensuring all tasks are done and documented.
- [x] **Phase Worklog Entry by Scribe:** @squad-agent-scribe to create a worklog entry for this completed phase.
- [x] **Phase GitHub Commit by Conductor:** @squad-agent-conductor to commit the completed phase-branch to GitHub with a conventional commit message, following the standard approaches defined in our technical standards document.
- [ ] **Delete feature branch:** After merging, the conductor will delete the feature branch from local and remote repositories.

## Phase 1: Building Block - Audience Query

*Branch: `feature/email-csv-creation/phase-1`*
*Primary Owner: @squad-agent-database-master*

- [x] **Create Feature Branch:** @squad-agent-conductor to create and checkout a new feature branch for this phase named according to our standards.
- [x] Create a new file for all query building blocks at `basic_capabilities/internal_db_queries_toolbox/email_csv_queries.py`.
- [ ] In this new file, create a reusable Python function for the **Audience Query**. This function must use the existing `sql_utils` or `graphql_utils` for execution.
- [x] The function should accept the following parameters: `days_since_last_active`, `min_closet_items`, `min_lifetime_trades`.
- [x] The function must return data including: `user_id`, `email`, `first_name`, and preferred `shoe_size`.
- [x] Thoroughly test the function with a range of input variables, including edge cases (e.g., zero-value parameters, non-existent users).
- [x] Add a comprehensive docstring to the function explaining its purpose, parameters, and return value.
- [x] **Phase Review by Conductor:** @squad-agent-conductor to review the completed phase.
- [x] **Phase Worklog Entry by Scribe:** @squad-agent-scribe to create a worklog entry for this completed phase.
- [x] **Phase GitHub Commit by Conductor:** @squad-agent-conductor to commit the completed phase-branch to GitHub with a conventional commit message, following the standard approaches defined in our technical standards document.

## Phase 2: Building Block - Product-Level Query

*Branch: `feature/email-csv-creation/phase-2`*
*Primary Owner: @squad-agent-database-master*

- [x] **Create Feature Branch:** @squad-agent-conductor to create and checkout a new feature branch for this phase named according to our standards.
- [x] In `basic_capabilities/internal_db_queries_toolbox/email_csv_queries.py`, create a reusable Python function for the **Product-Level Query**. This function must use the existing `sql_utils` or `graphql_utils` for execution.
- [x] The function should accept a list of up to 3 `product_ids` as input.
- [x] The function should return all the necessary data points, including product-level statistics, for use in our email campaigns.
- [x] Thoroughly test the function with a range of input variables, including edge cases.
- [x] Add a comprehensive docstring to the function explaining its purpose, parameters, and return value.
- [x] **Phase Review by Conductor:** @squad-agent-conductor to review the completed phase.
- [x] **Phase Worklog Entry by Scribe:** @squad-agent-scribe to create a worklog entry for this completed phase.
- [x] **Phase GitHub Commit by Conductor:** @squad-agent-conductor to commit the completed phase-branch to GitHub with a conventional commit message, following the standard approaches defined in our technical standards document.
- [ ] **Delete feature branch:** After merging, the conductor will delete the feature branch from local and remote repositories.

## Phase 3: Building Block - Variant-Level Query

*Branch: `feature/email-csv-creation/phase-3`*
*Primary Owner: @squad-agent-database-master*

- [x] **Create Feature Branch:** @squad-agent-conductor to create and checkout a new feature branch for this phase named according to our standards.
- [x] In `basic_capabilities/internal_db_queries_toolbox/email_csv_queries.py`, create a reusable Python function for the **Variant-Level Query**. This function must use the existing `sql_utils` or `graphql_utils` for execution.
- [x] The function should accept a list of `product_ids` as input.
- [x] The function must return, for each variant: `variant_id`, and various stats (offer counts, owner counts, wisher counts, recent activity).
- [x] Thoroughly test the function.
- [x] Add a comprehensive docstring to the function.
- [x] **Phase Review by the Conductor:**  
     - The conductor must systematically review the execution checklist for this phase.  
     - This includes: marking all completed tasks, appending notes to checklist items about key challenges or learnings encountered, and documenting any undocumented deviations by creating a new checked-off checklist item starting with `IN-FLIGHT ADDITION:` to clearly flag tasks that were performed but not planned.
     - *NOTE: Key learning involved discovering the correct `'OPEN'` status for offers. A `TypeError` also prompted a beneficial, unplanned update to `sql_utils.py` to use `RealDictCursor`.*
- [x] **Phase Worklog Entry by Scribe:** @squad-agent-scribe to create a worklog entry for this completed phase.
- [x] **Phase GitHub Commit by Conductor:** @squad-agent-conductor to commit the completed phase-branch to GitHub with a conventional commit message, following the standard approaches defined in our technical standards document.
- [x] **Delete feature branch:** After merging, the conductor will delete the feature branch from local and remote repositories.

## Phase 4: Email Script - Single Shoe Feature

*Branch: `feature/email-csv-creation/phase-4`*
*Primary Owner: @squad-agent-database-master*

- [x] **Create Feature Branch:** @squad-agent-conductor to create and checkout a new feature branch for this phase named according to our standards.
- [x] In the `/projects/email-csv-creation/` directory, create a new Python script: `generate_single_shoe_feature_csv.py`.
- [x] The script will import and use the building block functions from `basic_capabilities.internal_db_queries_toolbox.email_csv_queries`.
- [x] The script should accept a single `productID` and audience parameters as input.
    - *Note: This was a key learning. The script was updated to separate audience criteria args (`--days_since_last_active`, etc.) from product-specific args (`--stats_lookback_days`), which clarified the logic significantly.*
- [x] The script must generate a CSV file that exactly matches the structure and headers of `example_csvs/hot-drop-ferrari-14-06162025.csv`. If you have any questions about how the data returned from our database queries maps to the column names in the example csv, ASK THE USER — DO NOT GUESS.
- [x] Test the script to ensure the final CSV is generated correctly.
    - *Note: This required an extensive, multi-step debugging process. Key issues included incorrect audience logic, mismatched column name aliases between SQL and Python, and a critical misunderstanding of the `deleted_at` field (`0` for active, not `NULL`).*
- [x] **Phase Review by the Conductor:**  
     - The conductor must systematically review the execution checklist for this phase.  
     - This includes: marking all completed tasks, appending notes to checklist items about key challenges or learnings encountered, and documenting any undocumented deviations by creating a new checked-off checklist item starting with `IN-FLIGHT ADDITION:` to clearly flag tasks that were performed but not planned.
- [x] **Phase Worklog Entry by Scribe:** @squad-agent-scribe to create a worklog entry for this completed phase.
- [x] **Phase GitHub Commit by Conductor:** @squad-agent-conductor to commit the completed phase-branch to GitHub with a conventional commit message, following the standard approaches defined in our technical standards document.
- [x] **Delete feature branch:** After merging, the conductor will delete the feature branch from local and remote repositories.

## Phase 5: Email Script - Trending Shoes

*Branch: `feature/email-csv-creation/phase-5`*
*Primary Owner: @squad-agent-database-master*

- [x] **Create Feature Branch:** @squad-agent-conductor to create and checkout a new feature branch for this phase named according to our standards.
- [x] In the `/projects/email-csv-creation/` directory, create a new Python script: `generate_trending_shoes_csv.py`.
- [x] The script will utilize the building block functions from `basic_capabilities.internal_db_queries_toolbox.email_csv_queries`.
- [x] The script should accept a list of 3 `product_ids` and audience parameters as input.
- [x] The script must generate a CSV file that exactly matches the structure and headers of `example_csvs/trending-shoes-07012025.csv`. If you have any questions about how the data returned from our database queries maps to the column names in the example csv, ASK THE USER — DO NOT GUESS.
- [x] Test the script to ensure the final CSV is generated correctly.
- [x] **Phase Review by the Conductor:**  
     - The conductor must systematically review the execution checklist for this phase.  
     - This includes: marking all completed tasks, appending notes to checklist items about key challenges or learnings encountered, and documenting any undocumented deviations by creating a new checked-off checklist item starting with `IN-FLIGHT ADDITION:` to clearly flag tasks that were performed but not planned.
- [x] **Phase Worklog Entry by Scribe:** @squad-agent-scribe to create a worklog entry for this completed phase.
- [x] **Phase GitHub Commit by Conductor:** @squad-agent-conductor to commit the completed phase-branch to GitHub with a conventional commit message, following the standard approaches defined in our technical standards document.
- [x] **Delete feature branch:** After merging, the conductor will delete the feature branch from local and remote repositories.

## Phase 6: Email Script - Who's Huntin'

*Branch: `feature/email-csv-creation/phase-6`*
*Primary Owner: @squad-agent-database-master*

- [x] **Create Feature Branch:** @squad-agent-conductor to create and checkout a new feature branch for this phase named according to our standards.
- [x] In `basic_capabilities/internal_db_queries_toolbox/email_csv_queries.py`, design and implement the unique queries required for the "Who's Huntin'" email.
- [x] The queries must identify the top 3 users who have created the most trade offers for shoes in a target user's size over the past 7 days.
- [x] The queries must also find the "top target" shoe for each of those 3 hunting users.
- [x] In the `/projects/email-csv-creation/` directory, create a new Python script: `generate_whos_hunting_csv.py`.
- [x] The script will import the necessary functions from `email_csv_queries` and should accept a `target_user_id` to determine the shoe size for the search.
    - **Note:** This approach was fundamentally flawed and abandoned after multiple failures. The initial logic based on a single `target_user_id` could not reliably find hunters because the test user data was insufficient. This led to a critical strategy change directed by the user.
- [x] **IN-FLIGHT ADDITION:** Refactored the script to fetch hunters for a standard list of shoe sizes first, then map those hunters to a general audience of users based on their individual size preferences. This proved to be a much more robust and successful approach.
- [x] The script must generate a CSV file that exactly matches the structure of `example_csvs/whos-hunting-audience-csv-20250619.csv`.
- [x] Test the script thoroughly.
- [x] **Phase Review by Conductor:** @squad-agent-conductor to review the completed phase.
     - The conductor must systematically review the execution checklist for this phase.  
     - This includes: marking all completed tasks, appending notes to checklist items about key challenges or learnings encountered, and documenting any undocumented deviations by creating a new checked-off checklist item starting with `IN-FLIGHT ADDITION:` to clearly flag tasks that were performed but not planned.
- [ ] **Phase Worklog Entry by Scribe:** @squad-agent-scribe to create a worklog entry for this completed phase.
- [ ] **Phase GitHub Commit by Conductor:** @squad-agent-conductor to commit the completed phase-branch to GitHub with a conventional commit message, following the standard approaches defined in our technical standards document.