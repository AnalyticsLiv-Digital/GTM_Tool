GTM Automation — Proof of Concept
1. Overview
GTM Automation is a web-based automation platform designed to streamline Google Tag Manager (GTM) workspace operations.
Provides centralized management of accounts, containers, workspaces, tags, triggers, variables, and templates.
Supports safe export/import automation with dependency handling.
Reduces manual effort and improves governance for GTM deployments.
2. Access & Onboarding
2.1 Authentication
Login through a secure authentication flow. APIs are protected and accessible only for authenticated users.
2.2 User Journey
User logs in through the GTM Automation login screen.
On successful login, the user lands on the dashboard.
Dashboard provides modules for Accounts, Containers, Workspaces, Tags, Triggers, Variables, Templates, and Export utilities.
2.3 Core Design Principle
The platform enforces workspace-based workflows and avoids unsafe direct edits in Default workspace.
3. Core Modules
Sr.No.
Module
Status
1
Account / Container / Workspace Management
Production-ready
2
Export Tags with Dependencies
Production-ready
3
Export Triggers / Variables / Templates
Production-ready
4
Workspace CRUD inside Export Modals
Implemented
5
Healthcheck / Best Practices Audit
Production-ready
6
PDF Report Generation
Implemented
7
Authentication (Email/Password & OAuth)
Production-ready
8
Account Security & Rate Limiting
Production-ready
9
Theme Support (Dark/Light Mode)
Implemented
10
Legal Pages (Privacy Policy, Terms)
Implemented


4. Module 1 — GTM Account / Container / Workspace Management
4.1 Objective
Provide a unified interface to browse and manage GTM hierarchy: Account → Container → Workspace.
4.2 Capabilities
Fetch list of GTM accounts available to the authenticated user.
Fetch containers based on selected account.
Fetch workspaces based on selected container.
Maintain selected account/container/workspace globally in dashboard store.
4.3 Workflow
Step
Action
Outcome
1
Select Account
Loads containers
2
Select Container
Loads workspaces
3
Select Workspace
Loads tags, triggers, variables, templates


5. Module 2 — Workspace CRUD (Embedded in Export Flow)
5.1 Objective
Allow workspace creation and deletion directly inside export modals and enforce governance rules.
5.2 Key Features
Create Workspace inside export modal.
Delete Workspace inside export modal.
Maximum 3 workspaces allowed (enforced).
Warning message shown when limit is reached.
5.3 Workflow
Step
Action
1
Select Account and Container
2
View workspace list
3
Create a new workspace (if limit not reached)
4
Select a workspace for export
5
Optionally delete an old workspace


6. Module 3 — Export Tags with Dependency Handling
6.1 Objective
Export selected tags from one workspace to another while handling all required dependencies.
6.2 Dependency Model
Triggers (firing and blocking trigger IDs)
Variables referenced inside parameters
Custom templates referenced by tags
6.3 Dependency UI Requirements (Option A)
UI displays dependencies grouped by tag: Tag → Triggers → Variables → Templates.
User can uncheck dependencies.
If user unchecks a required dependency, show warning: 'Tag may fail if dependency not exported'.
Export is still allowed.
7. Export Pipeline Design
7.1 Export Order
Order
Entity
1
Templates
2
Variables
3
Triggers
4
Tags


8. Tag Export Rules
8.1 Duplicate Handling
Variables retry by appending _1, _2, etc.
Triggers retry by appending _1, _2, etc.
Tags retry by using TagName, TagName(1), TagName(2), etc.
8.2 GA4 Tag Special Handling
GA4 Config tags are exported first.
GA4 Event tags are exported after config tags.
GA4 Event tags update configTag reference to new destination config tag ID.
9. Template Export Rules (Custom Templates)
9.1 Objective
Support exporting custom templates referenced by tags.
9.2 How It Works
Fetch template from source workspace.
Check destination templates for existing template name.
Create template if missing.
Store templateId mapping for tag export.
9.3 CVT Tag Mapping
Custom templates follow GTM type format: cvt_<containerId>_<templateId>. During export, the system maps source templateId → destination templateId and reconstructs tag type.
10. Export Triggers and Variables
10.1 Trigger Export
Triggers are created if missing.
Trigger mapping is maintained: sourceTriggerId → destinationTriggerId.
Mapping is used to rewrite tag trigger references.
10.2 Variable Export
Variables are created if missing.
Existing variables are not overwritten.
Exported only when selected in dependency modal.
11. Export Modal UX Design
11.1 Modal Layout
Left Panel: Selected tags list + tag type summary.
Right Panel: Destination selector + embedded workspace CRUD.
11.2 Destination Selection
Account
Container
Workspace
11.3 Confirm Dialog
Before export starts, the system prompts confirmation showing selected tag count and clarifies that existing items are not modified.
12. Progress Tracking
12.1 Objective
Export operations can be long-running and require continuous feedback.
12.2 Progress Counters
Templates total/done
Variables total/done
Triggers total/done
Tags total/done
12.3 Toast Updates
A persistent toast displays real-time export progress updates.
13. Error Handling & Retry Strategy
13.1 Retry Scenarios
429 (Rate limit)
502, 503, 504 (Server failures)
Quota exceeded errors
Backend internal errors
13.2 Retry Strategy
Implements exponential backoff retries with maximum threshold.
14. Cross-Cutting Platform Features
14.1 Dashboard Store
Maintains selected Account ID, Container ID, Workspace ID centrally.
Ensures smooth navigation between entity pages.
14.2 Entity List Pages
Tags/Triggers/Variables/Templates follow consistent UI patterns with export actions available.
14.3 Workspace Governance
Workspace limit rule enforces clean workflow and avoids excessive workspace clutter.
15. Reporting & PDF Output
15.1 Objective
Generate structured export reports for tracking changes and audit purposes.
15.2 Report Contents
Exported tags list
Exported triggers list
Exported variables list
Exported templates list
Failures and summary counts


16. Module 4 — Authentication (Email/Password & OAuth)
16.1 Objective
Provide secure user authentication with multiple authentication methods (email/password and Google OAuth).
16.2 Authentication Methods
Email/Password Authentication
Traditional login with email and password.
Rate-limited sign-up and login endpoints.
Password hashing using bcrypt.
Secure token generation and validation.
Google OAuth
OAuth 2.0 integration with Google.
Automatic user creation on first login.
Support for multi-scope authentication (GTM API access + profile access).
16.3 Key Features
JWT-based session tokens stored in secure HTTP-only cookies.
CSRF protection on all authentication routes.
Email normalization (lowercase, trimmed).
Support for Google Account picture and profile data.
User profile retrieval endpoint.
Logout functionality with token clearance.
16.4 OAuth Scopes Requested
openid
email
profile
https://www.googleapis.com/auth/tagmanager.edit.containers
https://www.googleapis.com/auth/tagmanager.delete.containers
16.5 Workflow — Email/Password Authentication
Step
Action
Outcome
1
User enters email and password
Validates input format
2
System checks for existing user
Returns error if user exists (during signup)
3
Password is hashed and stored
User account is created
4
JWT token is generated
Session is established
5
Token is set in HTTP-only cookie
User is redirected to dashboard


16.6 Workflow — Google OAuth
Step
Action
Outcome
1
User clicks "Login with Google"
Redirected to Google consent screen
2
Google returns authorization code
System exchanges code for access token
3
System fetches user profile from Google
Profile picture and email are stored
4
User record is created or retrieved
JWT token is generated
5
User is redirected to dashboard
GTM API access is enabled


17. Module 5 — Account Security & Rate Limiting
17.1 Objective
Protect user accounts and API endpoints from abuse and unauthorized access.
17.2 Security Features
Failed Login Tracking
Tracks failed login attempts per user.
Account locks after 3 consecutive failures.
Locked account requires 15-minute cooldown.
Failed login counter resets on successful login.
Rate Limiting
Login endpoint: 10 attempts per 60 seconds per IP.
Sign-up endpoint: 5 attempts per 60 seconds per IP.
Health check and other API endpoints protected with rate limits.
Returns 429 (Too Many Requests) when limit exceeded.
CSRF Protection
CSRF token validation on all state-changing requests.
Same-origin verification on authentication endpoints.
17.3 Account Lock Mechanism
Failed Login Attempt
Counter increments
After 3 failed attempts
Account is locked with 15-minute timeout
Lock Status Check
On next login attempt, system verifies lockedUntil timestamp
If current time < lockedUntil, login is rejected
After timeout expires, user can retry
17.4 Database Fields for Security
failedLoginAttempts: Number of consecutive failed login attempts
lockedUntil: Timestamp when account lock expires
lastLoginAt: Timestamp of most recent successful login


18. Module 6 — Healthcheck & Best Practices Audit (Production-Ready)
18.1 Objective
Audit GTM workspace configurations for best practices, detect anomalies, and provide actionable recommendations.
18.2 Health Check Rules
The system runs multiple validation rules on GTM data:
Rule Categories
Naming conventions (tags, triggers, variables follow standards)
Duplicate detection (duplicate names/configurations)
Unused entities (unreferenced items in workspace)
Firing trigger validation (tags with invalid triggers)
Variable reference validation (missing variable references)
Blocking trigger analysis (improper blocking trigger setup)
Container configuration review
18.3 Health Check Score
Score Calculation
score = (passed_checks / total_checks) × 100
Ranges: 0-100 (percentage)
Higher score = Better health status
18.4 Audit Output
Each health check returns:
score: Overall health score (0-100)
passedCount: Number of passed checks
failedCount: Number of failed checks
results[]: Array of individual check results with:
name: Check name
description: What was checked
passed: Boolean pass/fail status
severity: Critical, Warning, or Info
affectedItems[]: List of problematic entities with links to GTM editor
18.5 Affected Items Structure
For each failed check, affected items include:
name: Entity name
id: Entity ID
url: Direct link to entity in GTM UI
type: Entity type (tag, trigger, variable)
details: Specific failure reason
18.6 Workflow
Step
Action
Outcome
1
User navigates to Healthcheck page
System loads selected workspace data
2
User triggers audit
Health check engine evaluates all rules
3
Results are compiled
Score and detailed findings are displayed
4
User reviews failed checks
Affected items are linked to GTM editor
5
User can fix issues directly
Changes persist in GTM


19. Module 7 — Theme Support (Dark/Light Mode)
19.1 Objective
Provide user-configurable theme options for improved accessibility and user experience.
19.2 Features
Theme Toggle Component
Quick toggle button in navigation (Moon/Sun icons).
Accessible theme switching without page reload.
Persistent Theme Preference
Theme preference is saved to local storage.
Theme is restored on next session.
Default theme respects system preferences.
Tailwind CSS Integration
Entire UI uses Tailwind dark: prefix for dark mode styling.
Colors and contrast automatically adjust.
19.3 Supported Themes
Light Mode
Light backgrounds
Dark text
Optimized for daytime use
Dark Mode
Dark backgrounds
Light text
Reduced eye strain for low-light environments
19.4 Theme Implementation
System Preference Detection
Browser detects prefers-color-scheme media query
Respects OS-level theme setting on first load
Manual Override
User can toggle theme at any time
Selection overrides system preference
Persistence
localStorage stores user's theme choice
Theme is applied immediately on next visit


20. Module 8 — Legal Pages
20.1 Objective
Provide transparent legal documentation for platform governance and user rights.
20.2 Legal Documents
Privacy Policy Page
Describes data collection practices
Explains user data usage and storage
Details third-party integrations (Google OAuth, GTM API)
Explains cookie usage for authentication
Includes GDPR and privacy compliance information
Terms of Service Page
Outlines user obligations and rights
Describes acceptable use policies
Covers liability limitations
Includes IP and content policies
20.3 Page Features
Fully responsive design
Dark/Light mode support
Accessible typography and layout
Copy-paste friendly formatting
Links to related legal documents


21. Module 9 — Error Handling & UI Safety
21.1 Objective
Gracefully handle application errors and provide clear user feedback.
21.2 Error Boundary Component
Catches unhandled React component errors
Displays user-friendly error messages
Prevents white-screen crashes
Logs errors for debugging
Provides fallback UI with recovery options
21.3 Dialog Host System
Centralized modal management
Multiple modal stacking support
Keyboard navigation (Esc to close)
Backdrop click to dismiss
Focus management and accessibility
21.4 Skeleton Loading States
Placeholder UI during data fetching
Smooth transitions to loaded content
Improves perceived performance
Prevents layout shift
21.5 Error Notifications
Toast-based error/success messages
Auto-dismiss after 5 seconds
User can manually dismiss
Color-coded by message type (error, success, info)
Position: bottom-right corner
21.6 API Error Handling
4xx Client Errors: Validation errors, malformed requests
5xx Server Errors: Internal errors with retry capability
Network Errors: Connection failures with fallback UI
GTM API Errors: Rate limits, quota exceeded with retry logic


22. Architecture
22.1 Stack
Layer
Technology
Frontend
Next.js (App Router) + React + TypeScript
UI Styling
TailwindCSS
State Management
Zustand
Icons
lucide-react
Notifications
react-toastify
PDF Generation
jsPDF + jsPDF-AutoTable
Backend APIs
Next.js API Routes
GTM Integration
Google Tag Manager API
Database
MongoDB
Authentication
JWT + Secure Cookies + Google OAuth
Security
bcryptjs (password hashing), CSRF protection, Rate limiting


23. Async Export Pattern
Frontend triggers export using API endpoints.
Export is executed sequentially: templates → variables → triggers → tags.
Progress is tracked in UI state.
Failures are collected and displayed at completion.


24. Security Considerations
Authentication required for all GTM API routes.
Sensitive GTM data is not exposed publicly.
Delete operations require confirmation.
Workspace modifications are gated through UI validation.
Account security features prevent unauthorized access (rate limiting, account locks).
CSRF protection on all sensitive operations.
Password hashing with bcrypt for email/password auth.
Secure HTTP-only cookies for session tokens.
OAuth tokens are refreshed transparently for uninterrupted API access.


25. Performance Summary
Operation
Typical Time
Load Accounts
< 2 seconds
Load Containers
< 2 seconds
Load Workspaces
< 2 seconds
Export Variables
0.5–1 sec each
Export Triggers
0.5–1 sec each
Export Tags
1 sec each
Full Export (20 tags with dependencies)
~1–3 minutes
Health Check Audit
2-5 seconds
OAuth Login
3-5 seconds (includes Google redirect)


26. Benefits
Eliminates repetitive manual GTM setup work.
Makes exporting tags across containers fast and reliable.
Reduces human errors in dependency handling.
Supports structured workspace governance.
Improves collaboration between developers and marketing teams.
Provides export visibility with dependency listing and reporting.
Secure authentication with multiple methods (email/password and OAuth).
Account security prevents unauthorized access and abuse.
Health check audit identifies configuration issues proactively.
Dark/Light mode for improved user experience and accessibility.
Clear legal documentation for compliance and transparency.
Graceful error handling with user-friendly feedback.
Comprehensive audit trail with health scores for workspace quality.


27. Current Limitations (POC Stage → Production)
Limitation
Description
Mitigation
API rate limits
Google API may throttle export requests
Retry system + backoff
Dependency resolution
Some variable references may be indirect
Manual selection option
No overwrite support
Existing destination entities are not updated
Export creates missing only
Workspace limit enforced
Max 3 workspace rule
User deletes unused workspaces
Large exports
Huge exports may take longer
Progress tracking + toast
Health check indirect references
Some variable references in custom code not detected
Manual validation recommended
OAuth token refresh
Requires periodic refresh for long sessions
Automatic refresh implemented


28. Roadmap
Near-Term
Improve dependency detection for deeper variable references.
Add bulk export option (multi-entity export).
Better UI summary of export plan before execution.
Improved failure reporting with per-entity error details.
Enhanced health check rules for complex scenarios.
Medium-Term
Full GTM Healthcheck engine integration (naming, duplicates, unused items).
Workspace comparison tool (source vs destination).
Workspace backup export before applying changes.
User preference sync (theme, language).
Two-factor authentication (2FA) support.
Long-Term
Automated migration system (Dev → QA → Prod workflow).
Versioned export history.
Scheduled exports and automation pipelines.
AI-powered optimization recommendations.
Advanced audit logging and compliance reporting.


29. Conclusion
GTM Automation is a production-ready platform for automating GTM exports safely with dependency control, workspace governance, and export reporting. The platform combines secure authentication, comprehensive health check audits, granular access control, and user-friendly error handling to provide a reliable solution for GTM teams. Multiple export modalities, theme support, and clear legal documentation make it accessible and trustworthy for enterprise environments.

