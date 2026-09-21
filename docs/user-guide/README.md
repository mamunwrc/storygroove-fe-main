# Story Groove — User Guide

The complete journey through Story Groove, from the public marketing site to a finished, exported manuscript. This is the canonical customer-facing walkthrough: support can send sections of it to writers, and the team can use it as the reference for what the product is supposed to do at each step.

The backend counterpart to this guide lives in the API repository at `docs/user-guide/`. It documents the same journey from the system side (endpoints, account states, emails, entitlement checks) and is the right place to look when you need to diagnose a stuck user rather than instruct one.

## The three surfaces

Story Groove spans three deployed applications. Writers experience them as one product, but they are separate codebases:

| Surface | Repository | What lives there |
|---|---|---|
| Marketing site | `storygroove-creative-flow` | Homepage, pricing, legal pages, the buttons that open Stripe Checkout |
| The app | `storygroove-fe` (this repo) | Everything after payment: verification, login, dashboard, the three coaches, account and billing |
| API | `storygroove-be` | Accounts, AI coaching, Stripe integration, exports |

There is no self-serve signup form. **Every account begins with a Stripe payment**, and the account is created by a webhook after that payment succeeds.

## Read in order

1. [Getting started: from the landing page to checkout](01-getting-started.md) — what the plans are, what each one unlocks, and how to buy.
2. [Setting up your account](02-account-setup.md) — the verification email, creating your password, logging in.
3. [Finding your way around](03-dashboard-tour.md) — the dashboard, your projects, the sidebar.
4. [SimoneAI®: your Story Starter Kit](04-simone-story-starter-kit.md) — turning an idea into a validated concept.
5. [OliviaAI®: Story Bible, outline, and drafting](05-olivia-story-bible-and-drafting.md) — building and writing the book.
6. [EllisAI®: developmental editing](06-ellis-manuscript-review.md) — reviewing and revising a finished manuscript.
7. [Managing your subscription](07-managing-your-subscription.md) — upgrading, downgrading, pausing, resuming, cancelling, changing your card.
8. [Troubleshooting](08-troubleshooting.md) — every message that can block you, and what to do about it.

## The journey at a glance

```
Marketing site  →  Stripe Checkout  →  Verification email  →  Create password  →  Log in
                                                                                      │
                                                    ┌─────────────────────────────────┘
                                                    ▼
                              Simone: 20 questions → Story Starter Kit
                                                    │
                                                    ▼
                              Olivia: Story Bible → 15-scene outline → layering → draft
                                                    │
                                                    ▼
                              Ellis: editorial letter → chapter reviews → Revision Plan
                                                    │
                                                    ▼
                                        Export .docx and keep your work
```

Each coach is gated by plan. Simone is available to anyone who has bought a Story Starter Kit or holds a subscription; Olivia requires Builder or Studio; Ellis requires Studio.

## A note on prices in this guide

Prices quoted here are the figures the marketing site displays today. Inside the app, the Subscription tab reads its plan prices live from Stripe, so if pricing changes in Stripe the app updates on its own while the marketing site does not. Treat Stripe as the authority and this guide as a snapshot.

## Keeping this guide accurate

Update the relevant page whenever you change a user-visible flow: a new step in a coach's workflow, a renamed button, a new plan, or a change in what a plan unlocks. Quote button labels and on-screen messages exactly as they appear, so a support agent reading this can match what the writer is describing.
