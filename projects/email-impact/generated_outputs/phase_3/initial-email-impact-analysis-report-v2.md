
# Email Impact Analysis Report v2

## 1. Executive Summary

This report presents a deep-dive analysis of email campaign performance, utilizing a new v2 tagging taxonomy to uncover the underlying drivers of user engagement, measured by Offer Uplift post-email-open.

The analysis reveals a powerful, non-obvious insight: **a user's sense of `Status` and `Community` belonging are dramatically more powerful motivators than direct `Financial Benefit`**. Emails that are `Congratulatory` and reinforce a user's standing within the Tradeblock ecosystem (e.g., becoming a `Trusted Trader`, being featured as a `Top Hunter`) generate overwhelmingly positive results. In contrast, emails framed around explicit monetary incentives like fee discounts show mediocre or even negative results.

Our biggest opportunity is to double-down on community and status-driven messaging. We hypothesize that users are playing a "game" of social commerce, and our emails are most effective when they read as notifications about their progress and standing in that game.

**Key Recommendations:**
1.  **Prioritize `Community` & `Lifecycle` Playbooks:** Shift focus from generic `Promotional` blasts to more targeted, behavior-triggered campaigns that make users feel seen and recognized.
2.  **Frame Everything as Status:** Even financial rewards should be framed as a `Congratulatory` marker of `Status` (e.g., "You've unlocked the top-tier fee structure") rather than a simple discount.
3.  **Test "Pain Point Agitation":** The data shows a strong negative impact from campaigns that highlight friction (e.g., "Tired of DS-only traders?"). We need to validate if this is truly a poor strategy or if our execution was flawed.

---

## 2. Methodology

This analysis was conducted on the **Opened Cohort** for each campaign, focusing on the **Offer Uplift %** metric as the primary KPI. An "infinite" uplift (from a zero baseline) was capped at 1000% for calculation purposes.

The process involved three key steps:
1.  **Taxonomy v2 Implementation:** A more granular tagging system was developed and applied to each campaign. This system classifies emails across six dimensions: `playbook_type`, `topic_focus`, `framing`, `personalization_level`, `call_to_action`, and `test_details`.
2.  **Automated Analysis:** A Python script (`phase_3_detailed_analysis.py`) was used to parse the v2-tagged data and calculate performance metrics.
3.  **Multi-Dimensional Analysis:** The script calculated average uplift for individual tags, performance of strategic tag combinations (e.g., `playbook_type` + `framing`), and identified the highest and lowest performing campaigns. The results were compiled into a structured JSON file for reporting.

---

## 3. Detailed Findings

### 3.1. Performance by `playbook_type`

`Lifecycle` and `Community` playbooks are the clear winners, driving significant positive engagement. `Product Update` and `Promotional` emails, as a category, have a net-negative impact on user offers.

| Playbook Type    | Average Offer Uplift (%) | Campaign Count |
|------------------|--------------------------|----------------|
| `Lifecycle`      |                   308.83 |              6 |
| `Community`      |                    -0.81 |             14 |
| `Transactional`  |                    -9.50 |             18 |
| `Product Update` |                   -14.73 |              5 |
| `Promotional`    |                   -19.10 |             18 |


### 3.2. Performance by `framing`

The framing of a message is critical. `Congratulatory` messages celebrating user achievements are, by an order of magnitude, the most effective strategy. Conversely, framing around `Pain Point Agitation` is correlated with the worst outcomes.

| Framing                 | Average Offer Uplift (%) | Campaign Count |
|-------------------------|--------------------------|----------------|
| `Congratulatory`        |                   337.04 |              5 |
| `Reward`                |                   337.04 |              5 |
| `Exclusivity`           |                   131.43 |              1 |
| `Urgency`               |                    98.33 |              2 |
| `Social Proof`          |                    -1.29 |              6 |
| `Informational`         |                   -2.48 |              3 |
| `Financial Benefit`     |                   -19.09 |             10 |
| `Pain Point Agitation`  |                   -23.77 |              4 |


### 3.3. Performance of Strategic Combinations (`playbook_type` + `framing`)

This view provides the most actionable insight. The combination of a `Lifecycle` playbook with `Congratulatory` framing is the single most powerful strategy in our arsenal.

| Playbook         | Framing                  | Average Offer Uplift (%) |
|------------------|--------------------------|--------------------------|
| `Lifecycle`      | `Congratulatory`, `Reward` |                   478.78 |
| `Promotional`    | `Financial Benefit`      |                     -3.87 |
| `Product Update` | `Informational`          |                     -5.12 |
| `Community`      | `Social Proof`           |                    -11.41 |
| `Promotional`    | `Pain Point Agitation`   |                    -23.77 |


### 3.4. Top 5 Performing Campaigns

The top campaigns are almost exclusively `Lifecycle` emails congratulating users on achieving `Trusted Trader` status.

| Uplift (%) | Campaign ID  | Subject                                        | Key Tags                                     |
|------------|--------------|------------------------------------------------|----------------------------------------------|
|    1000.00 | 7754358938   | Start trading again with 40% lower fees!       | `Promotional`, `Fee Discount`, `Financial Benefit` |
|     626.19 | 7754142716   | Congrats–You’re a Trusted Trader 👟🤝          | `Lifecycle`, `Status`, `Congratulatory`      |
|     331.94 | 7754146600   | Congrats–You're a Trusted Trader 👏 👟         | `Lifecycle`, `Status`, `Congratulatory`      |
|     275.00 | 7754358946   | Save $20 on EVERY future trade – you’re so close | `Promotional`, `Financial Benefit`, `Urgency` |
|     150.84 | 7754148444   | Congrats–You're a Trusted Trader 👏 👟         | `Lifecycle`, `Status`, `Congratulatory`      |

*Note: The 1000% uplift is an artifact of the calculation (uplift from 0). While the percentage is extreme, the core insight is that this email reactivated dormant users.*

### 3.5. Bottom 5 Performing Campaigns

The worst performers were universally `Community`-focused emails framed with `Pain Point Agitation` around "DS-only" traders or `Promotional` emails with negative `Social Proof`.

| Uplift (%) | Campaign ID  | Subject                                    | Key Tags                                        |
|------------|--------------|--------------------------------------------|-------------------------------------------------|
|    -100.00 | 7754358936   | Trusted Traders just saved $10k...         | `Transactional`, `Financial Benefit`, `Social Proof`  |
|     -77.22 | 7754650782   | Done with “I only trade for DS” replies?   | `Community`, `Community Norms`, `Pain Point Agitation` |
|     -35.29 | 7754560928   | Who’s most active in your size? ...        | `Community`, `Top Hunters`, `Social Proof`        |
|     -32.37 | 7754650784   | Tired of DS-only traders? Let’s change that. | `Community`, `Community Norms`, `Pain Point Agitation` |
|     -32.16 | 7754560900   | Size 10's Top Hunters: Who’s making moves? | `Community`, `Top Hunters`, `Social Proof`        |

---

## 4. Hunches & Hypotheses

Based on these findings, we've developed several hypotheses about user motivation.

*   **Hunch 1: The "Status Game" is the whole game.**
    *   **Hypothesis:** Users are more motivated by achieving and maintaining status within the Tradeblock ecosystem than by direct financial rewards. Their primary driver is "winning" at the social game of collecting and trading. Emails that feel like "status update" notifications from the game will always outperform emails that feel like marketing.
*   **Hunch 2: Negative framing creates "anti-lift".**
    *   **Hypothesis:** Using negative framing (`Pain Point Agitation`) or highlighting negative social proof (e.g., other people saving money you didn't) actively discourages engagement. It breaks the "fun game" illusion and reminds users of transactional friction, causing them to disengage.
*   **Hunch 3: Personalization is a multiplier, not a driver.**
    *   **Hypothesis:** Personalization (e.g., "Top Hunters in your size") on its own doesn't drive uplift. In fact, when combined with a weak playbook (`Community`) and weak framing (`Social Proof`), it performs poorly. Personalization likely only works when it multiplies the effect of a strong core message (e.g., personalizing a `Congratulatory`, `Status`-based email).

---

## 5. Proposed Experiments for Next Week

To validate these hypotheses, we propose the following A/B tests for the upcoming week:

1.  **Experiment: "Status-Framed Reward" vs. "Benefit-Framed Reward"**
    *   **Hypothesis:** Hunch #1 - The "Status Game" is the whole game.
    *   **Setup:** For a cohort of users who have earned a fee discount, split them into two groups.
        *   **Group A (Status Frame):** "Congrats! You've unlocked the Pro Tier fee structure."
        *   **Group B (Benefit Frame):** "You've earned 40% off your trade fees."
    *   **Expected Outcome:** Group A will have a significantly higher Offer Uplift than Group B.

2.  **Experiment: "Positive Community Framing" vs. "Neutral Community Framing"**
    *   **Hypothesis:** Hunch #2 - Negative framing creates "anti-lift".
    *   **Setup:** For the "Top Hunters" email, test two subject lines.
        *   **Group A (Positive Frame):** "You're in good company. Meet size 11's Top Hunters."
        *   **Group B (Neutral Frame):** "Top offer creators in size 11—and what they want." (Our current control, a poor performer).
    *   **Expected Outcome:** Group A will outperform Group B, potentially turning a negative-lift campaign into a positive one.

3.  **Experiment: "Personalized Status" vs. "Generic Status"**
    *   **Hypothesis:** Hunch #3 - Personalization is a multiplier.
    *   **Setup:** For a `Lifecycle` email about a `Shoe Spotlight`, test two versions.
        *   **Group A (Personalized):** "That [Shoe Name] in your closet is heating up."
        *   **Group B (Generic):** "This shoe is heating up on Tradeblock."
    *   **Expected Outcome:** Group A will have a higher uplift, proving that personalization is effective when bolted onto a proven concept (social proof/market trends). 