# 8. Troubleshooting

Every blocker a writer commonly hits, and what to do. If none of this matches, email **support@storygroove.ai** and include the email you used at Stripe Checkout.

## Account and login

| What you see | Cause | What to do |
|---|---|---|
| No verification email | Filters, or webhook still processing | Wait a couple of minutes. Check Spam and Promotions. Use **Need to verify your email? Resend verification** on login. New link lasts **24 hours**; one request per minute. |
| *Invalid token* / *Token expired* on `/verify/...` | Link already used, or older than **48 hours** (first email) / **24 hours** (resend) | Resend verification, or **Forgot your password?** Completing a reset also activates an inactive account. Reset links last **one hour**. |
| *User already verified* | You already clicked verify | Go to **Log In**. If you never set a password, use **Forgot your password?** |
| *Please set your password using the link from your verification email* (`PASSWORD_SETUP_REQUIRED`) | Account exists, password never chosen | Open the verify email, or request a password reset. |
| *Your account is inactive, please verify your account* (`ACCOUNT_UNVERIFIED`) | Email not verified | Use the resend panel that appears, or **Resend verification**. |
| *Passwords do not match* | Typo on **New Password** | Re-enter both fields. Minimum 8 characters. |
| *Invalid or expired password reset token* | Reset link used or older than one hour | Request a new reset. |
| *Invalid credentials* | Wrong password, or account locked after many failures | Reset password. Superadmins: wait out the lock or ask another admin to unlock. |
| Superadmin **Verify your login** | Expected 2FA | Code in email, 10 minutes, 5 attempts. **Resend code** has a 1-minute cooldown. |

The email you typed in Stripe **is** your login. There is no in-app email change.

## Checkout and plans

| What you see | Cause | What to do |
|---|---|---|
| **Payment Failed** | Abandoned Stripe page or declined card | Retry from the marketing site or **Subscription**. No account is created for a brand-new failed checkout. |
| Redirected to Subscription when opening a project | Pause or cancelled-after-period | Resume or re-subscribe. |
| *Your subscription is paused. Resume billing to access this page.* | Pause plan is active | **Resume Subscription**. |
| *Your subscription has been cancelled. Please re-subscribe to access this page.* | Paid period ended | Choose Builder or Studio again. Membership is not charged if Stripe already knows you as a member. |
| Simone modal **Start Your Story with SimoneAI®** | No Builder/Studio and no $7 credit left | Buy another kit or upgrade to Builder. |
| *Simone credit required...* | Same as above, from the API | Same. |
| *Upgrade to Builder to continue with OliviaAI®...* | Kit done, plan is Simone-only | Buy Builder from the modal. |
| *Ellis' editing is available on the Studio plan...* | Builder or Simone-only | Upgrade to Studio. |
| *Your subscription does not include Ellis' editing.* | Chat without Studio | Upgrade to Studio. |
| Pause toast *You can still view your work* but projects are locked | Copy vs behaviour | Projects stay locked on purpose. Resume to open them. |
| Cancel warning that work will be deleted | Policy copy on the confirm dialog | Until you re-subscribe, coaches and projects stay locked. Contact support if you expected a download window. |

## Coaches and projects

| What you see | Cause | What to do |
|---|---|---|
| Cannot click **Start a New Idea** / **Novel Plan** / **Edit** | Pause or cancel lock | Resume or re-subscribe. |
| *Failed to start session. Please try again.* | Network or API error | Retry. If it persists after a successful payment, wait a minute for the webhook, then refresh. |
| Simone session paused for scope | Thread spent too long on manuscript-style work | Start Ellis (Studio) for pages and chapters. Open a **new** Simone idea for a new concept. |
| No **Build My Story Bible** button | Kit message not recognised yet | Keep going until Simone's message includes **Simone's Story Starter Kit for**. Refresh if the kit is visibly on screen. |
| **Olivia Chat Already Exists** | You already handed this kit off | Open the existing chat, or start a new one with a new title. |
| **Outline Already Exists** | Novel already created from this Bible | Open it, or create another outline with a new title. |
| **Download Outline** disabled | No scene design yet | Generate Scene Design with Olivia first. |
| **Download Manuscript** disabled | Empty draft | Write in the drafting space (Olivia) or wait for Ellis import to finish. |
| **Download Editing Plan** 404-style toast | Nothing inserted yet | In Ellis chat, **Insert to Revision Plan** on the reviews you want to keep. |
| Upload rejected | Wrong type or over 50 MB | Use .doc, .docx, PDF, or TXT under 50 MB. |
| Rate-limit banner / *You're at n% of your … limit* | Usage cap | Wait for the window to reset, or contact support if you are mid-scene. |

## Who can use what

| Coach | Simone $7 only | Builder | Studio | Paused / cancelled (ended) |
|---|---|---|---|---|
| Simone | One new kit per purchase | Unlimited | Unlimited | Locked |
| Olivia | Upgrade prompt | Yes | Yes | Locked |
| Ellis | Upgrade prompt | Upgrade prompt | Yes | Locked |
| Community sidebar | Hidden | Shown | Shown | Visible but disabled (community on hold) |

Admins and superadmins bypass these gates.

## Still stuck?

1. Confirm you can log in (account **active**, password set).
2. Open **My Account → Subscription** and confirm the plan button says **Active** (or **Active until {date}**).
3. Hard-refresh the dashboard, then retry the coach.

Support can match your Stripe email to the account and see whether checkout provisioned, whether status is still `inactive`, and whether agent access is Builder, Studio, pause, or credits-only. That investigation is documented in the API repository at `docs/user-guide/` (`storygroove-be`).

---

Previous: [Managing your subscription](07-managing-your-subscription.md) · Back to [index](README.md)
