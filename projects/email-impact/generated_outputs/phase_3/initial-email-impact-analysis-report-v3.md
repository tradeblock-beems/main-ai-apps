# Email Impact Analysis Report v3

## 1. Executive Summary

This report analyzes our "Core Impact" email campaigns—our highest-confidence mass sends and winning A/B test variants—to distill clear, actionable insights on what drives Offer Creation Uplift. It also includes a summary of learnings from our A/B Test Lab.

### Clear Correlations (High-Confidence Findings)

1.  **Status & Recognition Outperform Financial Incentives:** The data unequivocally shows that emails reinforcing a user's status in the community are our most powerful tool. Campaigns framed as a `Congratulatory` reward for achieving a milestone (like `Trusted Trader` status) generate massive uplift. In contrast, simple `Financial Benefit` framing (e.g., fee discounts) performs poorly with the general population.
    *   **Example (Effective):** The `Lifecycle` campaign with the subject _"Congrats–You’re a Trusted Trader 👟🤝"_ was a top performer. It celebrates a user's achievement, making them feel recognized.
    *   **Example (Ineffective):** The `Promotional` email _"Save $20 on EVERY future trade..."_ had a much lower impact because it frames the value as a simple discount, not a reward.

2.  **Negative & Frictional Framing Actively Hurts Performance:** Campaigns that use `Pain Point Agitation` or highlight negative social proof consistently result in negative offer uplift. Reminding users of friction (like dealing with "DS-only" traders) or what they're missing out on appears to actively disengage them from the platform.
    *   **Example (Ineffective):** The subject line _"Done with “I only trade for DS” replies?"_ was one of our worst performers. It surfaces a negative aspect of the user experience right in the inbox.

### Top 3 Theories & Hunches

1.  **The "Status Game" is Everything:** Our most successful emails feel less like marketing and more like notifications from a game where users are leveling up. We theorize that users are primarily motivated by achieving and maintaining status, and our emails should be crafted as updates on their "in-game" progress.
2.  **Generic "Community" Messaging is Too Vague:** The `Community` playbook, as currently executed, is ineffective. We believe this is because broad `Social Proof` (e.g., "See what's hot") is less compelling than direct, personal recognition. The playbook could be salvaged by integrating it with `Status` concepts.
3.  **Personalization is a Multiplier, Not a Driver:** Personalization only works when it enhances an already strong message. Sending a personalized email with a weak premise (e.g., a generic `Community` message) performs poorly. But personalizing a strong premise (like a `Status` update) could be a massive amplifier.

### Key Recommendations

1.  **Re-frame All Rewards as Status Achievements.**
    *   **Rationale:** The data shows `Congratulatory` framing is our most potent strategy. We should stop "giving" discounts and start "awarding" them as symbols of status.
    *   **Example:** Instead of "Save 20% on fees," the message becomes "You've unlocked the Pro Tier fee structure. Congrats." This transforms a financial benefit into a status symbol.

2.  **Evolve the `Community` Playbook to Focus on "Aspirational Status".**
    *   **Rationale:** The `Community` playbook fails because it's too generic. We should evolve it to show users a clear path to higher status.
    *   **Example:** Rework the "Top Hunters" email. Instead of just showing who is at the top, frame it as a leaderboard and add a CTA like, "Here's how you can become a Top Hunter in your size."

3.  **Launch a "Personalized Status" Experiment.**
    *   **Rationale:** We need to test the hypothesis that personalization is a multiplier for status-driven messages.
    *   **Example:** Create an A/B test for a "Shoe Spotlight" email.
        *   **Group A (Generic):** "The Air Jordan 4 is heating up this week."
        *   **Group B (Personalized Status):** "That Air Jordan 4 in your closet is one of the hottest shoes on the block right now."

---

## 2. A/B Test Lab: Key Learnings

Our A/B tests have provided valuable insights into what captures attention in the inbox.
*   **Urgency Works (Sparingly):** Subject lines that create a sense of urgency (e.g., "you're so close") have consistently won their A/B tests, suggesting it's a powerful motivator for specific, time-sensitive actions.
*   **Benefit-Oriented Questions Win:** Subject lines that pose a direct question about a benefit (e.g., "Save $20 on EVERY future trade?") outperform declarative statements.
*   **Emojis Add Signal:** Winning subject lines often use emojis to add visual punctuation and emotional tone, from the "fire" emoji for hype to the "eyes" emoji for intrigue.

---

## 3. Detailed Findings: Core Impact Campaigns

### 3.1. Performance by `playbook_type`

The `Lifecycle` playbook, which is inherently tied to a user's specific journey and achievements, is the undisputed champion. This confirms that emails acting on user behavior are far more effective than generic broadcasts.

| Playbook Type | Average Offer Uplift (%) | Campaign Count | Audience Size (Avg) |
|---|---|---|---|
| `Lifecycle` | 337.04 | 5 | 2,100 |
| `Promotional` | -3.87 | 4 | 5,050 |
| `Product Update`| -5.12 | 1 | 3,552 |
| `Community` | -11.41 | 3 | 1,587 |

### 3.2. Performance by `framing`

The story remains consistent: `Congratulatory` framing that makes users feel good about their activity on the platform drives massive engagement.

| Framing | Average Offer Uplift (%) | Campaign Count | Audience Size (Avg) |
|---|---|---|---|
| `Congratulatory`| 478.78 | 4 | 2,122 |
| `Financial Benefit`| -19.09 | 5 | 3,500 |
| `Pain Point Agitation`| -23.77| 2 | 4,012 |

---
## 4. Top 5 & Bottom 5 Performing Core Impact Campaigns

### Top 5 Performers (Excluding Trusted Trader Campaigns)
This list provides the definitive, correctly filtered view of our top-performing repeatable campaigns. It excludes all A/B test variants and campaigns related to the Trusted Trader program. The results are sobering: outside of major status-based lifecycle moments, **our mass-send campaigns are not driving positive offer uplift**, even when they are the "winner" of an A/B test. This is a critical insight for our future strategy.

| Uplift (%) | Audience | Subject                                      | Key Tags                                     |
|------------|----------|----------------------------------------------|----------------------------------------------|
| 25.62      | 19056    | Top offer creators in size 11—and what they want | `Community`, `Top Hunters`, `Social Proof`   |
| -14.39     | 42323    | Heat check inside. 🔥                        | `Transactional`, `Shoe Spotlight`            |
| -19.10     | 41064    | Throwback Thursday: The Pine Green SB4 is still cookin’ 🔥 | `Promotional`, `Shoe Spotlight`              |
| -22.93     | 41029    | Done with “I only trade for DS” replies?     | `Community`, `Community Norms`, `Pain Point Agitation` |
| -47.19     | 42373    | Tradeblock just got an upgrade 👀 - see what’s new | `Product Update`, `New Feature`, `Informational` |


### Bottom 5 Performers
The worst performers highlight friction, use generic social proof, or announce product updates with no immediate, compelling user benefit.

| Uplift (%) | Audience | Subject | Key Tags |
|---|---|---|---|
| -77.22 | 5117 | Done with “I only trade for DS” replies? | `Community`, `Community Norms`, `Pain Point Agitation` |
| -35.29 | 1591 | Who’s most active in your size? ... | `Community`, `Top Hunters`, `Social Proof` |
| -32.37 | 3555 | Tired of DS-only traders? Let’s change that. | `Community`, `Community Norms`, `Pain Point Agitation` |
| -14.73 | 3552 | Tradeblock just got an upgrade 👀 - see what’s new | `Product Update`, `Informational` |
| -10.00 | 1598 | Size 9's Top Hunters: Who’s making moves? | `Community`, `Top Hunters`, `Social Proof` | 