# Marketplace starter

A Next.js (App Router, TypeScript, Tailwind) site where people list items for sale.

- **Browse and search** approved listings, filter by category.
- **Sell**: anyone can post a listing with a private phone number and a passcode.
- **Edit later**: the seller proves ownership with **either the passcode or the phone number**, then can edit, mark sold, relist, or delete.
- **Approval**: you choose **manual** or **automatic** from `/admin` at any time.

## Deploy to Vercel

1. Push this folder to a GitHub repo and import it in Vercel.
2. In the Vercel project: **Storage → Create → Neon (Postgres)** and connect it. That sets `DATABASE_URL`.
3. Add environment variables (Settings → Environment Variables):
   - `ADMIN_PASSWORD`: your admin password
   - `SESSION_SECRET`: a long random string (`openssl rand -hex 32`)
   - Optional: `AUTO_APPROVE_DEFAULT`, `REQUIRE_REAPPROVAL_ON_EDIT`, `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_CURRENCY` (see `.env.example`)
4. Deploy. The `vercel-build` script creates the database tables automatically.
5. Visit `/admin` and sign in.

## Run locally

```bash
cp .env.example .env      # fill in DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET
npm install
npx prisma db push        # creates the tables
npm run dev
```

## Where to edit things

| What | File |
| --- | --- |
| Site name, categories, conditions, lockout limits | `src/lib/config.ts` (+ `.env`) |
| Colors and fonts | `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/globals.css` |
| Listing fields (database) | `prisma/schema.prisma`, then `npx prisma db push` |
| Form validation rules | `src/lib/validation.ts` |
| All create/edit/approve logic | `src/app/actions.ts` |
| Pages | `src/app/**/page.tsx` |

## How approval works

- **Manual**: new listings are `PENDING` and hidden until you approve them in `/admin`.
  By default, editing a live listing sends it back to `PENDING`. Set `REQUIRE_REAPPROVAL_ON_EDIT="false"` to keep edits live.
- **Automatic**: new listings and edits go live immediately. You can still reject or delete from `/admin`.
- The mode is stored in the database, so switching in `/admin` takes effect immediately without a redeploy.

## How seller access works

- At posting time the seller sets a passcode (stored hashed with scrypt) and gives a phone number (stored as its last 10 digits, never shown publicly).
- To edit, they enter the **listing ID** plus **passcode or phone number**. Or enter only a **phone number** to see all listings tied to it.
- Five wrong tries on a listing locks it for 15 minutes.
- Success sets a signed, HTTP-only cookie that lasts 60 minutes.

### Security note about phone-as-credential

A phone number is easy to learn, so anyone who knows a seller's number can edit their listings. This starter keeps the number private (the public "contact" field is separate). If you need stronger protection, verify the number with a texted one-time code (Twilio Verify, for example) in `verifyAccess` in `src/app/actions.ts`.

## Next steps you may want

- Photo uploads (Vercel Blob) instead of a pasted image link
- Rate limiting on posting (Upstash Ratelimit) and a CAPTCHA
- Email or SMS notifications to you when a listing is waiting
- Switch from `prisma db push` to `prisma migrate` once you have real data
