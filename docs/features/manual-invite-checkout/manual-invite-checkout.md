# Manual Invite Checkout (Superadmin)

## Summary

Superadmin-only "Manual Invites" tab inside the profile page. Lets staff pick a customer and a Builder/Studio plan, generate a Stripe Checkout link via the backend, and either copy the URL or email it to the customer with one click.

## Scope

- In scope: the Manual Invites tab UI (user search, plan selector, link result, copy + email actions), the two API client functions, and the user-list call used to populate the customer dropdown.
- Out of scope: the actual Stripe Checkout flow (handled by Stripe) and the post-payment webhook sync (backend).

## Primary responsibilities

- Render the tab only for `localStorage.role === 'superadmin'`.
- Debounce-search the admin user list (`POST /api/user/getAllUsers`) and paginate via "Load more".
- Load the configured Stripe price list (filtered subscription plans only) via `getPriceListFromStripeAPI`.
- Call `/api/stripe/admin/invite-checkout` to generate the link, render the URL with copy + open-in-new-tab affordances.
- Call `/api/stripe/admin/invite-checkout/email` to send the link via the standard transactional pipeline.
- Surface backend validation errors as toasts.

## Dependencies

- Backend: `manual-invite-checkout` feature on the BE.
- Feature: `user-profile` (host page) and `stripe-subscriptions` (the existing subscription-tab consumer of the same price-list API).
- Env: `REACT_APP_BASE_URL`.

## How to navigate the code

- `src/Pages/usertokendetails/ManualInvites.jsx` — the tab UI and orchestration.
- `src/Pages/usertokendetails/ManualInvites.css` — tab styles.
- `src/Pages/usertokendetails/usertoken.jsx` — tab registration (gated to superadmin via `isSuperAdmin`).
- `src/api/subscriptions.js` — `createManualInviteCheckoutAPI`, `sendManualInviteCheckoutEmailAPI`, plus reuses `getPriceListFromStripeAPI`.
- `src/api/user.js` — `getAllUsersAdminAPI` (paginated, searchable user list).

## Open questions / gaps

- The Stripe price list endpoint already filters to the four active subscription IDs on the BE, so legacy or one-time prices never appear in the dropdown. If we ever want to invite a customer to Simone via this flow, the BE allow-list (and this UI's wording) will need to be updated.
- Users with `status !== 'active'` are shown with their status appended in the dropdown — superadmins are trusted to decide whether to invite an unverified user.
