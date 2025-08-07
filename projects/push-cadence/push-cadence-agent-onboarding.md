# Push Cadence Management System - Agent Onboarding

Welcome to the **Push Cadence Management System** project team! 🎯

## Mission Overview

You're joining a critical initiative to build intelligent notification cadence management that prevents user fatigue while maintaining engagement effectiveness. This system will track every push notification sent to individual users and automatically filter audiences based on smart cadence rules, ensuring we respect user attention while maximizing notification impact.

## Your Role & Purpose

### `@cadence-engine` - Cadence Engine Specialist
You are responsible for building the core intelligence of our notification system:
- **Rule Engine:** Implement the 72-hour Layer 3 cooldown and 7-day rolling window limits
- **Filtering Logic:** Build sub-5-second audience filtering for 10k+ users
- **Performance:** Optimize database queries and rule evaluation for production scale
- **Architecture:** Design the backbone that will eventually support email and SMS tracking

### `@notification-tracker` - Notification Tracker Specialist  
You are responsible for comprehensive user interaction tracking:
- **Data Pipeline:** Capture every notification event with complete auditability
- **Integration:** Seamlessly embed tracking into existing push-blaster workflows
- **Historical Data:** Build tools to restore notification history from existing logs
- **Database:** Set up and optimize Neon.tech PostgreSQL for scalable user tracking

### `@dev-hub-dev` - Integration & Frontend Specialist
You are responsible for seamless push-blaster integration:
- **UI Enhancement:** Add layer classification radio buttons to the drafting interface
- **Workflow Integration:** Embed filtering and tracking without disrupting existing operations
- **User Experience:** Ensure operators receive clear exclusion reporting and guidance
- **Quality Assurance:** Maintain the high standard of the existing push-blaster experience

## Strategic Context

**Business Impact:** This project directly protects our promotional channel effectiveness by preventing user notification fatigue. Poor cadence management can reduce engagement and damage our relationship with users.

**Technical Foundation:** We're building the foundation for a comprehensive CRM-like system. While we're starting with push notifications, this architecture will eventually support email, SMS, and other engagement channels.

**Integration Philosophy:** This is a new microservice that must integrate so seamlessly with push-blaster that operators barely notice the change, yet gain powerful new capabilities.

## Key Success Metrics

1. **100% Layer Classification:** Every push notification must be tagged before sending
2. **Automatic Filtering:** Audiences filtered based on cadence rules without manual intervention  
3. **Performance:** Sub-5-second response time for audience filtering operations
4. **Zero Disruption:** Existing push-blaster workflows remain smooth and intuitive
5. **Clear Reporting:** Operators understand how many users were excluded and why

## Layer Classification System

**Layer 1 - Platform-Wide Moments:** Critical announcements, drops, feature launches
- *No restrictions* - these are time-sensitive and critical

**Layer 2 - Product/Trend Triggers:** Highly traded shoes, wishlist spikes, market alerts
- *Subject to 7-day rolling window* - max 3 Layer 2+3 notifications per user per week

**Layer 3 - Behavior-Responsive:** Recent intent signals (offers, wishlists, unclaimed opportunities)  
- *72-hour cooldown* - users cannot receive Layer 3 notifications within 72 hours of their last Layer 3
- *Subject to 7-day rolling window* - counts toward the 3-notification weekly limit

## Technical Architecture

**Database:** Neon.tech PostgreSQL for scalable user notification tracking
**Microservice:** New standalone service with tight push-blaster integration  
**Performance:** Optimized for high-volume user tracking and real-time filtering
**Future-Ready:** Designed to support multi-channel expansion (email, SMS)

## Required Reading

Please familiarize yourself with:
1. **`@push-cadence-project-brief.md`** - Complete strategic context and requirements
2. **`@push-cadence-execution-checklist.md`** - Detailed implementation plan and your specific responsibilities
3. **Existing Push-Blaster Code** - Understand current notification infrastructure (apps/push-blaster/)
4. **Technical Standards** - Review `@technical-standard-approaches.md` for established patterns

## Collaboration Protocol

- **Primary Ownership:** Each phase has a designated primary owner who drives execution
- **Support Roles:** Other agents provide expertise and review as needed
- **Integration Handoffs:** Coordinate carefully when your work intersects with other agents
- **Quality Gates:** Each phase must pass conductor review before proceeding

## Critical Success Factors

1. **Seamless Integration:** Users should barely notice the change to their workflow
2. **Performance First:** Audience filtering must never slow down notification sending
3. **Data Integrity:** Every notification must be tracked accurately and reliably
4. **Rule Accuracy:** Cadence filtering must work correctly across timezones and edge cases
5. **Operational Transparency:** Operators need clear visibility into filtering decisions

## Getting Started

1. **Review** the complete project brief to understand strategic context
2. **Study** your section of the execution checklist to understand your specific deliverables  
3. **Examine** existing push-blaster codebase to understand integration points
4. **Plan** your approach for seamless integration with existing workflows

---

**Now begin executing against the execution checklist.** Your expertise is crucial to building a notification system that respects user attention while maximizing engagement effectiveness. Let's create something that sets the standard for intelligent user communication! 🚀