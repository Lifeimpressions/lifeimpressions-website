# Lifeimpressions website and booking: setup

Folder map: `site/` is the website (upload to Vercel). `supabase/11_booking_site.sql` is the database. `supabase/functions/site-api/` is the booking API (paste `site-api-single-file.ts`).

## 1. Database (Supabase > SQL Editor)
Run in order if not already done: 04, 05, 07, 08, 09, 10, 11, then **12_site_staff_screens.sql** (lets staff clear the "customer cancelled online" alert) , **13_doorstep_travel.sql** and **14_travel_in_bill.sql** (doorstep travel: ₹30 per km, up and down; toll and parking extra; no API key needed). Hours default to Mon-Sat 10 AM-5 PM for every studio.
To close a day: `insert into blocked_dates (location_id, day, reason) values (1, '2026-11-14', 'Holiday');`

## 2. Booking API (Supabase > Edge Functions > Deploy a new function > Via Editor)
Name `site-api`. Paste all of `site-api-single-file.ts`. Deploy. In its settings turn **Enforce JWT Verification OFF**.

## 3. Secrets (Edge Functions > Secrets)
| Name | Value |
|---|---|
| RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET | From Razorpay (use **Test** keys first) |
| RAZORPAY_WEBHOOK_SECRET | Any long random text; use the same in step 4 |
| RESEND_API_KEY | From resend.com (free plan is enough). Add and verify the domain lifeimpressions.in there so support@lifeimpressions.in can send |
| MAIL_FROM | `Lifeimpressions <support@lifeimpressions.in>` |
| SITE_URL | Your website address, e.g. https://www.lifeimpressions.in (no trailing slash) |
| ALLOWED_ORIGIN | Same as SITE_URL |

## 4. Razorpay webhook (safety net if a customer closes the page after paying)
Razorpay Dashboard > Developers > Webhooks > Add: URL `https://omluwmhlrvgxlqjflasm.supabase.co/functions/v1/site-api/webhook`, events `payment.captured` and `order.paid`, the secret from step 3.

## 5. Website (Vercel)
`site/config.js` already points to your Supabase project. Create a Vercel project from the `site` folder (or push it to GitHub and import it). No build step. Connect lifeimpressions.in later.

## 6. Test before going live
Use Razorpay Test keys. Book with a test card/UPI, confirm: the email arrives, a job appears in the Studio Tracker at the right studio, the slot disappears for the next visitor, and reschedule/cancel from the email link work. Then swap in Live keys.

## Before you publish: check these
- Policy pages (`#/policies/...`) were written from your Wix booking-form policies. Have them reviewed and edit the text in `app.js` (POL) if your official wording differs.
- Gallery: add photos to `site/assets/gallery/` and list them in `gallery.json`.
- Advance is 30% (min Rs 1,000). Change in the `settings` table: site_advance_percent, site_advance_minimum.
- Once live, switch off Wix online booking so bookings are not taken in two places.

## Staff tracker at /studio
The Studio Tracker is included at `yoursite/studio` (same staff logins, same location rules, hidden from search engines). Bookmark it or Add to Home Screen on each phone. New in Settings: **Online bookings** (paid website bookings) and **Closed days** (block a studio for a date). On Today, **Customers who cancelled online** appears when a customer cancels from their email link: tap Cancel job, then Done.
If staff already installed the tracker from the old GitHub address, they sign in again at /studio. Update the `APP_URL` secret of the `send-daily-push` function to the new /studio address so reminder taps open it.
