# Project Brief: Email CSV Creation

## 1. Overview & Goals

This project is designed to streamline and standardize the creation of audience CSV files for Mailjet email campaigns. The primary goal is to build a set of reusable, modular database queries and Python scripts that can be easily configured to generate CSVs for various marketing emails.

This will replace manual, one-off query creation, reducing errors, increasing speed, and ensuring data consistency across all email sends. "Done" means we have a robust, script-based system for generating audience files for our key email templates.

## 2. Core Deliverables

The project will produce two main types of deliverables:

### A. Reusable Query "Building Blocks"
A set of standalone, well-documented, and tested queries that can be combined to fetch necessary data. These will be the foundational components for all email CSV scripts.

1.  **Audience Query:** Fetches a list of target users based on engagement and activity criteria.
2.  **Product-Level Query:** Fetches metadata and aggregate stats for specific products (sneakers).
3.  **Variant-Level Query:** Fetches size-specific data and stats for product variants.

### B. Python CSV Generation Scripts
A collection of Python scripts, each corresponding to a specific Mailjet email template. These scripts will leverage the query building blocks to assemble and format the final CSV files.

1.  **Hot Drop Email Script**
2.  **Trending Shoes Email Script**
3.  **Throwback Thursday Email Script**
4.  **Who's Huntin' Email Script**

## 3. Key Context & Constraints

- **Platform:** The target platform for the CSVs is Mailjet. The scripts must produce files with the exact column headers and data formats required by the corresponding Mailjet templates.
- **Data Source:** All data will be queried from the internal Tradeblock database, which uses PostgreSQL with a Hasura GraphQL layer.
- **Executor:** The `squad-agent-database-master` will be the primary agent responsible for writing and implementing all queries and scripts, given its expertise in our database architecture.
- **Example Files:** An `example_csvs/` directory will contain sample CSVs that define the required output structure and column headers for each email template. The generated files must match these examples precisely.

## 4. Success Criteria

This project is successful when:
- All three "building block" queries are implemented, tested, and documented.
- All four Python CSV generation scripts are fully functional and produce accurate, correctly formatted CSVs based on the provided examples.
- The system is modular enough that creating a script for a new email template is significantly faster than starting from scratch. 