
# Project Brief: Email Hub Microsite

**Project Nickname:** Admin Hub

## 1. Project Goal
To build a centralized, two-page microsite that houses our email CSV generation tools and visualizes email campaign performance. This will streamline workflow efficiency and provide clear, actionable insights into the business impact of our email marketing efforts.

## 2. Business Context & The "Why"
Currently, our email operations rely on a set of powerful but disconnected scripts and data files. To generate a CSV for a campaign, a developer needs to manually run a script. To understand performance, we have to sift through JSON data. This is inefficient and makes it difficult to get a holistic view of what's working.

The Admin Hub will solve this by providing a simple, user-friendly web interface for two key functions:
1.  **On-demand CSV generation:** Empowering anyone on the team to create email audience CSVs without developer intervention.
2.  **Performance visualization:** Transforming raw data into a sortable, intuitive dashboard that makes it easy to see high- and low-performing campaigns at a glance.

This project puts crucial tools and insights directly into the hands of the team, enabling faster execution and more data-driven decisions.

## 3. Core Features & "What Done Looks Like"

### Page 1: Email CSV Generator
- **Functionality:** A user can select an email template type from a dropdown menu.
- **Inputs:**
    - The dropdown will be populated based on the `generate_[email-type]_csv.py` files in the `projects/email-csv-creation/` directory.
    - Upon selection, the UI will display a list of all data fields that will be in the generated CSV.
    - For templates requiring product IDs (like "single shoe feature" or "trending shoes"), a text input field will appear for the user to enter comma-separated product IDs.
- **Output:** A "Generate CSV" button that, when clicked, runs the corresponding backend script and allows the user to download the resulting CSV file.

### Page 2: Email Performance Dashboard
- **Functionality:** A visual feed of all email campaigns, styled to match the provided screenshot.
- **Data Source:** The page will be populated with data from `projects/email-impact/generated_outputs/microsite_campaign_data.json`.
- **Display:** Each campaign will be displayed in a "card" format, showing:
    - Campaign Subject, ID, Send Date, and Tags.
    - **Email Performance:** Audience Size, Open Rate, Click Rate, Total Clicks.
    - **Business Impact:** Offers Before, Offers After, Absolute Lift, Percentage Lift.
- **Interaction:** A view toggle will allow the user to sort the campaigns by:
    - **Chronological (Recent First):** Default view.
    - **Leaderboard (Best Performing):** Sorted in descending order by `Percentage Lift`.

## 4. Technical Stack & Deployment
- **Backend:** Flask
- **Frontend:** HTML, CSS, JavaScript (using Jinja2 for templating).
- **Architecture:** A standard, simple Flask application structure. Given the "clean slate" approach, we will build this from the ground up to be lightweight and maintainable.
- **Deployment:** The application must be configured for seamless deployment to Vercel. This includes a `vercel.json` file and a properly structured `requirements.txt`.

## 5. Success Criteria
- A fully functional Flask application that can be run locally.
- The CSV Generator page successfully generates and downloads CSVs for all available email types.
- The Performance Dashboard correctly displays and sorts all campaign data from the source JSON file.
- The final application is deployed to a Vercel URL and is fully operational. 