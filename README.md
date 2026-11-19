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

## Members-only contact details

Seller contact details (the contact text and the WhatsApp button/redirect) are shown only to **approved members** and the admin.

- `src/middleware.ts` blocks the whole site for anyone without a valid member sign-in cookie.
- `src/lib/memberAccess.ts` (`hasMemberAccess`) is the real check. It looks up the member in the database on every request, so removing someone in `/admin/join` cuts off contact details immediately, even though their cookie is valid for up to 90 days.
- It is used in `src/app/listings/[id]/page.tsx` and `src/app/contact/[id]/route.ts`. Use it for any new place that shows contact details.

## Screenshot to listing (admin only)

`/admin/import` can start from a screenshot of a post. It is free and needs no API key or extra npm package.

- The text is read in the admin's own browser with Tesseract.js (open source), loaded from a pinned version on the jsDelivr CDN the first time it is used (`src/lib/ocr.ts`). `src/lib/ocrClean.ts` removes phone status bars and chat buttons.
- The product photo is found with a small image check (`src/lib/photoCrop.ts`) and cropped in the browser. The admin can adjust the crop with sliders before it is saved.
- The text then goes through the same admin-only `parsePost` and `createImportedListing` actions as pasted posts. Screenshot drafts default to the review list (Pending) instead of publishing straight away.
- Posting by regular users is unchanged: only approved members can post (checked live), and the admin approval mode still applies.

## Accounts, status, and seller reviews

- Every listing a signed-in member posts is saved to their account (`Listing.ownerId`). `/account` lists them with buttons to edit, mark as **Pending** (a sale is in progress) or **Sold**, relist, and delete (with a confirmation).
- `PENDING` still means "awaiting admin approval" and is shown as "Awaiting approval". `SALE_PENDING` is the seller's own "Pending" status. Sellers can only switch listings that have already been approved, so the admin's review can't be skipped.
- The posting form no longer asks for a phone number or passcode: listings are edited from the account. The database still needs those two columns, so new listings get random, unguessable values for them.
- Members can rate sellers 1 to 5 stars with an optional comment (`/sellers/[id]`, `src/app/review-actions.ts`). One review per member per seller, no self-reviews, members only. The admin can delete any review from the seller page.

## Sellers list and bans (admin)

`/admin/sellers` lists members with their listings and star ratings. Tabs: **Sellers** (members who have posted), **All members**, **Banned**.

- **Ban** sets the member's status to `BANNED`: they are logged out immediately (the live check in `lib/memberAccess.ts` and the header), can't log in, and can't apply again with the same WhatsApp number. Their live listings are hidden (set to "Not approved" with the reason "Seller removed from the site"), their profile disappears, and reviews they wrote are no longer shown.
- **Unban** makes them an approved member again and moves those hidden listings back to the review list.
- "Remove access" on `/admin/join` is the softer option: it logs the person out but does not hide their listings, and they could apply again.

## One account per WhatsApp number, and forgotten passwords

- Joining with a number that already has an approved account does not create anything. The form tells the person to log in and offers "Forgot your password?". A number with a request still being reviewed is told to wait, and banned numbers get the usual quiet "received" answer. `approveJoin` also refuses to approve a second request for a number that already has an account.
- "Forgot your password?" (on `/login` and after a duplicate join) only sets `JoinRequest.resetRequestedAt` and emails the admin. Nothing is reset automatically, so nobody can take over an account just by knowing a number.
- `/admin/resets` lists the requests in order: check with the person on WhatsApp, press Reset password, then send the reset link. Resetting clears the request. The reset link works because `/enter` lets a member with no password choose one.

## Security notes

- Passwords and passcodes are stored only as salted scrypt hashes. Sign-in cookies are signed, `httpOnly`, `sameSite=lax`, and `secure` in production.
- Every page sends basic security headers (`next.config.mjs`): no framing, no content sniffing, HTTPS only, and a limited referrer.
- Logins, joins, password resets, chat, support messages, and the **admin login** are rate limited per visitor (`lib/ratelimit.ts`).
- Membership is checked live in the database for contact details, posting, uploads, seller profiles, and the account page, so removing or banning someone takes effect immediately.
- A member's personal link (`/enter`) only shows an applicant their request status or lets an approved member choose a first password. Once a password is set the link no longer signs anyone in.
- Use a long, random `ADMIN_PASSWORD` and `SESSION_SECRET`. Changing `SESSION_SECRET` signs everyone out and invalidates every personal link.

## Sharing listings to a WhatsApp group (free)

WhatsApp does not let a website post into an ordinary group automatically for free (the official Groups API is limited to verified business accounts, small groups it creates itself, and paid messages; unofficial tools break WhatsApp's rules and can get the number banned). Instead:

- **Share buttons** (`components/ShareButton.tsx`, `lib/share.ts`) open WhatsApp with the title, price, area, and link ready (`https://wa.me/?text=...`). The person picks the group and presses send. They appear on live listings, after posting, in My account, and for the admin on each live listing in `/admin`.
- The message contains only public details. Contact details stay members-only.
- **Link previews:** `generateMetadata` on `/listings/[id]` adds Open Graph tags, so pasting the link into WhatsApp shows the photo, title, and price.

## Email sign-up (no approval)

Anyone can create an account at `/signup` with a name, email and password and is signed in straight away.

- `src/app/signup-actions.ts`: creates the member (already `APPROVED`) and signs them in. Limited to 5 attempts per hour per visitor.
- Members who sign up with an email have no WhatsApp number (`JoinRequest.whatsapp` is now optional, and `JoinRequest.email` is unique).
- `/login` accepts an email or a WhatsApp number, so members who joined the old way can still log in.
- Optional: set `SIGNUP_ALLOWED_EMAIL_DOMAINS="psu.edu"` to only allow certain email domains.
- Forgotten passwords: the member asks on `/login`, the admin gets it in `/admin/resets`, checks it is them, and sends the reset link by email or WhatsApp.
- The old "Request to join" flow at `/join` still works if you ever want manual approval again.

## Buyer and seller messages (admin can read them)

- Members message a seller from the listing page (only listings that belong to a member account). Conversations live at `/messages` and `/messages/[id]`.
- You can read every conversation, read-only, at `/admin/messages` (search by name, listing, or words in a message).
- Members are told on every message screen, and in the Privacy Policy, that the site team can read messages. Keep that notice if you keep the feature.
- Limit: 30 messages per member per hour (`MESSAGES_PER_HOUR` in `src/lib/messages.ts`).
- Tables: `Conversation` and `Message` in `prisma/schema.prisma`.

### Chat pop-up

Signed-in members get a "Messages" bubble (bottom left) on every page, so they can chat while browsing. It lives in `src/components/MessagesWidget.tsx`, is mounted in `src/app/layout.tsx`, and reads from `/api/messages`. The "Message the seller" button on a listing and the "Messages" link in the header open it. The full pages at `/messages` still work.
