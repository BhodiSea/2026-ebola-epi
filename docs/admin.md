# Admin access — ituri-sitrep

This document covers two things:

1. How to grant a Supabase user access to the `/internal/*` back-office dashboards.
2. What each dashboard does and how to navigate it.

**Terminology note.** "Admin" in this codebase refers exclusively to the RBAC role that gates the `/internal/*` surface. It has nothing to do with the geographic `admin1` / `admin2` health-zone fields used throughout the data model.

---

## How access works

The role check lives in [apps/web/lib/auth/internal-user.ts](../apps/web/lib/auth/internal-user.ts). It reads `user.app_metadata.role` from the Supabase JWT. Any value in `["admin", "staff"]` grants access; everything else redirects to `/today`.

`app_metadata` is server-writable only — users cannot self-elevate. `user_metadata` is user-writable and is intentionally ignored by the role check.

The same check runs in two places:

- `apps/web/app/internal/layout.tsx` — redirects unauthenticated users to `/auth/login` and non-internal users to `/today` on every page render.
- `apps/web/lib/actions/client.ts` via `internalAction` — throws `FORBIDDEN` on any Server Action that mutates data.

A Postgres `SECURITY DEFINER` helper `private.is_internal_user()` provides a second line of defense at the RLS layer.

---

## Granting admin access

Choose one method. All three are equivalent in effect.

### Method 1 — Supabase Studio (recommended)

1. Open the Supabase project dashboard.
2. Go to **Authentication → Users**.
3. Click the target user row.
4. In the **User Details** panel, find **App Metadata** (not "User Metadata").
5. Edit the JSON to add or set the `role` key:
   ```json
   { "role": "admin" }
   ```
6. Save. The change takes effect on the user's next login (new JWT issued).

### Method 2 — Admin SDK script

Run from any server-side context that has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`:

```ts
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

await admin.auth.admin.updateUserById("<user-uuid>", {
  app_metadata: { role: "admin" },
});
```

### Method 3 — Direct SQL

Run as `postgres` (service-role equivalent) via the Supabase SQL editor or `psql`:

```sql
update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
 where email = 'someone@example.com';
```

---

## Confirming the role applied

After granting access, the user must **log out and log back in** so Supabase issues a fresh JWT containing the updated `app_metadata`.

To verify before the user logs in again, run in the SQL editor:

```sql
select email,
       raw_app_meta_data ->> 'role' as role
  from auth.users
 where email = 'someone@example.com';
```

After the user logs back in, navigating to `/internal/cost` should render the dashboard rather than redirect to `/today`.

---

## The six admin dashboards

All pages live under `/internal/` and require the `admin` or `staff` role.

| Route | Purpose |
|---|---|
| `/internal/cost` | LLM spend KPIs — daily stacked-area chart by model, top-10 outlier runs, total token usage |
| `/internal/pipeline` | Last 100 Inngest runs displayed as a Gantt timeline; inline retry button per run |
| `/internal/escalations` | Kanban board for four alert classes (budget, data-gap, parser-error, schema-drift); acknowledging a card moves it to Resolved |
| `/internal/quality` | Extraction eval F1 / precision / recall over time; populated when gold-set runs with `PERSIST_EVAL_SCORES=1` |
| `/internal/sources` | Parser-health table listing every ingestion source; pause toggle stops the Inngest ingest function for that source |
| `/internal/audit` | Read-only viewer for `audit.agent_actions` — shows what each agent did and when, with filters by agent and date |

Navigation between pages uses the `InternalNav` sidebar rendered by `apps/web/app/internal/layout.tsx`.

---

## Revoking access

Set `app_metadata.role` to `null` or remove the key entirely. The user will be redirected to `/today` on their next request (no forced logout required — the layout gate checks on every page render).

Via SQL:

```sql
update auth.users
   set raw_app_meta_data = raw_app_meta_data - 'role'
 where email = 'someone@example.com';
```

Via Studio: edit the **App Metadata** JSON and remove the `"role"` key, then save.

---

## What is intentionally absent

There is no user-management UI at `/internal/users`, no self-service sign-up for the `admin` or `staff` roles, and no role-grant button in the dashboard. Role assignment is out-of-band by design — granting write access to production data requires a deliberate action by someone with service-role credentials.

If a role-management UI is added in a future phase, it must go through an ADR (see [docs/adr/README.md](adr/README.md)) and a new RLS policy, not a shortcut through a service-role server action.
