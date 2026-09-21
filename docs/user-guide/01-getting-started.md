# 1. Getting started: from the landing page to checkout

Everything begins on the public marketing site at **storygroove.ai**. There is no free trial and no signup form — you choose what you want, pay through Stripe, and your account is created for you.

## What you see on the landing page

The homepage is one long page. The header carries the navigation and two actions: **Start Today**, which jumps to the Builder Edition card in the pricing section, and **Log In**, which opens the app at `app.storygroove.ai/login` in a new tab.

Scrolling down, the page introduces the three coaches, explains the studio, offers a **Take the 3 Min Tour** video, shows testimonials, and lands on the pricing section. Anchors in the navigation jump to **How It Works**, **Why StoryGroove**, **Pricing**, and **FAQ**.

Legal and support pages sit at their own URLs and are linked from the footer: Privacy Policy, Terms of Service, EULA, Refund & Cancellation Policy, Early Access Terms, and Contact. The refund policy is worth reading before you buy — subscriptions are non-refundable, and you cancel rather than request money back.

## The three-step pricing funnel

Pricing is presented as a funnel rather than a plan grid, under the heading **StoryGroove Plans**.

### Step 1 — Start with Simone ($7, one-time)

The entry point. You answer SimoneAI®'s twenty Socratic questions about your novel concept and receive a Story Starter Kit: a logline, a synopsis, an opening scene concept, a market readiness score, and a writing roadmap. No membership is required and there is nothing recurring — it is a single $7 payment for a single kit.

This is the recommended first purchase if you are testing whether the product suits you.

### Step 2 — Membership ($397, one-time)

A one-time fee that opens your private novelist studio: the connected workspace where your book, your coaches, and your creative history live. You do not buy this on its own. It is added automatically as a second line item the first time you buy a Builder or Studio subscription, and you are only charged it once. If you later change plans, or cancel and resubscribe with the same Stripe customer, you are not charged again.

### Step 3 — A coaching plan (recurring)

| Plan | Coaches | Price as advertised |
|---|---|---|
| **Builder Edition** | SimoneAI® + OliviaAI® | $79/mo or $799 annually |
| **Studio Edition** | SimoneAI® + OliviaAI® + EllisAI® | $99/mo or $999 annually |

**Builder** is for writers turning an idea, messy notes, or a discovery draft into a structured, draftable novel: Olivia builds your Story Bible, plans the book scene by scene, and coaches you while you write.

**Studio** adds EllisAI®, the developmental editor. If you already have a finished or near-finished manuscript that needs a revision plan, Studio is the plan you want, because Ellis is the only coach who reviews an uploaded manuscript.

Monthly and yearly are separate purchases rather than a toggle on one plan, which matters later: switching between monthly and yearly is treated as an upgrade or a downgrade, not a billing-frequency setting.

## Buying

Click any pricing button — **Get Your Story Starter Kit With SimoneAI®**, **Buy Builder (Monthly)**, **Buy Studio (Yearly)**, or one of the **Start with SimoneAI® for $7** buttons scattered through the page. The button briefly reads **Redirecting…** and then hands you to Stripe's hosted checkout.

On the Stripe page you enter your email and card details. **The email you type here becomes your Story Groove login**, so use an address you can actually receive mail at. For Builder and Studio, the checkout will show two line items if you are a new member: the subscription and the one-time membership fee. Promotion codes can be entered on the Stripe page.

Before you can submit, Stripe shows the terms you are agreeing to. For a first purchase with membership that reads: *"I agree to the Terms of Service. The membership fee is a one-time charge; your subscription renews based on your billing frequency and is non-refundable."*

## After you pay

Stripe redirects you to `app.storygroove.ai/checkout-success`, a page headed **Welcome — You're In!** with two steps:

1. **Check your email** — look for a verification email from support@storygroove.ai.
2. **Verify your email & create your password.**

If the email has not arrived, the page tells you to check Spam and Promotions before contacting support.

Your account is created behind the scenes by a Stripe webhook the moment the payment succeeds. It exists immediately, but it is inactive and has no password until you complete verification — which is what the next chapter covers.

If payment fails or you abandon the Stripe page, you land on `/subscriptionfailed`, headed **Payment Failed**, with a link back to the homepage. Nothing is created and you can simply try again.

## Buying from inside the app instead

If you already have an account — for example you bought a $7 Starter Kit and now want a subscription — you do not go back to the marketing site. Sign in and open **My Account → Subscription**, where the same funnel appears with your current plan reflected. See [Managing your subscription](07-managing-your-subscription.md).

## Invited by an administrator

Story Groove staff can generate a personalised checkout link for a specific person and email it. That message is subject-lined **You're invited to subscribe to StoryGroove** and carries a **Start my subscription** button. It works exactly like public checkout, except the account already exists and is matched by email, and after payment you are sent to the dashboard rather than the checkout-success page.

---

Next: [Setting up your account](02-account-setup.md)
