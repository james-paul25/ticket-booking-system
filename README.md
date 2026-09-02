# SeqBook — Online Ticket Booking System
### Group 1 · Sequential Processing

An online ticket booking system where booking requests are placed into a queue
and processed **strictly one at a time**, in order — built with React,
TypeScript, Tailwind CSS, Supabase, and PostgreSQL.

---

## 1. Project Overview

Customers search schedules, pick a seat from a visual seat map, and submit a
booking request. That request doesn't touch the seat directly — it is
appended to a **sequential booking queue**. A processor claims the oldest
waiting request, checks the seat, reserves it if available, creates the
booking and a simulated payment, and only then moves on to the next request.
Every step is timestamped in a processing log so the order of operations is
provable, not just claimed.

## 2. Features

- User registration & login (Supabase Auth)
- Browse/search/filter schedules (origin, destination, date, price, availability)
- Visual seat map (available / selected / booked / blocked)
- Sequential booking flow with live queue-position + processing status
- Simulated payment recording
- Printable booking confirmation
- Booking cancellation with automatic seat release + refund record
- Booking history with status filters
- Admin dashboard: schedules CRUD, bookings, users, payments, queue monitor,
  processing-log timeline, and the **Sequential Processing Demo** page
- Light/dark theme toggle (persisted, respects system preference)
- Fully responsive (mobile → desktop)

## 3. Technology Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router,
TanStack Query, React Hook Form + Zod, Lucide icons.

**Backend:** Supabase (Auth + Postgres + RLS + RPC/PL-pgSQL functions).

```
React + TypeScript
        │
        ▼
 Supabase Client
        │
        ▼
 Booking Queue (booking_queue table)
        │
        ▼
 Sequential Processor (client await-loop + claim_next_queue_request RPC)
        │
        ▼
 PostgreSQL RPC (process_booking_request — one atomic transaction)
        │
        ▼
 Database Transaction
        ├──▶ Seats
        ├──▶ Bookings
        ├──▶ Payments
        └──▶ Processing Logs
```

## 4. Installation

```bash
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (anon/public key only — never the service-role key)
npm run dev
```

## 5. Supabase Setup

1. Create a new Supabase project.
2. Run the migrations in order against your project's SQL editor or via the
   Supabase CLI:
   ```bash
   supabase db push
   # or paste each file's contents into the SQL editor, in this order:
   #   supabase/migrations/0001_schema.sql
   #   supabase/migrations/0002_rls.sql
   #   supabase/migrations/0003_functions.sql
   ```
3. Run `supabase/seed.sql` to load sample schedules/seats.
4. Copy your project's URL and **anon/public** API key into `.env`.

### Seeding test users

Supabase Auth users must be created through the Auth API/UI, not raw SQL.
For the classroom demo, register these accounts through the app's `/register`
page (the `handle_new_user` trigger will auto-create their `profiles` row):

| Role | Email |
|---|---|
| Admin | `admin@ticketbooking.test` |
| Customer 1–5 | `customer1@ticketbooking.test` … `customer5@ticketbooking.test` |

After registering `admin@ticketbooking.test`, promote it in the SQL editor:

```sql
update profiles set role = 'admin' where email = 'admin@ticketbooking.test';
```

## 6. Running the Application

```bash
npm run dev      # http://localhost:5173
npm run build    # production build
npm run preview  # preview the production build
```

## 7. User Roles

- **customer** — search/book/cancel/view their own bookings and payments.
- **admin** — everything a customer can do, plus schedule management, full
  visibility into bookings/users/payments/queue/processing logs, and the
  Sequential Demo controls.

## 8. Sequential Processing Architecture

Sequential processing is enforced at **two layers**, not just the UI:

1. **Application layer** (`src/features/queue/sequentialProcessor.ts`) —
   an `await`-driven loop that claims and processes one queue request at a
   time. It deliberately never uses `Promise.all()`:
   ```ts
   while (pendingRequestsExist) {
     const result = await runNextInQueue(); // await, not Promise.all
     onProgress(result);
   }
   ```
2. **Database layer** (`supabase/migrations/0003_functions.sql`) — the real
   safety net:
   - `uq_single_processing_slot` — a partial unique index on
     `booking_queue` that makes it *physically impossible* for more than one
     row to be `status = 'processing'` at the same time, system-wide,
     regardless of how many browser tabs or admins are running the loop.
   - `claim_next_queue_request()` uses `FOR UPDATE SKIP LOCKED` so
     concurrent callers never grab the same row.
   - `process_booking_request()` performs the seat check, reservation,
     booking, payment, and logging inside **one PostgreSQL transaction** —
     it either all succeeds or all rolls back.
   - `uq_one_active_booking_per_seat` — a partial unique index on
     `bookings` guaranteeing at most one active (pending/confirmed) booking
     per seat, ever.

This means the sequential *behavior* you see in the UI is a faithful,
provable reflection of how the database actually processed the requests —
not a cosmetic animation layered over concurrent writes.

## 9. Booking Flow

```
Select schedule → Select seat → Review → Confirm
   → submit_booking_request() enqueues the request
   → sequential processor claims + processes it (await, one at a time)
   → seat available?  → reserve seat, create booking, record payment, confirm
   → seat unavailable? → reject with reason, log the failure
   → user sees live status: waiting → processing → success/failed
```

## 10. Five-Customer Demonstration

Navigate to **Admin → Sequential Demo** (`/admin/sequential-demo`).

1. Click **Reset Demo** — restores the demo schedule's seat A1 to
   `available` and clears prior demo queue/log/booking rows.
2. Click **Run 5-Customer Last Seat Test** — enqueues one request per demo
   customer for the same seat, then runs the sequential processor to drain
   the queue.
3. Watch the **Requests** panel and **Live Console** update in real time:
   request #1 succeeds, requests #2–#5 fail with `"FAILED: Seat already
   booked"`, one after another — never in parallel.
4. The metrics panel reads live counts, not hardcoded labels: successful,
   failed, and (always-zero, by construction) duplicate bookings/conflicts.

The **Admin → Processing Logs** page shows the timestamped, per-step proof
of the sequence (`QUEUED → PROCESSING_STARTED → SEAT_CHECK → ... →
PROCESSING_COMPLETED`) for each request, which is the strongest evidence to
show during the technical defense.

> **Note:** the demo page enqueues requests on behalf of the five seeded
> demo customer profiles from a single admin session, which is the
> practical way to trigger "five simultaneous customers" from one browser
> during a live presentation. For a version driven by five real, separately
> logged-in sessions, open the booking flow for the demo schedule's last
> seat in five browser tabs (or five devices), each logged in as a
> different demo customer, and submit at the same moment — the outcome is
> identical because the guarantee lives in the database, not in who clicked.

## 11. Database Structure

| Table | Purpose |
|---|---|
| `profiles` | App-level user data, mirrors `auth.users` |
| `schedules` | Routes, times, vehicle, pricing, seat counts |
| `seats` | Per-schedule seat inventory + status |
| `bookings` | One row per booking attempt (including failed ones, for audit) |
| `payments` | Simulated transaction records |
| `booking_queue` | The sequential queue — request order, status, timestamps |
| `processing_logs` | Step-by-step timestamped audit trail per request |
| `booking_cancellations` | Cancellation reason/refund audit trail |

Relationships:

```
auth.users → profiles → bookings → payments
                      └→ bookings → booking_cancellations
                      └→ booking_queue → processing_logs
schedules → seats → bookings / booking_queue
```

## 12. Security

- Row Level Security on every table.
- Customers can only read their own bookings/payments/queue rows/logs.
- Customers can **never** write directly to `seats`, `bookings`, or
  `payments` — all mutations happen inside `SECURITY DEFINER` PL-pgSQL
  functions that re-check `auth.uid()` ownership.
- Only the Supabase **anon/public** key is used in the frontend; the
  service-role key is never exposed.

## 13. Known Limitations

- Payments are simulated — no real payment gateway is integrated.
- The demo page submits queue rows on behalf of seeded demo customers from
  an admin session for convenience; see §10 for the fully independent
  five-tab alternative.
- Sequential processing intentionally trades throughput for strict
  ordering — see the debate notes below.

## 14. Technical Defense — Quick Answers

**Why sequential processing?** It makes transaction order explicit: each
request fully completes before the next one starts, which makes the
workflow easy to trace and rules out conflicting concurrent writes to the
same seat by construction.

**What happens with 5 customers on the same seat?** They enter the queue in
submission order. The processor claims and finishes request #1 (seat
reserved, booking confirmed) before it even looks at request #2, which then
sees the seat is no longer available and fails cleanly. Same for #3–#5.

**How are duplicate bookings prevented?** Three layers: the queue only lets
one request be "processing" at a time (enforced by a database unique
index), each request's seat-check-and-reserve happens in one atomic
transaction, and a separate unique index guarantees at most one active
booking per seat regardless of what the application layer does.

**Why not process everything simultaneously?** That's Group 2's approach.
This project intentionally prioritizes ordered, traceable execution and
simpler conflict reasoning over raw throughput.

**What's the disadvantage?** Throughput. Every request waits for the one
ahead of it, so under heavy load the queue grows and average wait time
increases. This is a deliberate trade-off, not an oversight — see the
processing-log timestamps for real measured durations to bring to the
debate.

## 15. Project Structure

```
src/
├── app/            router, providers, theme context
├── components/     ui, layout, forms, common (route guards)
├── features/       auth, seats (seat map), queue (the sequential engine)
├── pages/          public, customer, admin
├── services/       supabase client, schedule/seat/booking services
├── types/          database, schedule, seat, booking, payment, queue
└── main.tsx

supabase/
├── migrations/     0001_schema, 0002_rls, 0003_functions
└── seed.sql
```
