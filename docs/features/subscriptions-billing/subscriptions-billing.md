# Subscriptions and Billing (Frontend)

## Summary

Writers subscribe via Stripe checkout, manage plans, access the billing portal, and see subscription-required prompts when AI features are gated. Includes subscription plan listing and failed checkout handling.

## Scope

**In scope:** Subscription page, billing page, subscription cards, required modal, billing/subscription API clients, checkout redirect handling.

**Out of scope:** Stripe webhooks, backend subscription state sync, API usage limits admin.

## Primary responsibilities

- Present subscription plans and initiate Stripe checkout.
- Show billing portal link and current subscription status.
- Block or prompt unsubscribed users via `SubscriptionRequiredModal`.
- Handle subscription failed redirect route.

## Dependencies

- Backend `/api/stripe` and `/api/subscription` endpoints.
- Stripe Checkout redirect URLs configured in backend.

## How to navigate the code

- Pages: `src/Pages/Subscription/`, `src/Pages/Billing/`, `src/Pages/SubscriptionFailed/`
- Components: `src/component/Subscriptions/`, `src/component/Modal/SubscriptionRequiredModal.jsx`
- API: `src/api/billing.js`, `src/api/subscriptions.js`

## Open questions / gaps

- Subscription failed redirect route is configured for Stripe checkout error URL in backend.

Writer walkthrough of this UI: [`docs/user-guide/07-managing-your-subscription.md`](../../user-guide/07-managing-your-subscription.md).
