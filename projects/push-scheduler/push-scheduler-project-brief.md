# Project Brief: Push Scheduler

## 1. Project Goal
To enhance the `push-blaster` tool by adding the capability to draft, schedule, and manage push notifications in advance through a new calendar-based interface. This will shift push notifications from a reactive, ad-hoc task to a strategic, planned marketing channel.

## 2. Business Context & Problem
Currently, the `push-blaster` is a powerful tool for immediate sends, but it lacks the ability to plan campaigns. All pushes must be created and sent in real-time. This prevents us from preparing communications for future events, holidays, or specific times of day, limiting our marketing agility. We need a system that supports a "draft and schedule" workflow.

## 3. Key Deliverables

### A. "Schedule a Push" Workflow
A new mode in the "Make" tab that allows a user to define an audience, draft content, and save it for a future send without immediately generating the user list or sending the notification.
- **Save Audience Criteria:** The ability to save the *rules* of an audience (e.g., "active in last 30 days, has 5+ trades") without creating the final CSV.
- **Draft Push Notification:** A modified send interface focused on saving the draft with a scheduled time, not blasting it immediately.

### B. "Calendar" Tab
A new top-level tab that provides a visual, calendar-based interface (with weekly and monthly views) of all scheduled push drafts. This serves as the central hub for managing upcoming communications.

### C. Push Draft Details Modal
An interactive modal, launched from a calendar event, that serves as the "pre-flight" screen for a scheduled push.
- **View Details:** Displays the saved audience criteria and drafted content.
- **Edit Content:** Allows for last-minute changes to the notification title, body, and deep link.
- **On-Demand Audience Generation:** Triggers the final audience generation based on the saved criteria *at the moment the user decides to send it*.
- **Send Controls:** Provides the final "Blast It!" and "Dry Run" controls after the audience is generated.

## 4. Success Criteria
- A user can successfully create, schedule, and save a push notification draft.
- The draft appears correctly on the new "Calendar" tab at the specified date and time.
- From the calendar, a user can open a draft, edit its content, generate a fresh audience based on the saved criteria, and successfully send the push.
- The existing "Push Now" functionality remains untouched and fully functional.
- The final implementation is intuitive and requires minimal user training.
