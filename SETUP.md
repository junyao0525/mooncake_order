# Angel Bakery — Database, Login & Dashboard Setup

The order form now saves orders to a **Postgres database** and has an
admin-only **`/dashboard`** protected by **login**. Follow these steps once.

## 1. Create the database (Neon Postgres via Vercel)

1. Push this repo to GitHub and import it into **Vercel** (New Project → pick the repo).
2. In the Vercel project → **Storage** → **Create Database** → **Postgres** (Neon).
3. After it's created, open the **`.env.local`** tab (Neon's own label) and copy
   both `DATABASE_URL` (pooled, host contains `-pooler`) and
   `DATABASE_URL_UNPOOLED` — the latter becomes `DIRECT_URL` here.

> Prefer to develop locally first? Create a free DB at https://neon.tech and copy its connection string.

## 2. Configure environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env
```

Use **`.env`**, not `.env.local`: the Prisma CLI only auto-loads `.env`, so
`npm run db:push` fails to see a `DATABASE_URL` that lives in `.env.local`.
Next.js loads both, so a single `.env` keeps the app and Prisma in sync.
Both are gitignored.

Then set the values in `.env`:

| Variable         | What to put                                                        |
| ---------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`   | The **pooled** Postgres connection string from step 1               |
| `DIRECT_URL`     | The **unpooled** string for the same DB — required by Prisma        |
| `ADMIN_EMAIL`    | The email you'll log into the dashboard with                       |
| `ADMIN_PASSWORD` | A strong password for the dashboard                                |
| `AUTH_SECRET`    | A random string — generate with `openssl rand -base64 32`          |

## 3. Create the database tables

```bash
npm run db:push        # creates the "Order" table from prisma/schema.prisma
```

## 4. Run it

```bash
npm run dev
```

- Order form:  http://localhost:3000
- Dashboard:   http://localhost:3000/dashboard  → redirects to `/login`
- Log in with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

Submit a test order from the form, then refresh the dashboard to see it.

Inspect data visually anytime with:

```bash
npm run db:studio      # opens Prisma Studio, a spreadsheet-like DB browser
```

## 5. Deploy to Vercel

1. In Vercel → project → **Settings → Environment Variables**, add the same
   `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET`.
2. Push to `main` — Vercel auto-builds (`prisma generate && next build`) and deploys.
3. Run `npm run db:push` once against the production `DATABASE_URL` (or use
   `prisma migrate` for versioned schema changes).

---

### How it fits together

```
Order form (/)  ──createOrder() server action──▶  Postgres (Order table)
Login (/login)  ──sets signed cookie (jose)──▶   proxy.ts guards /dashboard
Dashboard       ──requireAdmin() + Prisma query──▶ list orders, change status
```

Key files:

- `prisma/schema.prisma` — the `Order` table + status enum
- `src/lib/prisma.ts` — database client
- `src/lib/session.ts` / `src/lib/auth.ts` — cookie session + admin guard
- `src/app/actions.ts` — `login`, `logout`, `createOrder`, `updateOrderStatus`
- `src/proxy.ts` — protects `/dashboard`
- `src/app/login/page.tsx`, `src/app/dashboard/page.tsx`
