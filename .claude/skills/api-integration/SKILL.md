---
name: api-integration
description: Conventions for wiring an Angular feature in BookingApp's frontend to the real ASP.NET Core 8 backend (or extending an existing wired feature) — HttpClient usage, feature service shape, environment.apiBaseUrl, keeping HTTP out of components, signal-based loading/error state, and handling 400/404/409 responses. Use this whenever a task involves connecting a component to a backend endpoint, replacing stub/mock data in a service with a real API call, adding a new method to RoomService/BookingService (or a future feature service), or debugging why a component isn't showing data/errors from an HTTP call. Also use it before adding any repository, CQRS, MediatR, or generic API-abstraction layer to check whether it's actually warranted in this project.
---

# API integration (Angular ↔ ASP.NET Core)

BookingApp deliberately keeps both sides of the stack flat: controllers talk to `AppDbContext` directly with no
repository/service layer, and Angular components talk to a small per-feature service with no repository/state-management
layer either. `RoomService` (`frontend/src/app/rooms/services/room.service.ts`) is the fully-wired reference
implementation — when in doubt, read it before writing new integration code.

## 1. HTTP calls live in a feature service, never in a component

Each feature folder (`rooms/`, `bookings/`, and any future one) owns one service in `<feature>/services/<feature>.service.ts`
that is the *only* place `HttpClient` gets injected for that feature. Components inject the service, call a method, and
subscribe to the returned `Observable` — they never call `HttpClient` directly and never build a URL themselves.

Why this matters here specifically: components already carry loading/error/form state; folding HTTP concerns into them
too makes them harder to test and duplicates the base-URL/error-mapping logic across every place that happens to need
the same endpoint. One service per feature keeps that logic in exactly one place, matching the "no extra layers, but
some separation" balance the rest of the project already strikes.

```ts
@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  getAll(): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.baseUrl}/api/Rooms/GetAllRooms`);
  }
  // getById / create / update / delete follow the same shape
}
```

## 2. Never hardcode the backend URL

The base URL always comes from `environment.apiBaseUrl` (`src/environments/environment.ts` and
`environment.development.ts`, swapped by the `development` build's `fileReplacements` in `angular.json`). Don't write
`http://localhost:5255` anywhere else — if a second place ever needs the base URL, that's a sign it belongs in the
feature service, not copy-pasted.

## 3. Only call routes that already exist on the backend — check the controller first

Backend routes are explicit, action-style, and *not* REST-conventional (`GET /api/Rooms/GetAllRooms`, not
`GET /api/rooms`). Before writing a service method, open the matching controller
(`backend/BookingApp.Api/Controllers/*.cs`) and copy the exact `[Http*]` route — don't guess a resource-style URL, and
don't assume an endpoint exists because a similar one does on another controller.

Current Rooms routes (`RoomsController`, base `api/Rooms`), all implemented and used by `RoomService`:

| Method | Route | Used for |
|---|---|---|
| GET | `/GetAllRooms` | list |
| GET | `/GetRoomById/{id}` | load one room (edit form) |
| POST | `/CreateRoom` | add room |
| PUT | `/UpdateRoomById/{id}` | edit room |
| DELETE | `/DeleteRoomById/{id}` | delete room |

Bookings routes exist on `BookingsController` (`GetAllBookings`, `GetBookingById/{id}`, `CreateBooking`,
`UpdateBookingById/{id}`, `DeleteBookingById/{id}`, `SearchBookings`) but **`BookingService` is still a stub** — none of
its methods call `HttpClient` yet. If a task needs Bookings wired up, that's exactly this pattern applied to
`booking.service.ts`, following `RoomService` as the template.

If the frontend genuinely needs data or an action the backend doesn't expose yet, don't invent a new controller action
mid-task — flag it and confirm with the user first (the same way the CORS policy and the `Room.Bookings`/`Amenities`
default-initialization fix were confirmed before touching the backend in this project's history). Adding a backend
endpoint is a bigger, shared-surface change than adding a frontend service method.

## 4. Reuse the existing models — don't create parallel types

`room.model.ts` / `booking.model.ts` already mirror the C# entities field-for-field (camelCase, matching ASP.NET Core's
default JSON casing). Use them as both the request and response type for HTTP calls. Don't define a second
"CreateRoomRequest"-style DTO type on the frontend — the backend doesn't have one either (the same `Room`/`Booking`
class is both the EF entity and the API body), so mirroring that on the frontend keeps the two sides symmetric.

One real gotcha this surfaced: `Room` on the backend also carries `Bookings`/`Amenities` navigation collections, which
now default to `= new()` specifically so that a frontend payload which omits them (because the Angular `Room` model
doesn't have them) doesn't get rejected by ASP.NET Core's implicit-required validation. If a future entity gains a
similar non-nullable navigation property, check whether the same default is needed before wiring a form to it.

## 5. Loading and error state must be signals, not plain properties

This app runs **zoneless** (no `zone.js`). A plain class property assigned inside an RxJS `.subscribe()` callback does
not trigger a re-render — the request will succeed but the view will keep showing "Loading…" forever, silently. Use
`signal()` for anything set from inside a service call, and call `.set()` from the `next`/`error` callbacks:

```ts
readonly rooms = signal<Room[]>([]);
readonly loading = signal(false);
readonly error = signal(false);

loadRooms(): void {
  this.loading.set(true);
  this.error.set(false);
  this.roomService.getAll().subscribe({
    next: (rooms) => { this.rooms.set(rooms); this.loading.set(false); },
    error: () => { this.error.set(true); this.loading.set(false); },
  });
}
```

Template reads the signal as a function call (`@if (loading()) { … }`, `@for (room of rooms(); …)`), matching
`RoomListComponent`. If a component's data seems "stuck" after a successful network call, this is the first thing to
check.

## 6. Handling validation (400) and conflict (409) responses

- **400** comes from `[ApiController]`'s automatic DataAnnotations validation (`[Required]`, `[Range]`, etc. on the
  entity) — the frontend's Reactive Forms validators should already mirror those constraints (see `RoomFormComponent`),
  so a 400 in practice usually means the two have drifted out of sync, not that the user needs to see the raw
  ProblemDetails body.
- **409** signals a business-rule conflict a validator can't catch client-side — e.g. `RoomsController` proactively
  checks for a duplicate `RoomNumber` before insert/update and returns 409. Map this to a short, specific inline
  message instead of a generic failure:

```ts
error: (err: { status?: number }) => {
  this.submitError.set(
    err?.status === 409 ? 'A room with this number already exists.' : 'Something went wrong. Please try again.'
  );
}
```

- **404** on a "get one" call (e.g. `getById`) is often an expected, non-exceptional case (bad id in the URL) rather
  than a failure — `RoomService.getById` catches a 404 and resolves to `undefined` instead of propagating an error, so
  the component can show a "not found" state rather than a generic error state. Follow this pattern for any new
  `getById`-style method.

## 7. Don't add layers this project doesn't use

No Repository/Unit-of-Work/CQRS/MediatR on the backend, and no NgRx/state-management library, HTTP interceptor
pipeline, or generic `ApiService`/base-service abstraction on the frontend. A "helper" that wraps `HttpClient` to avoid
repeating `environment.apiBaseUrl` is tempting but unnecessary — a private `baseUrl` field on each feature service (as
`RoomService` already does) is enough indirection for a project this size. If a task seems to call for one of these
patterns, that's a signal to re-check the actual requirement rather than default to it — this codebase's explicit
choice (see root `CLAUDE.md`) is to stay flat and beginner-friendly on both sides.
