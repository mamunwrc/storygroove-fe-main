# Feature Map — storygroove-fe

Machine-friendly frontend feature inventory for humans and automation (PR impact, onboarding, AI updates). Each feature has:

- `<feature-slug>.md` — human-readable description
- `<feature-slug>.paths.json` — repo-relative paths for scripts (`schema_version: "1"`)

Paths are relative to the **storygroove-fe** repository root. For the full-stack map (including `storygroove-be`), see the monorepo `docs/features/README.md`.

Writer journey (landing → checkout → Simone → Olivia → Ellis → billing): [`docs/user-guide/README.md`](../user-guide/README.md).

## Route map (`src/App.js`)

| Route | Page / feature |
|-------|----------------|
| `/login`, `/signup` | user-auth |
| `/verify/:token`, `/passwordReset/:token/:id` | user-auth |
| `/`, `/dashboard/` | dashboard |
| `/dashboard/book-idea` | dashboard, story-ai-generation |
| `/dashboard/book/:id` | dashboard, novel-management |
| `/dashboard/bookeditor/:id` | book-editor, olivia-writing-studio, olivia-scene-design |
| `/dashboard/upload/bookeditor/:id` | manuscript-upload |
| `/dashboard/finaldraft/:id` | final-draft, ellis-scene-review |
| `/dashboard/agent-chat/:agentId` | ai-agent-chat |
| `/dashboard/agent-chat/:agentId/novel/:novelId` | ai-agent-chat |
| `/dashboard/userprofile` | user-auth, agent-prompts-admin, methodology-admin |
| `/dashboard/admin/api-usage` | api-usage-admin |
| `/dashboard/admin/activity-logs` | activity-log-admin |
| `/subscriptionfailed` | subscriptions-billing |

Subscription and billing pages are linked from profile/sidebar (not all routes are top-level in App.js).

## Writer experience

| Feature | Description | Docs |
|---------|-------------|------|
| [user-auth](user-auth/user-auth.md) | Login, signup, 2FA, profile, password reset | [paths](user-auth/user-auth.paths.json) |
| [dashboard](dashboard/dashboard.md) | Home, projects, book idea/details, navigation | [paths](dashboard/dashboard.paths.json) |
| [book-editor](book-editor/book-editor.md) | Writing studio UI (outline, scenes, Olivia panels) | [paths](book-editor/book-editor.paths.json) |
| [manuscript-upload](manuscript-upload/manuscript-upload.md) | Upload manuscript and upload viewer | [paths](manuscript-upload/manuscript-upload.paths.json) |
| [final-draft](final-draft/final-draft.md) | Final draft review with Ellis feedback | [paths](final-draft/final-draft.paths.json) |
| [ai-agent-chat](ai-agent-chat/ai-agent-chat.md) | Simone/Olivia agent chat threads | [paths](ai-agent-chat/ai-agent-chat.paths.json) |
| [subscriptions-billing](subscriptions-billing/subscriptions-billing.md) | Stripe subscriptions, trial, billing portal | [paths](subscriptions-billing/subscriptions-billing.paths.json) |
| [s3-file-storage](s3-file-storage/s3-file-storage.md) | Asset upload/display via API and `/userData` URLs | [paths](s3-file-storage/s3-file-storage.paths.json) |

## Novel and AI (UI)

| Feature | Description | Docs |
|---------|-------------|------|
| [novel-management](novel-management/novel-management.md) | NovelContext and bookGeneration API client | [paths](novel-management/novel-management.paths.json) |
| [story-ai-generation](story-ai-generation/story-ai-generation.md) | Story generate/review, character AI UI | [paths](story-ai-generation/story-ai-generation.paths.json) |
| [ellis-scene-review](ellis-scene-review/ellis-scene-review.md) | Ellis feedback in editor and final draft | [paths](ellis-scene-review/ellis-scene-review.paths.json) |
| [olivia-scene-design](olivia-scene-design/olivia-scene-design.md) | Scene Design tab in Book Editor | [paths](olivia-scene-design/olivia-scene-design.paths.json) |
| [olivia-writing-studio](olivia-writing-studio/olivia-writing-studio.md) | Olivia chat, layering, rich scenes in editor | [paths](olivia-writing-studio/olivia-writing-studio.paths.json) |
| [book-cover-generation](book-cover-generation/book-cover-generation.md) | BookCoverModal and cover API | [paths](book-cover-generation/book-cover-generation.paths.json) |

## Administration

| Feature | Description | Docs |
|---------|-------------|------|
| [agent-prompts-admin](agent-prompts-admin/agent-prompts-admin.md) | Agent prompt admin UI | [paths](agent-prompts-admin/agent-prompts-admin.paths.json) |
| [methodology-admin](methodology-admin/methodology-admin.md) | Methodology rules/templates admin UI | [paths](methodology-admin/methodology-admin.paths.json) |
| [api-usage-admin](api-usage-admin/api-usage-admin.md) | Super-admin API usage dashboard | [paths](api-usage-admin/api-usage-admin.paths.json) |
| [activity-log-admin](activity-log-admin/activity-log-admin.md) | Super-admin activity logs dashboard | [paths](activity-log-admin/activity-log-admin.paths.json) |

## Cross-cutting frontend infrastructure

| Concern | Paths |
|---------|-------|
| Auth context | `src/contexts/NewAuthProvider.js` |
| HTTP client | `src/api/axios.js` |
| App routing | `src/App.js` |
| Layout shell | `src/Pages/Layout/`, `src/component/layout/` |
| Super-admin guard | `src/component/guards/SuperAdminGuard.jsx` |
| Env | `REACT_APP_BASE_URL` |

## Adding a feature

1. Create `docs/features/<feature-slug>/`
2. Add `<feature-slug>.md` and `<feature-slug>.paths.json` (see [AGENTS.md](../../AGENTS.md))
3. Add a row to the tables above
4. Mirror the feature in the monorepo `docs/features/` if the feature spans frontend and backend
