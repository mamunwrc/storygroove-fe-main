# 2. Setting up your account

Your account was created the moment your payment cleared, using the email address you gave Stripe. It starts life **inactive** and without a password. Two clicks fix that: verify your email, then choose a password.

## Step 1 — The verification email

Within a minute or two of paying you receive an email from **support@storygroove.ai** containing a verification link. The link is good for **48 hours**.

If it has not appeared, check Spam and Promotions first — it is a transactional email from a domain you have never corresponded with, so filters often catch it. If it genuinely never arrived, see [Getting a new verification link](#getting-a-new-verification-link) below.

## Step 2 — Verify and create your password

Clicking the link opens the app, verifies your email, and immediately forwards you to a page headed **New Password**. Enter the same password twice — minimum eight characters, and a mix of letters, numbers and symbols is recommended — and press **Reset Password**.

You will see **"Password set — log in to start writing."** and be taken to the login page after a moment. At this point your account is fully active.

If the two fields do not match you get **"Passwords do not match"** and nothing is submitted. If the page reports an invalid or expired token, the link has already been used or has aged out; request a fresh one from the login page's **Forgot your password?** link, which produces a new link valid for one hour.

## Step 3 — Log in

Go to `app.storygroove.ai/login`, enter your email and password, and press **Log In**. You land on the dashboard.

The login page also carries three useful links: **Forgot your password? Click Here**, **Need to verify your email? Resend verification**, and **Don't have an account? Buy Your Plan**, which sends you back to the marketing site's pricing section.

### If you are a superadmin

Superadmin accounts have a second factor. After a correct password you see **Verify your login** and a six-digit code is emailed to you. Enter it under **Verification Code** and press **Verify & Sign In**. The code lasts ten minutes and allows five attempts; **Resend code** issues a new one, with a one-minute cooldown between sends. Regular writer accounts never see this screen.

## Getting a new verification link

Two routes lead to the same place.

From the login page, click **Need to verify your email? Resend verification**, or attempt to log in — if your account is not yet verified, the page responds with a panel explaining that your account exists but is not verified and offering the same control. Enter your email and press **Resend verification email**. The reply is deliberately vague — *"If this email is registered, a new verification link has been sent."* — because the form must not reveal whether an address has an account. The new link is valid for 24 hours, and you can only request one per minute.

If email delivery itself is failing you will be told so and pointed at support@storygroove.ai.

## Forgotten password

On the login page, click **Forgot your password? Click Here**, enter your email, and press **Send Reset Link**. You will see *"We have received your password reset request. Please check your email for further instructions."*

The reset link lasts one hour. Following it opens the same **New Password** screen described above. Completing a reset also verifies your account if it was still unverified, so this is a reliable way out if your original verification link expired.

## Where your account details live

Once you are in, everything about your account sits under **My Account**, reachable from the sidebar. The **General** tab holds your profile photo, first and last name, and your email address (read-only — the email is tied to your Stripe customer record and cannot be changed in the app). The **Subscription** tab holds your plan and payment card; see [Managing your subscription](07-managing-your-subscription.md).

---

Previous: [Getting started](01-getting-started.md) · Next: [Finding your way around](03-dashboard-tour.md)
