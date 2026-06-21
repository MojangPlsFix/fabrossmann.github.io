# Astro Portfolio Rewrite — Design

**Date:** 2026-06-21
**Status:** Approved (phase 1 scope)

## Context

The current site (`fabrossmann.github.io`) is a single hardcoded `index.html` from ~2018 (Bootstrap Material Design + jQuery + particles.js). Several facts on the page are stale (age, "currently attending school," 2018 copyright) because every change requires manually editing markup. This rewrite replaces the site with an Astro project, restructures the visual design, and makes date-derived facts compute automatically instead of going stale.

## Goals (phase 1 — this spec)

1. Preserve the current live site by branching it off as `legacy` before rewriting `master`.
2. Rebuild the site in Astro, deployed via GitHub Actions to GitHub Pages.
3. Make date-derived content (age, copyright year, experience durations) compute at build time from real anchor dates, instead of hardcoded numbers.
4. Carry over all existing content sections, refreshed with current facts and a new visual theme.
5. Rework the About Me section, which the owner flagged as outdated/low-quality in its current bullet-trivia format.

## Explicit non-goals (phase 2 — later, not this spec)

- Making the CV section more compact.
- Removing the Skills section's proficiency progress bars and replacing them with a "past work / where I used this" format.

Phase 1 carries the Skills and CV sections over functionally as-is (re-themed visually, not restructured). Phase 2 will be its own brainstorming/spec/plan cycle.

## Branch strategy

- `legacy` branch created locally from current `master` tip (commit `97b9f4e`), preserving the old site exactly as it is.
- Before rewriting `master`, push `legacy` to `origin` too (confirm with owner first — it's a push to shared remote).
- `master` becomes the Astro source going forward.

## Tech stack & architecture

- **Astro**, scaffolded via `npm create astro@latest` (TypeScript template). Requires Node ≥ v22.12 (even-numbered); v24.14 already installed locally.
- **`@astrojs/react`** integration + **Tailwind CSS** + **shadcn/ui**, installed per `https://ui.shadcn.com/docs/installation/astro` (`pnpm dlx shadcn@latest init -t astro` or npm equivalent).
  - shadcn components used directly in `.astro` files where static (Card, Badge, Button).
  - Only genuinely interactive components (project-detail Dialog, light/dark toggle) get a `client:` hydration directive — the rest of the page ships zero component JS.
- **Astro Content Collections** for repeatable structured content:
  - `timeline` collection — one entry per education or experience item, with a `category: "education" | "experience"` field, `org`, `title`, `url?`, `startDate`, `endDate` (nullable/absent = ongoing). Dates are stored as ISO strings at whatever precision the underlying fact has (year-only `"2018"` for the internships, year-month `"2020-02"` for the Knapp role) — `formatDateRange()` renders each entry at its stored precision rather than forcing all entries to the same granularity.
  - `projects` collection — one entry per project (`title`, `description`, `url?`, `image?`, `tags?`).
  - `qualifications` collection — one entry per qualification group (`group` e.g. "CCNA R&S", `items: string[]`).
- A small typed **`src/data/profile.ts`** module (not a collection — it's one record, not a set of entries) holding scalar personal facts used in dynamic calculations:
  - `birthDate: "2000-01-15"` (full precision — needed for exact age)
  - `codingSinceYear: 2011`
  - `knappStartDate: "2020-02"` (year-month precision, per the date precision note above)
  - `myftbStartDate: "2018-12"`
  - name, current title, social links (GitHub, LinkedIn, email)
- **`src/lib/dates.ts`** — utility functions: `calculateAge(birthDate)`, `yearsSince(date)`, `formatDateRange(start, end)`. Called at build time by the components that render About Me, the timeline, and the footer.
- **`@astrojs/sitemap`** integration to regenerate `sitemap.xml` (replacing the old hand-written one).

## Content inventory (real data for this rewrite)

**Profile**
- Fabian Roßmann, born 2000-01-15 (Austrian)
- Coding since ~2011 (age 11)
- Currently: Software Engineer at Knapp Systemintegration GmbH (since ~Feb 2020)
- Side project: Admin + Developer at MyFTB (volunteer, since Dec 2018, ongoing)

**Education** (`timeline`, category: education)
- WIKU BRG Graz — secondary school — 2010–2014
- HTL Pinkafeld — Matura — 2014–2019 (completed; site currently wrongly shows "2014–Present")
- TU Graz — Computer Science — 2019–2024 (left without completing degree; display as a date range, not a conferred degree)

**Experience** (`timeline`, category: experience)
- Internship — Medical University of Graz (IT dept) — 2016
- Internship — Medical University of Graz (IT dept) — 2017
- Internship — Knapp Systemintegration GmbH — 2018
- Software Engineer — Knapp Systemintegration GmbH — Feb 2020–present (ongoing)

**Projects** (`projects`) — keep existing 3, refresh copy/status:
- Diploma thesis: online consulting platform for people with addictions (Caritas Steiermark) — update from "currently working on it" to completed/finished framing.
- Med Uni Graz iOS app (Map/News/Events).
- MyFTB — update description to reflect current Admin + Developer role, not just "voluntary developer."

**Qualifications** (`qualifications`) — kept as its own section, unchanged from current site:
- CCNA R&S: Introduction to Networks, Routing & Switching Essentials, Scaling Networks
- Entrepreneurship/Economy: Entrepreneurship in Engineering, regional JA Austria Junior Company Competition winner, best sales pitch at Virtual Enterprise Fair Burgenland

## Information architecture (phase 1 section order)

Hero → About Me (reworked) → Resume (Education + Experience timeline) → Extra Qualifications → Skills (carried over as-is, re-themed only) → Projects → Contact.

## About Me rework

Replace the bullet trivia list (Age/Nationality/Job/Languages/Hobbies/Phone/Fav OS/Things I love) with:
- A short bio paragraph: current role at Knapp, how they got into programming, the MyFTB project — written as prose.
- A handful of scannable fact-chips (shadcn Badge): e.g. "Software Engineer since 2020", "Coding since 2011 → {dynamic years} yrs", "Austria" — dynamic where the data is dynamic.
- Drop entirely: Phone, Fav. OS, "Things I love" bullets (low signal, dated tone).
- Hobbies (sailing, PC hardware, gaming) folded into the bio prose as a brief human touch, not a bulleted spec sheet.
- Nationality/location mentioned briefly in prose or as a fact-chip, not a bare bullet.

## Dynamic data

Computed at Astro build time via `src/lib/dates.ts`, fed by `src/data/profile.ts` and the `timeline` collection's dates:

| Field | Source | Computation |
|---|---|---|
| Age | `profile.birthDate` | `calculateAge()` |
| Footer copyright year | build time `Date.now()` | current year |
| "Years coding" badge | `profile.codingSinceYear` | `yearsSince()` |
| "Years at Knapp" / "Years at MyFTB" badges | `profile.knappStartDate` / `myftbStartDate` | `yearsSince()` |
| Timeline duration labels | each `timeline` entry's `startDate`/`endDate` | `formatDateRange()`, e.g. "Feb 2020 – Present (6 yrs)" |

**Freshness caveat:** since Astro outputs a static site, these values are only as current as the last build. To avoid the owner needing to push a commit just to bump a number, the GitHub Actions deploy workflow runs on a **monthly schedule** (`on: schedule`) in addition to every push to `master`.

## Visual theme

- shadcn/ui clean neutral default theme as the base (light + dark mode via CSS variables/toggle).
- Accent color: **Terracotta/Brick** — `#C2410C` in light mode, `#E07A4D` in dark mode.
- Hero redesigned as a clean typographic layout; the particles.js animated background is dropped as part of the visual refresh (not carried over).
- Old Bootstrap modals for project details become shadcn `Dialog` components.

## Deployment

- GitHub Actions workflow: checkout → setup Node → install → `astro build` → `actions/upload-pages-artifact` → `actions/deploy-pages`.
- Triggers: push to `master`, plus a monthly `schedule` trigger (for dynamic-data freshness, see above).
- **One manual step required from the repo owner** (cannot be done via git): change repo **Settings → Pages → Source** from "Deploy from a branch" to **"GitHub Actions"**.
- Carry over the existing `google-site-verification` meta tag so Search Console verification isn't lost.
- Replace the hand-written `sitemap.xml` with `@astrojs/sitemap`'s generated one.
- No custom domain/CNAME currently in use — site continues to serve from the bare `fabrossmann.github.io` domain.

## Risks / open items

- TU Graz entry shows a date range without a conferred degree — wording needs to be honest but not awkward (e.g. "Computer Science studies" rather than implying a completed degree). Exact copy is an implementation detail, not a design blocker.
- Monthly rebuild schedule means age/duration counters can lag up to ~1 month behind real time; acceptable trade-off versus manual upkeep.
