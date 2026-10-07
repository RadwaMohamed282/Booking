# BookingApp — Implementation Roadmap (from "11 - Bookings Final Project (Reactive Web).pdf")

## Context

This is the implementation roadmap for finishing BookingApp against the original assignment PDF (`11 - Bookings Final Project (Reactive Web).pdf`, repo root — an OutSystems training brief being built here as ASP.NET Core + Angular instead). Organized as application build stages (Phases), each made of complete vertical Tasks (backend + frontend + integration + validation together, not split into separate technical/bug-fix phases). Bug fixes live inside the phase whose feature they belong to.

**Scope decisions already confirmed:**
- No authentication/roles (PDF's Manager/Clerk restriction is out of scope for now).
- Occupancy chart: hand-built SVG/Canvas, no new charting dependency.
- "Room Service" extra challenge included as a final optional phase.
- Booking's guest name fields were corrected to match the PDF (`GuestFirstName`/`GuestLastName`, dropping the old `GuestEmail`, which isn't in the spec) — done in Phase 1.

---

## Project Structure

```
BookingApp/
├── backend/BookingApp.Api/
│   ├── Controllers/    # RoomsController.cs, BookingsController.cs — action-style routes, use AppDbContext directly
│   ├── Models/         # Room.cs, Booking.cs, Amenity.cs — entities double as API request/response bodies
│   ├── Data/           # AppDbContext.cs — EF Core context, seed data, enum/string conversions
│   ├── Migrations/     # EF Core migrations (SQLite)
│   ├── Program.cs      # DI, CORS, JSON options, Swagger
│   └── bookings.db     # SQLite database file
│
├── frontend/src/app/
│   ├── bookings/       # components/ (booking-list, booking-form, booking-detail), models/, services/ (booking.service.ts — stub)
│   ├── rooms/          # components/ (room-list, room-form), models/, services/ (room.service.ts — wired to backend)
│   ├── landing/        # components/landing-page — homepage dashboard
│   ├── shared/         # components/, models/ — cross-feature code, currently empty
│   ├── app.routes.ts   # route table (order matters: static before parameterized)
│   ├── app.config.ts   # providers: router, HttpClient
│   └── environments/   # environment.ts / environment.development.ts — apiBaseUrl
│
├── CLAUDE.md            # conventions/architecture guide for Claude Code
├── spec.md              # this file — phase-by-phase implementation roadmap
└── 11 - Bookings Final Project (Reactive Web).pdf   # original assignment brief
```

---

## Phase 1 — Project Foundation

**Goal:** the data model matches the PDF exactly and the database is ready to build features on.

**Status: Done.**

- **Task 1: Implement Models** — `Room`, `Booking`, `Amenity`, `BookingStatus` enum. Room and Amenity already matched the spec; `Booking` now has `GuestFirstName`/`GuestLastName` (both `[Required][MaxLength(100)]`) in place of the old `GuestName`/`GuestEmail`, matching the PDF's data model.

- **Task 2: Configure EF Core / DbContext** — already configured as needed: `Room`→`Booking` (cascade delete), `Room`↔`Amenity` many-to-many join table, `Booking.Status` stored as string, unique index on `Room.RoomNumber`.

- **Task 3: Create/Update Database** — the `RenameBookingGuestNameFields` migration for the guest-name field change has been created and applied.

- **Task 4: Seed Initial Data** — unchanged: the existing 6 amenities + placeholder rooms (101/102/201); real `Room.xls` data replacement stays a separately-tracked, non-blocking follow-up whenever that file surfaces.

- **Task 5: Verify the foundation** — `dotnet build` succeeds, `dotnet ef database update` applies cleanly, Swagger shows the updated `Booking` shape.

**Definition of Done:** Models compile and match the PDF's entities field-for-field; migrations are current; seed data loads.
**Validation:** Run the backend, hit `GetAllRooms`/`GetAllBookings` via Swagger, confirm the response shapes match the corrected model.

---

## Phase 2 — Room Management

**Goal:** hotel staff can list, create, and edit rooms end-to-end, bug-free.

- **Task 1: Backend — Room API** — already implemented (`GetAllRooms`, `GetRoomById/{id}`, `CreateRoom`, `UpdateRoomById/{id}`, `DeleteRoomById/{id}`, with 404/409 handling).

- **Task 2: Frontend — Room UI** — `RoomListComponent`/`RoomFormComponent` are built, but `room-list.component.html` has a known broken `@if`/`@else` chain (a stray HTML comment breaks the required adjacency) that likely blocks the whole Rooms Directory from rendering. Fix it here, as part of finishing this screen — not as a separate phase.

- **Task 3: Connect Room UI to Room API** — already wired via `RoomService`; just re-confirm after the Task 2 fix.

- **Task 4: Test the complete Room flow** — create, edit, and delete a room through the browser UI; confirm the error state now displays correctly (stop the backend, reload, confirm the message appears instead of a false "no rooms" empty state).

**Definition of Done:** Rooms Directory renders correctly with no console/template errors; full create/edit/delete flow works through the UI, including duplicate-room-number (409) and validation feedback.

**Validation:** Manual browser walkthrough of create → edit → delete, plus the error-state check above.

---

## Phase 3 — Booking Management (List, Search, Create)

**Goal:** hotel staff can see existing bookings, search them, and create a new one by finding an available room.

- **Task 1: Backend — Booking API** — `BookingsController`'s CRUD + `SearchBookings` already exist, and `SearchBookings` already filters on Phase 1's `GuestFirstName`/`GuestLastName` fields. Still needed: a new endpoint implementing the PDF's cheapest-available-room query (adults/children capacity check, no overlapping non-canceled booking for the requested dates, cheapest price wins) — e.g. `GET /api/Rooms/GetAvailableRoom`.

- **Task 2: Frontend — Booking List UI** — build `BookingListComponent` for real: table (Guest Last Name, Guest First Name, Room Number, Check In/Out Dates, Status), guest-name + status search, "New Booking" link. Signals for loading/error/data, same convention as `RoomListComponent`.

- **Task 3: Frontend — Create Booking UI** — build `BookingFormComponent` as the PDF's two-step flow: fill guest/date/party-size fields → **Get Available Room** → once a room is found, show it with **Book Room**/**Back** → **Book Room** creates the booking and returns to the list. Validators mirror the backend rules (dates required, checkout > checkin, ≥1 adult, children ≥ 0).

- **Task 4: Connect frontend to backend** — wire `BookingService`'s `getAll`, `getById`, `create`, `search` to the real routes above, mirroring `RoomService`'s pattern (404→`undefined` on `getById`).

- **Task 5: Test the complete Booking flow** — create several bookings with varying dates/party sizes; confirm the available-room logic always returns the cheapest valid room and correctly excludes conflicting ones; confirm the list and search reflect the new data.

**Definition of Done:** A clerk can list, search, and create bookings end-to-end against real data, with the available-room search behaving per the PDF's rule.
**Validation:** As Task 5, plus re-verifying against Swagger/curl that the available-room query excludes a room with an overlapping booking.

**Depends on:** Phase 1 (model) and Phase 2 (real rooms to book).

---

## Phase 4 — Booking Lifecycle (Check-in / Check-out / Cancel)

**Goal:** a booking can be canceled, checked in (on its check-in date), and checked out (any time after check-in), each from the Booking Detail screen.

- **Task 1: Backend** — no new endpoint needed; `UpdateBookingById` already supports changing `Status`. Just confirm it's exercised correctly for this purpose.

- **Task 2: Frontend — Booking Detail UI** — build `BookingDetailComponent`: read-only booking info plus conditional action buttons per the PDF's exact rules — **Cancel** while `Booked`; **Check-In** while `Booked` and `CheckInDate` is today; **Check-Out** while `CheckedIn`.

- **Task 3: Connect Detail UI to Booking API** — each action calls `BookingService.update(id, { ...booking, status: <newStatus> })` and refreshes the view.

- **Task 4: Test the complete lifecycle** — walk one booking through Booked → Check-In (only possible on its check-in date) → Check-Out; walk a second through Booked → Cancel; confirm only the valid action(s) ever appear.

**Definition of Done:** Every booking's detail page shows exactly the actions valid for its current status/date, and each action reliably updates it.
**Validation:** As Task 4 — a full manual lifecycle walk covering both the check-in/out path and the cancel path.

**Depends on:** Phase 3 (needs real bookings to operate on).

---

## Phase 5 — Homepage

**Goal:** the homepage shows today's real check-ins/check-outs with working inline actions.

- **Task 1: Backend** — decide during implementation whether to filter existing `GetAllBookings`/`SearchBookings` results client-side for "today", or add a small dedicated endpoint for today's check-ins/check-outs; either is fine architecturally.

- **Task 2: Frontend — Homepage UI** — replace `landing-page.component.ts`'s hardcoded `CHECKING_IN_TODAY`/`CHECKING_OUT_TODAY` arrays with real data; add a small shared "LastName, FirstName" guest-name formatter (a good fit for the currently-empty `frontend/src/app/shared/`, since it's used here and on the Bookings screens too).

- **Task 3: Connect Homepage to Booking API** — wire the real data plus inline **Check-In**/**Check-Out** buttons on each row, reusing Phase 4's status-update logic directly (no navigation to Booking Detail needed).

- **Task 4: Test the complete Homepage flow** — create bookings dated today via the Phase 3 flow, reload the homepage, confirm they appear in the right list with correct formatting, and that the inline actions update status without navigating away.

**Definition of Done:** Homepage shows real today's activity with correctly formatted names and working inline check-in/check-out.
**Validation:** As Task 4.

**Depends on:** Phase 3 (data) and Phase 4 (shared status-update logic).

---

## Phase 6 — Room Amenities

**Goal:** amenities can be viewed, added, and removed on a room.

- **Task 1: Backend — Amenities API** — add endpoints to list the 6 seeded amenity types, add an amenity to a room, and remove one; reuse the existing 409-on-duplicate pattern (the DB's composite key on the join table already prevents duplicates — catch and return 409, same as `RoomNumber`).

- **Task 2: Frontend — Amenities UI** — extend `RoomFormComponent`'s template with an Amenities section (list with Delete per row, "Add New" for types not already on the room), matching the PDF's Room Detail screenshot.

- **Task 3: Connect Amenities UI to API.**

- **Task 4: Test the complete Amenities flow** — add/remove amenities on a room; confirm a duplicate add is rejected with a friendly message; reload to confirm persistence.

**Definition of Done:** A room's amenities can be fully managed through the UI, matching the spec; duplicates are blocked.
**Validation:** As Task 4.

**Depends on:** Phase 2 (Room Form exists to extend). Independent of Phases 3–5 — can be done in parallel.

---

## Phase 7 — Occupancy Chart

**Goal:** the homepage shows a 7-day occupancy forecast chart.

- **Task 1: Backend — Occupancy API** — endpoint returning 7 data points (date + occupancy %) starting today (occupied rooms with a non-canceled booking covering that date ÷ total rooms × 100).

- **Task 2: Frontend — Chart UI** — a small custom inline-SVG line chart component (no new npm dependency), day-labeled x-axis, 0–100 y-axis.

- **Task 3: Connect Chart UI to Occupancy API**, place it on the homepage per the PDF's layout.

- **Task 4: Test the complete Occupancy flow** — seed bookings across a few of the next 7 days; verify the chart's percentages by hand for 2–3 of them.

**Definition of Done:** Homepage shows an accurate 7-day occupancy chart.
**Validation:** As Task 4.

**Depends on:** Phase 3 (needs real booking data to compute against). Independent of Phase 6.

---

## Phase 8 (Optional) — Room Service Extra Challenge

**Goal:** a clerk can request a paid service against a room.

- **Task 1: Backend** — new `RoomServiceType` (Id, Name, IsActive) and `RoomService` (Id, BookingId, RoomServiceTypeId, Date, Amount) entities + migration + seed data. Note: the PDF's entity diagram doesn't show a price on `RoomServiceType`, but its mockup implies an auto-computed total — resolve this (likely add a price field) before starting.
- **Task 2: Frontend** — a homepage widget: pick a room, pick a service type, see the computed price, confirm via **Request**.

- **Task 3: Connect widget to API.**

- **Task 4: Test the complete Room Service flow** — request a service against a real checked-in booking; confirm it's recorded with the right amount.

**Definition of Done:** A room service request can be made end-to-end and is correctly recorded.
**Validation:** As Task 4.

**Depends on:** everything else being done first (optional, last priority).

---

## Overall dependency order

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5, with Phase 6 and Phase 7 both branching off after Phase 3 (independent of each other and of Phases 4–5, so they can be done in parallel or in either order). Phase 8 is last, optional, and depends on the whole app being stable.

## Closing note

Add frontend unit tests alongside each phase's Task 4 rather than batching them at the end (only 2 trivial/routing specs exist today). Update `CLAUDE.md` once Phases 1–7 are done, since several of its current statements (e.g. "BookingService is still a stub…") will be stale by then.
