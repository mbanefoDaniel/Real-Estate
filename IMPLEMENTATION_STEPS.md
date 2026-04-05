# Christoland Implementation Steps

## Phase 1: Identity and Access
1. Create account and sign in flows.
2. Persist secure session cookie.
3. Add role-based access (`USER`, `ADMIN`).
4. Remove manual admin key entry from UI.

## Phase 2: Listing Ownership and Moderation
1. Require signed-in owner to create/edit/delete own listings.
2. Restrict approval/rejection to admin role.
3. Keep owner edits from directly marking listings approved.
4. Auto-scope `My Listings` to current user session.

## Phase 3: Lead Operations
1. Show admin-only lead inbox for all leads.
2. Add owner-scoped lead views and updates.
3. Track lead statuses (`NEW`, `CONTACTED`, `CLOSED`).
4. Add assignment and follow-up timestamps.

## Phase 4: Account Recovery and Security
1. Add forgot password request.
2. Add reset password token flow.
3. Enforce password policy and token expiry.
4. Add rate limiting for auth endpoints.

## Phase 5: Business and Trust Features
1. Saved listings and saved searches.
2. Inspection scheduling.
3. Verification badges and document review.
4. Paid featured listings (Paystack/Flutterwave).

## Phase 6: Production Readiness
1. Monitoring and error tracking.
2. Automated backups and restore drills.
3. CI checks for lint/build/tests.
4. End-to-end tests for auth, listing, leads, and moderation.

## Phase 7: Notifications and Communication
1. Send listing owner email on new lead submission.
2. Send owner email when admin approves or rejects a listing.
3. Send password reset email with secure reset URL.
4. Configure SMTP variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`).