# Acquired Knowledge: Email Impact Project

This document is a repository for durable insights, repeatable patterns, key lessons learned, and domain-specific principles uncovered during the "email-impact" project. It is maintained by `@squad-agent-scribe` and contributed to by all agents.

Its purpose is to reduce ramp-up time on future projects and continuously compound our team's expertise. 

## Project Management Protocol: Pre-Execution Roster Verification
- **Context**: At the start of the "email-impact" project, the kickoff prompt listed a different set of agents than the ones defined in the auto-generated project files.
- **What We Learned**: The `@squad-agent-conductor` immediately paused execution to resolve this ambiguity with the user. This pre-flight check ensured all project documents were corrected and the right agents were assigned *before* any substantive work began. This prevents downstream errors, ensures correct agent invocation, and guarantees that logging and notifications target the correct entities from the outset.
- **Future Use?**: This is a mandatory, universal standard for all projects and agents. It should be reinforced in all agent onboarding materials.

## PERFORMANCE: Parallelizing API Calls
- **Context**: The initial data extraction script was slow, as it made thousands of API calls sequentially.
- **What We Learned**: For batch operations involving numerous independent API calls, using Python's `concurrent.futures.ThreadPoolExecutor` can provide a significant performance boost. In this case, it resulted in an approximate 10x speed improvement for the Mailjet data extraction.
- **Future Use?**: This is a highly reusable pattern for any script that needs to make a large number of I/O-bound requests (APIs, database queries, file reads/writes). It should be considered a standard approach for performance optimization in such cases.

## RELIABILITY: Caching for Fault-Tolerant Scripts
- **Context**: The Mailjet extraction script was long-running and could fail partway through, forcing a complete restart and wasting API calls.
- **What We Learned**: Implementing a simple caching mechanism can make scripts more robust. By saving the result of the initial, expensive data pull (e.g., the list of all message IDs) to a local file, the script can check for this file on startup. If the file exists, it can skip the initial step and resume processing from where it left off, saving significant time and resources.
- **Future Use?**: This is a valuable, reusable strategy for any long-running data processing or ETL script. It provides fault tolerance and makes development and debugging much more efficient.

## PERFORMANCE: Cohort-Based vs. Per-Unit Processing
- **Context**: The initial database analysis script was designed to iterate through a list of thousands of users and execute a separate database query for each one. This N+1 query pattern resulted in extremely poor performance, with projected run times of hours or even days.
- **What We Learned**: For large-scale data analysis, it is exponentially more efficient to group units (like users) into cohorts and run a single, aggregate query for each cohort. By modifying the GraphQL query to accept a list of IDs and use the `_in` operator, we reduced the number of database calls from thousands to a handful, cutting the total execution time from a projected 12+ hours to under 5 minutes.
- **Future Use?**: This is a fundamental principle for performant data processing. Before implementing any loop that contains a database query or API call, always ask: "Can I collect all the IDs first and fetch the data in a single batch operation?" This should be a primary consideration for any agent writing data-intensive scripts.

## USABILITY: Rich Data in Reporting
- **Context**: The first version of the analysis script produced "per-user" metrics. While technically correct, these numbers lacked context.
- **What We Learned**: User feedback highlighted that reports are more valuable when they include both absolute and relative figures. By adding the raw, cohort-level totals alongside the "per-user" averages, the final `impact-summary.txt` files became much easier to interpret and provided a clearer picture of the data.
- **Future Use?**: When generating reports or summaries, agents should default to including both aggregate totals and normalized (e.g., "per-user," "per-day") metrics. This provides multiple layers of understanding and makes the data more accessible to different audiences without requiring them to do their own math. 