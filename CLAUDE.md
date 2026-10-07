# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Keep this file current:** whenever a project-level change introduces a new architecture decision, convention, workflow, tool, or API integration that makes this file outdated, review and update it before considering the task complete.

## Project

BookingApp is a learning project: a full-stack booking application built step-by-step to understand the flow from UI to database and back. `spec.md` (repo root) is the phase-by-phase implementation roadmap — check it for what's done, in progress, or planned before assuming a feature's status.

- **Backend:** ASP.NET Core 8 Web API, C#, EF Core, SQLite — `backend/BookingApp.Api/`, served at `http://localhost:5255/` (Swagger UI at `/swagger`).
- **Frontend:** Angular 22 (standalone components, zoneless — no `zone.js`), TypeScript — `frontend/`, served at `http://localhost:4200/` via `ng serve`.

## Commands

### Backend (run from `backend/BookingApp.Api/`)

```
dotnet build                          # compile
dotnet run                            # serve at http://localhost:5255 (Swagger UI at /swagger)
dotnet ef migrations add <Name>       # add a migration after model changes
dotnet ef database update             # apply migrations to bookings.db (SQLite file in this folder)
```

There is no backend test project yet — verify endpoint behavior by running the API and exercising it with curl or Swagger.

**Windows dev gotcha:** `dotnet run` locks `bin/Debug/net8.0/BookingApp.Api.exe` while the process is running. If a previous instance is still up on port 5255, a new `dotnet run` fails with `MSB3027`/`address already in use`. Stop the existing `BookingApp.Api` process first before rebuilding.

### Frontend (run from `frontend/`)

```
npm start                             # ng serve, dev server (http://localhost:4200)
npx ng build                          # production build
npx ng test --watch=false             # run unit tests once (Vitest via @angular/build:unit-test, not Karma)
```

## Backend architecture

- **No layering beyond controllers + EF Core, by deliberate choice.** Controllers use `AppDbContext` directly. Do not introduce Repository/Unit-of-Work/CQRS/MediatR/service-layer abstractions unless explicitly asked — this project intentionally stays beginner-friendly and flat.
- **Controllers use explicit, non-RESTful action-style routes** (e.g. `GET /api/Bookings/GetAllBookings`), not the plain resource-style routes (`GET /api/rooms/{id}`) you'd default to — check the `[HttpGet]`/`[HttpPost]` attributes in the controller before assuming a URL shape.
- **No separate DTO layer:** entities double as the request/response bodies for their endpoints. Any new non-nullable reference/collection property added to an entity used as an API payload needs a non-null default (e.g. `= new()`), or ASP.NET Core's implicit-required validation will reject every create/update request with a 400.
- Deleting a `Room` cascades and silently deletes its `Booking`s (`ON DELETE CASCADE`) — a destructive side effect to keep in mind before touching Room deletion.
- `Booking.Status` is stored in SQLite and serialized over JSON as a string, not a number — keep the conversions in `AppDbContext`/`Program.cs` in sync if the enum changes.
- Returning an entity `.Include()`-ing a related entity that has a back-reference (e.g. `Booking` → `Room`) can create a JSON serialization cycle via EF Core's inverse-navigation fixup. `BookingsController` shows the pattern for clearing the back-reference before returning; `ReferenceHandler.IgnoreCycles` in `Program.cs` is only a safety net, not a fix.
- Seed data (`AppDbContext.OnModelCreating`) is explicitly placeholder, not real room data — don't treat it as final.

## Frontend architecture

- **Standalone Angular components throughout** — no `NgModule`s.
- **Zoneless — no `zone.js` dependency.** Component state that changes from outside Angular-tracked bindings (most notably inside an RxJS `.subscribe()` callback) must be held in a signal (`signal()` + `.set()`), not a plain class property, or the view won't re-render even though the request succeeded. `RoomListComponent`/`RoomFormComponent` are the reference implementations for this pattern.
- **Feature-folder structure**: `bookings/`, `rooms/`, and `landing/` each own their `components/`/`models/`/`services/`, independent of each other. `shared/` is reserved for cross-feature code.
- Route order matters in `app.routes.ts`: static segments (e.g. `bookings/new`) must be listed before parameterized ones (`bookings/:id`) or the param route will shadow them. When adding a route, add a case to `app.routes.spec.ts` rather than only eyeballing it in the browser.
- **API base URL comes from `environment.apiBaseUrl`** (`src/environments/`) — don't hardcode the backend URL elsewhere.
- Not every feature service is wired to the real backend yet — check the actual service (`HttpClient` calls vs. RxJS `of(...)` stubs) before assuming a feature is live rather than mocked.
- **Reactive Forms convention**: `@angular/forms`' `ReactiveFormsModule` with `FormBuilder.nonNullable.group(...)`; validators mirror the backend's DataAnnotations; validation messages show once a control is both `invalid` and `touched`. No form/validation library beyond `@angular/forms`.
- **UI is implemented per-screen from Figma as each screen is built** (see below) — a component not yet touched still renders a bare placeholder heading. Don't add UI elements, copy, or interactions that aren't present in the Figma frame, and don't describe a flow as more complete/connected than the actual services behind it.

## Figma design workflow

Figma is the source of truth for all UI implementation in this project — match layout, spacing, typography, colors, borders/radii, and stated responsive behavior from the actual Figma frame rather than inventing or extending a design. The design file's key is `ScrUD5Gq1dFyXdeoPDE2Og`; always confirm the node-id for a screen from the user rather than guessing.

Workflow when implementing or updating a screen:
1. Use the Figma MCP tools against the given node — `get_design_context` for the implementation reference, `get_metadata`/`get_screenshot` only to orient or double-check exact sizing.
2. Adapt the returned reference to this project's actual stack: plain Angular templates + component-scoped CSS (no Tailwind, no UI/component library installed).
3. Download any icon/image assets referenced by the design and commit them locally rather than linking to Figma's exported URLs — those URLs expire after about 7 days.
4. Don't add UI elements, copy, or interactions that aren't present in the Figma frame.

## `.claude` configuration

This repository has project-committed Claude Code configuration under `.claude/`:

- **Subagents** (`.claude/agents/`, both read-only): `code-reviewer` reviews files/changes against this project's conventions via the `code-review` skill; `api-debugger` diagnoses Angular ↔ ASP.NET Core integration bugs via the `api-integration` skill.
- **Skills** (`.claude/skills/`): `code-review` is the full review checklist; `api-integration` covers frontend↔backend wiring conventions.
- **Hooks** (`.claude/settings.json`, `.claude/hooks/`): file-protection on writes/edits to `.env*`, production config, and any DB file; a post-write hook (currently a logging placeholder, not a real formatter); a build/test gate that blocks completion on `Stop` if `dotnet build` / `ng build` / `ng test` fail; shared logging across all hooks.
