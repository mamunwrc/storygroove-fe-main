# 7. Managing your subscription

Billing lives in **My Account → Subscription**. Prices on this tab come live from Stripe. The marketing site can lag; treat this tab as the amount you will actually pay.

There is no self-serve signup form. New accounts are created after Stripe Checkout succeeds (see [Getting started](01-getting-started.md)). This chapter is for people who are already in the app.

## What you see

**Payment method** (if Stripe already has a customer for you): brand, last four digits, expiry. **Update card** opens a Stripe card form. *Card details are entered securely through Stripe and never stored on StoryGroove servers.* **Save new card** applies to **future** charges only.

Below that, either the three-step funnel (no Builder/Studio yet) or your coaching cards plus pause/cancel.

### Funnel (no Builder/Studio yet)

1. **Starter Edition** — **Get Your Story Starter Kit With SimoneAI®** ($7 one-time). Hidden / **Included in your plan** once you have Builder or Studio.
2. **StoryGroove Coaching System Membership** — one-time studio entry fee, added automatically the first time you buy Builder or Studio. Returning members are not charged again (*Already included on your account — no additional fee required*).
3. **Choose Your Coaching Team**
   - **Builder Edition** — Simone + Olivia
   - **Studio Edition** — Simone + Olivia + Ellis

Buttons: **Choose Monthly** / **Choose Yearly**, or **Upgrade** / **Downgrade** once you have a plan.

Checkout for a first membership shows two line items (plan + membership) and the Stripe agreement: membership is one-time; the subscription renews and is non-refundable.

## Upgrade

Pick a higher tier or a yearly price on a monthly plan. Confirm on Stripe's side as prompted. Access changes **immediately** (prorated invoice). Toast: *Subscription upgraded successfully!*

Builder → Studio is how you unlock Ellis without leaving the app. Olivia and Ellis purchase modals also jump you here.

## Downgrade

Pick a lower tier or monthly after yearly. The price swap does **not** invoice a proration. Toast: *Subscription downgraded successfully!* Studio → Builder removes Ellis; existing Ellis projects stay in **My Work** but Ellis tools will ask you to upgrade again.

Switching monthly ↔ yearly is an upgrade or downgrade, not a billing-frequency toggle.

## Pause

**Pause Subscription** confirms:

> Need to take a break? Life happens. Pause for $19/month to preserve your workspace and novel progress for up to three months per calendar year. Access to your AI editorial team, project library, and private community will be placed on hold until you reactivate your membership.

**Note (Sep 2026):** this is the current product copy. Pause is **three months** per calendar year, and **private community access is on hold** while paused. Earlier docs said six months and that community stayed open.

After pause, the Subscription tab shows: *Your subscription is paused. Your workspace and past work are locked until you resume. Simone, Olivia, and Ellis are on hold.*

You can still open the dashboard hub and **My Account**. Opening a project redirects here: *Your subscription is paused. Resume billing to access this page.*

**Resume Subscription** restores the Builder or Studio plan you paused from. Toast: *Subscription resumed. Your Builder or Studio plan is active again.*

## Cancel

**Cancel Subscription** confirms:

> You'll keep access through the end of your current billing period. After your subscription ends, your workspace, project materials, and novel progress will be deleted. Want to keep your workspace for later? Use Pause Mode instead.

Cancellation is **at period end**. Toast: *Your subscription is set to cancel at the end of your billing period. You'll keep full access until then.* The plan button may read **Active until {date}**.

When the period ends, the dashboard treats you like a cancelled subscriber: coaches and past work lock until you **Re-subscribe**. Prefer **Pause** if you want the option to come back without buying a brand-new membership decision.

## $7 kit from inside the app

Same **Get Your Story Starter Kit With SimoneAI®** button. Stripe Checkout, then a new Simone credit. If you already have Builder/Studio, the button reads **Included in your plan**.

## Banners you may see

| Situation | Dashboard copy | What to do |
|---|---|---|
| Paused | *Your subscription is paused.* Past work and coaches are locked. | **Manage billing** → **Resume Subscription** |
| Cancelled (access ended) | *Your subscription has been cancelled.* | **Re-subscribe** on a coaching card |
| Cancelled but still in paid period | *Your subscription has been canceled — you still have full access until {date}.* | Keep writing, or pick a plan to continue after that date |
| Checkout abandoned / card declined | **Payment Failed** at `/subscriptionfailed` | **Go back home** and try again. Nothing was created if this was a brand-new checkout. |

Failed recurring invoices do not currently show a dedicated dashboard banner. If a renewal fails, update the card under **Payment method** and retry from Stripe's email if you received one.

## Invited checkout

If staff emailed **You're invited to subscribe to StoryGroove**, **Start my subscription** is Stripe Checkout tied to your email. After payment you go to the dashboard rather than the welcome-and-verify page (the account already exists).

---

Previous: [EllisAI®](06-ellis-manuscript-review.md) · Next: [Troubleshooting](08-troubleshooting.md)
