# Project Brief: Email Impact Analysis Framework

## 1. The Big Picture: Why This Matters

We send a lot of emails, but our understanding of their *actual* impact is superficial. We track opens and clicks, but we have a massive blind spot when it comes to the ultimate goal: **driving offer creation.** We're flying blind, relying on intuition to decide which emails to send.

This project changes that. We are building a reusable, multi-stage analysis framework to move from vanity metrics to business impact. The goal is to create a system that tells us, with data, how effective every single email is at getting users to create offers. This will be the foundation for a smarter, data-driven, and high-velocity email program.

## 2. What We're Building: A Block-by-Block Approach

This project is structured as a pipeline of three distinct "blocks." Each block is owned by a specialist agent, takes a specific input, and produces a standardized output. This modular design ensures that each component is reusable and the overall process is easy to debug and improve.

### Block 1: Raw Data Ingestion & Cleansing
-   **Owner:** `@mailjet-data`
-   **Goal:** Pull all historical email campaign data from Mailjet and perform initial cleansing and structuring.
-   **Key Activities:**
    -   Filter out small-batch test sends.
    -   Algorithmically identify and tag A/B/C subject line tests.
-   **Key Outputs:**
    -   `[campaignID]-raw-data`: A report with stats for each campaign.
    -   `[campaignID]-recipient-actions.csv`: A file listing every recipient and their engagement (receive, open, click).

### Block 2: Impact Calculation
-   **Owner:** `@db-master`
-   **Goal:** Connect email engagement data to in-app user behavior.
-   **Key Activities:**
    -   For each campaign, query our internal database to get the offer creation history for all recipients.
    -   Calculate the `before` (30 days prior) and `after` (48 hours post) daily average offer creation rate.
    -   Calculate the percentage uplift.
-   **Key Outputs:**
    -   `[campaignID]-impact-summary`: A file that appends the offer uplift analysis to the raw data report from Block 1.

### Block 3: Enrichment, Analysis & Recommendations
-   **Owner:** `@growth-hacker`
-   **Goal:** Add qualitative insights to the quantitative data and generate actionable recommendations.
-   **Key Activities:**
    -   Enrich each campaign's summary with a rich set of tags (email type, topic, tone, etc.).
    -   Conduct a holistic analysis to identify patterns of what drives opens, clicks, and offers.
    -   Develop a set of concrete, experiment-driven recommendations for the upcoming email schedule.
-   **Key Outputs:**
    -   `initial-email-impact-analysis-report`: A deep-dive report on our historical email performance.
    -   A slate of recommended emails and A/B tests for the coming week.

## 3. What "Done" Looks Like

This project is complete when:
-   All three blocks have been successfully executed for all historical email campaigns.
-   Every historical campaign has a corresponding `[campaignID]-impact-summary` file in the output directory.
-   The `@growth-hacker` has produced the final analysis report and a set of actionable recommendations.
-   The entire process is documented and repeatable, ready to be run on new campaigns as they are sent. 