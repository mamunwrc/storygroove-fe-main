# User Authentication and Profile

## Summary

Writers register, log in (with optional two-factor authentication), reset passwords, verify email tokens, and manage profile settings including OpenAI API keys. JWT tokens are stored in localStorage and attached to API requests.

## Scope

**In scope:** Login, signup, 2FA verification, password reset, email verification, profile page, profile photo upload, auth context, Google OAuth callback.

**Out of scope:** Stripe subscription UI (see subscriptions-billing), admin user management backend APIs.

## Primary responsibilities

- Present login, signup, and password reset flows.
- Persist JWT and user session via `NewAuthProvider`.
- Attach auth headers on axios requests.
- Support profile read/update and profile picture upload/remove.
- Handle email verification and OAuth callback routes.

## Dependencies

- Backend `/api/user` endpoints (`src/api/user.js`).
- `REACT_APP_BASE_URL` for API base URL.
- Google OAuth via `GoogleSignInButton` (deployment-dependent).

## How to navigate the code

- Pages: `src/Pages/LoginPage/`, `SignUpPage/`, `ResetPassword/`, `VerifyToken/`, `usertokendetails/Profile.jsx`
- Context: `src/contexts/NewAuthProvider.js`
- API: `src/api/user.js`, `src/api/axios.js`
- Routes: `src/App.js` (`/login`, `/signup`, `/verify/:token`, `/passwordReset/:token/:id`)

## Open questions / gaps

- Google OAuth callback route exists in App.js but integration details vary by deployment.
