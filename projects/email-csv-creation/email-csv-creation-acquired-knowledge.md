# Acquired Knowledge for Project: Email CSV Creation

*This file will be populated by the @squad-agent-scribe with durable insights, repeatable patterns, and key lessons learned during the project.* 

## [DIAGNOSTICS]: A Pattern for Debugging Silent Data Errors
- **Context**: A query was executing successfully without errors, but key columns in the result set were consistently zero. This indicated a logical error in the query, not a syntax or database error.
- **What We Learned**: A multi-step diagnostic pattern proved highly effective:
    1.  **Isolate & Confirm**: Write a minimal script to programmatically analyze the results (e.g., sum the suspect columns) to prove the error exists and isn't just an anomaly.
    2.  **Form a Hypothesis**: Based on the isolated issue, form a specific theory about the cause (e.g., "The `WHERE` clause filter on `status = 'PENDING'` is likely incorrect").
    3.  **Create a Diagnostic Test**: Modify the query in a minimal way to test the hypothesis. This could be commenting out a line or changing a value. The goal is to see if the result changes as expected.
    4.  **Query for Ground Truth**: When a filter value (like a status or enum) is suspected to be wrong, don't guess. Write a direct query to the source table (e.g., `SELECT status FROM offer_statuses`) to get the definitive list of valid values.
- **Future Use?**: Absolutely. This is a robust, general-purpose debugging workflow for any situation where a query runs but produces suspect data. It prioritizes evidence over guesswork and is highly effective. 

## [DB SCHEMA]: Critical Insight on Active User Status
- **Context**: Queries designed to fetch active users were consistently returning empty sets, despite being syntactically correct. This caused a major roadblock in Phase 4.
- **What We Learned**: The `users` table uses `deleted_at = 0` to signify an active user, not `deleted_at IS NULL`. This is a non-standard but critical convention in our database schema. Filtering for `IS NULL` will incorrectly exclude all active users.
- **Future Use?**: This is a foundational piece of knowledge for *any* query involving user data in our system. It should be socialized immediately and added to any future database onboarding materials. This is not just reusable, it's essential.

## [ARCHITECTURE]: Decoupling Audience from Payloads
- **Context**: The initial `generate_hot_drop_csv.py` script was built with the audience-generation logic tightly coupled to the product being featured. This led to overly complex queries and incorrect results.
- **What We Learned**: A more robust and scalable pattern is to treat audience generation and payload generation as two distinct, independent steps.
    1.  **Audience First**: Generate a generic audience list based on universal criteria (e.g., user activity, closet size, trade history).
    2.  **Enrich with Payload**: Take the resulting list of users and *then* enrich it with the specific data needed for the campaign (e.g., stats related to a specific product).
    This separation of concerns makes the logic cleaner, easier to debug, and the components (like the audience query) far more reusable.
- **Future Use?**: This is a core architectural pattern for any data generation script or campaign tool we build. It should be the default approach. Is it worth adding this to our `technical-standard-approaches.md`?

## [DIAGNOSTICS]: Enhancing the Silent Data Error Pattern
- **Context**: During the debugging of the `generate_hot_drop_csv.py` script, it was discovered that `email` and `firstname` columns were arriving as `None` in the final dataframe, despite being in the `SELECT` clause.
- **What We Learned**: This was caused by a missing alias in the SQL query. When joining multiple tables that have columns with the same name (like `id` or `email`), it is essential to use an alias (e.g., `SELECT u.id, u.email, p.id as product_id...`) to avoid ambiguity. The database connector may not throw an error, but it can silently drop or nullify one of the conflicting columns. This learning will be added as a key step in the diagnostic pattern.
- **Future Use?**: Yes, this is a critical addendum to our existing diagnostic pattern for silent data errors. 

## PROCESS IMPROVEMENT: Codifying Discovery and Documentation Protocols

-   **Context**: During Phase 2, we realized our initial query plan for the `desired_items` table was based on an incorrect assumption about its schema. We also identified an opportunity to make our project management documentation more robust.
-   **What We Learned**:
    1.  **Schema Discovery First:** When documentation is uncertain, the most effective first step is direct SQL exploration (`SELECT * LIMIT 10`) to get the ground truth of a table's structure before writing functional queries. This prevents building on faulty assumptions.
    2.  **Embedded Closeout Notes:** Adding detailed `***CLOSEOUT NOTES:***` directly to completed tasks in an execution checklist provides invaluable, in-context history of *why* decisions were made, preserving the narrative for future teams.
-   **Future Use?**: Absolutely. These learnings were so valuable they were immediately codified into the official rules for our agents.
    -   The `@squad-agent-database-master`'s rules were updated to include the "Direct Schema Exploration via SQL" best practice.
    -   The `@squad-agent-conductor`'s rules were updated to mandate the use of embedded `***CLOSEOUT NOTES:***` in all future project phase reviews.
    
    This ensures these process improvements are automatically applied across all future projects. 