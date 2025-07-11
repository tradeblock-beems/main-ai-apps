# Project Brief: "Top Prospects" Email CSV Generation

## 1. The Mission

To create a Python script that generates a targeted CSV for a personalized email campaign aimed at re-engaging high-propensity users who have recently been inactive.

## 2. Business Context & The "Why"

We've identified a segment of users with high "trade propensity" scores who haven't completed a trade in the last 90 days. This email campaign is designed to be a high-impact touchpoint to bring them back into the fold.

The core idea is to send them a hyper-personalized email that:
1.  Acknowledges their status as a "Top Prospect."
2.  Highlights their single most-desired shoe.
3.  Provides a compelling incentive (free shipping) to use the Offer Generator feature.

This script is the critical first step: building the targeted, personalized audience file that makes this entire campaign possible.

## 3. "What Done Looks Like"

A clean, repeatable Python script named `generate_top_prospects_csv.py` that:

1.  **Reads the target audience:** Ingests the list of user IDs from `projects/data-analysis/trade-propensity/outputs/reengagement_audience_20250710_094433.csv`.
2.  **Fetches user data:** For each user ID, it queries our database to get their `email`, `firstname`, and preferred `usersize`.
3.  **Identifies the #1 Target Shoe:** For each user, it determines their single top target shoe by querying the `desired_items` table and selecting the **most recently added item**.
4.  **Generates the final CSV:** It outputs a timestamped CSV file with the following columns: `email`, `firstname`, `usersize`, `top_target_shoe_name`, `top_target_shoe_variantid`.

## 4. Constraints & Assumptions

*   **Audience Source:** The initial audience is the static list provided. Future iterations may require a dynamic way to generate this list.
*   **"Top Target" Definition:** For the purpose of this script, we are defining the "top target shoe" as the most recently added item in a user's `desired_items` (wishlist). This is a direct interpretation of the requirements provided.
*   **Code Reuse:** The script should heavily leverage existing functions from scripts like `generate_single_shoe_feature_csv.py` and `generate_whos_hunting_csv.py` to avoid reinventing the wheel for fetching user data. 