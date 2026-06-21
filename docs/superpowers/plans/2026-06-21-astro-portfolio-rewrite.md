# Astro Portfolio Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded 2018-era `index.html` portfolio with an Astro + shadcn/ui site whose age/experience/duration figures compute automatically from real dates instead of being hand-edited.

**Architecture:** Astro (TypeScript) with `@astrojs/react` + Tailwind v4 + shadcn/ui for components; Astro Content Collections hold resume/project/qualification records; a small typed `profile.ts` holds scalar personal facts; a pure-function date-math module computes ages/durations at build time; GitHub Actions builds and deploys to GitHub Pages on every push plus a monthly schedule (so figures stay fresh without manual commits).

**Tech Stack:** Astro 6.x, TypeScript (strict), Tailwind CSS v4 (`@tailwindcss/vite`), `@astrojs/react` 5.x + React 19, shadcn/ui (Radix base, Nova preset → Lucide icons + Geist font), Vitest (date-utility unit tests), `@astrojs/sitemap`, GitHub Actions (`withastro/action` + `actions/deploy-pages`).

**Reference spec:** `docs/superpowers/specs/2026-06-21-astro-portfolio-rewrite-design.md`

**Verified facts this plan relies on** (checked live against the actual tools on 2026-06-21, not assumed from training data):
- `create-astro` refuses to scaffold into a non-empty directory — it silently creates a sibling folder instead. We scaffold into a temp sibling dir, then move files into the repo root.
- Astro is currently v6.4.7; Node engine requirement is `>=22.12.0` (this machine has v24.14.0 — fine).
- The `with-tailwindcss` official template already wires up Tailwind v4 via `@tailwindcss/vite` (one-line `@import "tailwindcss";` in CSS, no `tailwind.config.js`, no `astro add tailwind`).
- `astro add react` produces `@astrojs/react@^5.0.7` + `react@^19.2.7` and registers `react()` in `astro.config.mjs` automatically.
- `shadcn@latest init` requires the `@/*` path alias in `tsconfig.json` to already exist, and requires explicit `--base radix --preset nova` flags to run non-interactively (the interactive menu otherwise prompts twice). It correctly detects Tailwind v4 and writes `components.json`, `src/lib/utils.ts`, `src/components/ui/button.tsx`, and rewrites `src/styles/global.css` with neutral OKLCH theme variables + Geist font + Lucide icons.
- `npx shadcn@latest add card badge dialog progress separator avatar` works and creates one file per component under `src/components/ui/`.
- `astro add sitemap` produces `@astrojs/sitemap@^3.7.3` and registers `sitemap()` automatically.
- The official Astro→GitHub Pages workflow uses `withastro/action@v6` (handles install+build internally) + `actions/deploy-pages@v5` — no hand-rolled Node setup/build steps needed.

---

## File Structure

```
fabrossmann.github.io/
├── .github/workflows/deploy.yml       # CI: build + deploy (push to master + monthly schedule)
├── public/
│   ├── images/{me,project1,project2,project3}.{jpg,png}
│   └── cv.pdf
├── src/
│   ├── components/
│   │   ├── Hero.astro
│   │   ├── AboutMe.astro
│   │   ├── ResumeTimeline.astro
│   │   ├── TimelineEntry.astro
│   │   ├── Qualifications.astro
│   │   ├── Skills.astro
│   │   ├── Projects.astro
│   │   ├── ProjectDialog.tsx          # React island (shadcn Dialog) — the only interactive project bit
│   │   ├── ThemeToggle.tsx            # React island (light/dark)
│   │   └── ui/                        # shadcn-generated: button, card, badge, progress, separator, avatar, dialog
│   ├── content/
│   │   ├── timeline/*.md              # 7 entries: education + experience
│   │   ├── projects/*.md              # 3 entries
│   │   └── qualifications/*.md        # 2 entries
│   ├── content.config.ts              # collection schemas
│   ├── data/profile.ts                # scalar personal facts (not a collection — one record)
│   ├── lib/
│   │   ├── dates.ts                   # calculateAge, yearsSince, formatDateRange
│   │   └── dates.test.ts
│   ├── layouts/BaseLayout.astro
│   ├── pages/index.astro
│   └── styles/global.css
├── astro.config.mjs
├── tsconfig.json
├── components.json                    # shadcn config
└── package.json
```

Each component file has one section's worth of responsibility; `dates.ts` and `profile.ts` are the only shared logic/data modules, imported wherever a date or personal fact is needed — this keeps the "don't hand-edit stale facts" goal centralized in two small files instead of scattered across markup.

---

### Task 1: Scaffold Astro into the repo, migrate assets, remove the old static site

**Files:**
- Create: `astro.config.mjs`, `tsconfig.json`, `package.json`, `package-lock.json`, `src/pages/index.astro` (template placeholder, replaced in Task 14), `public/favicon.svg`, `public/favicon.ico`
- Create: `public/images/me.jpg`, `public/images/project1.jpg`, `public/images/project2.jpg`, `public/images/project3.png`, `public/cv.pdf`
- Modify: `.gitignore`
- Delete: `index.html`, `resources/`, `sitemap.xml` (old hand-written one — replaced in Task 15)

- [ ] **Step 1: Push the `legacy` branch to origin**

  ⚠️ This pushes to the shared remote — confirm with the user before running it, do not run unattended.

  ```bash
  git push -u origin legacy
  ```
  Expected: `legacy` branch now visible on the remote, preserving the current live site permanently.

- [ ] **Step 2: Scaffold the Astro template into a temp sibling directory**

  ```bash
  cd ..
  npm create astro@latest -- ./portfolio-scaffold --template with-tailwindcss --no-install --no-git --yes
  ```
  Expected output ends with `✔ Project initialized!` and `Template copied`. This creates `../portfolio-scaffold` (a sibling of the repo, NOT inside it) — `create-astro` refuses to target a non-empty directory directly, which the repo root is (it has `LICENSE`, `README.md`, etc.), so scaffolding to a temp dir and merging is required.

- [ ] **Step 3: Move the scaffolded files into the repo root**

  ```bash
  cd fabrossmann.github.io
  mv ../portfolio-scaffold/astro.config.mjs .
  mv ../portfolio-scaffold/tsconfig.json .
  mv ../portfolio-scaffold/package.json .
  mv ../portfolio-scaffold/src .
  mv ../portfolio-scaffold/public .
  rm -rf ../portfolio-scaffold
  ```
  Expected: `ls` in the repo root now shows `src/`, `public/`, `astro.config.mjs`, `tsconfig.json`, `package.json` alongside the existing `LICENSE`, `README.md`, `index.html`, `resources/`.

- [ ] **Step 4: Merge `.gitignore`**

  Read the current `.gitignore` (it has `cv.docx`, `*.log`, `.superpowers/`) and replace its contents with the merged version:

  ```
  cv.docx
  *.log
  .superpowers/

  # build output
  dist/
  # generated types
  .astro/

  # dependencies
  node_modules/

  # logs
  npm-debug.log*
  yarn-debug.log*
  yarn-error.log*
  pnpm-debug.log*

  # environment variables
  .env
  .env.production

  # macOS-specific files
  .DS_Store

  # jetbrains setting folder
  .idea/
  ```

- [ ] **Step 5: Migrate the images and CV into `public/`**

  ```bash
  mkdir -p public/images
  cp resources/images/me.jpg public/images/me.jpg
  cp resources/images/project1.jpg public/images/project1.jpg
  cp resources/images/project2.jpg public/images/project2.jpg
  cp resources/images/project3.png public/images/project3.png
  cp resources/data/cv.pdf public/cv.pdf
  ```

- [ ] **Step 6: Remove the old static site**

  ```bash
  git rm -r resources index.html sitemap.xml
  ```
  Expected: git stages deletion of the old `index.html`, the entire `resources/` directory (CSS/JS/images/cv — images and cv were already copied out in Step 5), and the old hand-written `sitemap.xml` (replaced by `@astrojs/sitemap` in Task 15).

- [ ] **Step 7: Remove template demo cruft from `with-tailwindcss`**

  ```bash
  rm src/components/Button.astro src/pages/markdown-page.md
  ```

- [ ] **Step 8: Install dependencies, add the typecheck tool**

  ```bash
  npm install
  npm install -D @astrojs/check typescript vitest
  ```

- [ ] **Step 9: Uninstall unused template dependencies**

  ```bash
  npm uninstall canvas-confetti @types/canvas-confetti @astrojs/mdx
  ```
  These came with `with-tailwindcss` for its demo confetti button and an MDX integration that was never registered in `astro.config.mjs` — neither is used by this project.

- [ ] **Step 10: Add `check`/`test` scripts to `package.json`**

  Add to the `"scripts"` object:
  ```json
  "check": "astro check",
  "test": "vitest run"
  ```

- [ ] **Step 11: Verify the dev server runs**

  ```bash
  npm run dev
  ```
  Expected: server starts on `http://localhost:4321`, showing the template's placeholder page. Stop it with `q` + Enter once confirmed.

- [ ] **Step 12: Commit**

  ```bash
  git add -A
  git commit -m "Scaffold Astro project, migrate assets, remove legacy static site"
  ```

---

### Task 2: Add the React integration

**Files:**
- Modify: `astro.config.mjs`, `package.json`, `package-lock.json`, `tsconfig.json`

- [ ] **Step 1: Run the integration installer**

  ```bash
  npx astro add react --yes
  ```
  Expected: installs `@astrojs/react`, `react`, `react-dom`, `@types/react`, `@types/react-dom`; adds `import react from '@astrojs/react';` and `react()` to the `integrations` array in `astro.config.mjs`; adds `"jsx": "react-jsx", "jsxImportSource": "react"` to `tsconfig.json`'s `compilerOptions`.

- [ ] **Step 2: Verify the build still succeeds**

  ```bash
  npm run build
  ```
  Expected: exits 0, prints a `dist/` output summary.

- [ ] **Step 3: Commit**

  ```bash
  git add -A
  git commit -m "Add React integration"
  ```

---

### Task 3: Install and configure shadcn/ui

**Files:**
- Modify: `tsconfig.json`
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/progress.tsx`, `src/components/ui/separator.tsx`, `src/components/ui/avatar.tsx`
- Modify: `src/styles/global.css`, `package.json`, `package-lock.json`

- [ ] **Step 1: Add the `@/*` path alias (shadcn's init refuses to run without it)**

  In `tsconfig.json`, add `baseUrl` and `paths` to `compilerOptions`:
  ```json
  {
    "extends": "astro/tsconfigs/strict",
    "include": [".astro/types.d.ts", "**/*"],
    "exclude": ["dist"],
    "compilerOptions": {
      "jsx": "react-jsx",
      "jsxImportSource": "react",
      "baseUrl": ".",
      "paths": {
        "@/*": ["./src/*"]
      }
    }
  }
  ```

- [ ] **Step 2: Run shadcn init**

  ```bash
  npx shadcn@latest init --template astro --base radix --preset nova --yes
  ```
  Expected output ends with `Project initialization completed.` This writes `components.json` (`baseColor: "neutral"`, `iconLibrary: "lucide"`), creates `src/lib/utils.ts` and `src/components/ui/button.tsx`, and rewrites `src/styles/global.css` with the neutral OKLCH theme (light + dark), Geist Variable font import, and Tailwind v4 theme mapping.

  `--base radix --preset nova` avoid the two interactive prompts (component library, preset) that otherwise block non-interactive execution — Nova is the first/default preset (Lucide icons + Geist font), a reasonable neutral choice that we then override with our own accent color in Step 4.

- [ ] **Step 3: Add the remaining components**

  ```bash
  npx shadcn@latest add card badge dialog progress separator avatar
  ```
  Expected: `Created 6 files` under `src/components/ui/`.

- [ ] **Step 4: Override the accent color to Terracotta/Brick**

  shadcn's `--accent` CSS variable is a *neutral hover-state token* (unrelated to what we mean by "accent color" — naming collision worth knowing). The brand accent we picked lives in `--primary` (used by default buttons, links) and `--ring` (focus outline). In `src/styles/global.css`, change these two lines in the `:root` block:

  ```css
  --primary: #c2410c;
  --primary-foreground: #ffffff;
  ```
  and in the `:root` block change `--ring`:
  ```css
  --ring: #c2410c;
  ```

  Then in the `.dark` block, change the same three:
  ```css
  --primary: #e07a4d;
  --primary-foreground: #1f0a02;
  --ring: #e07a4d;
  ```

  Leave every other variable (`--accent`, `--secondary`, `--muted`, `--destructive`, etc.) untouched — they stay shadcn's neutral defaults, per the "clean default + one accent color" decision.

- [ ] **Step 5: Verify the build**

  ```bash
  npm run build
  ```
  Expected: exits 0.

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "Install shadcn/ui with neutral theme + Terracotta accent"
  ```

---

### Task 4: Date utilities (TDD) + profile data

**Files:**
- Create: `src/lib/dates.ts`, `src/lib/dates.test.ts`, `src/data/profile.ts`

- [ ] **Step 1: Write the failing tests**

  Create `src/lib/dates.test.ts`:
  ```typescript
  import { describe, it, expect } from "vitest";
  import { calculateAge, yearsSince, formatDateRange } from "./dates";

  describe("calculateAge", () => {
    it("returns the age when the birthday already happened this year", () => {
      expect(calculateAge("2000-01-15", new Date("2026-06-21"))).toBe(26);
    });

    it("returns one less when the birthday has not happened yet this year", () => {
      expect(calculateAge("2000-01-15", new Date("2027-01-14"))).toBe(26);
    });

    it("increments on the exact birthday", () => {
      expect(calculateAge("2000-01-15", new Date("2027-01-15"))).toBe(27);
    });
  });

  describe("yearsSince", () => {
    it("counts full years elapsed since a year-month date", () => {
      expect(yearsSince("2020-02", new Date("2026-06-21"))).toBe(6);
    });

    it("does not count the current year if the anniversary has not happened yet", () => {
      expect(yearsSince("2018-12", new Date("2026-06-21"))).toBe(7);
    });

    it("counts full years elapsed since a year-only date", () => {
      expect(yearsSince("2011", new Date("2026-06-21"))).toBe(15);
    });
  });

  describe("formatDateRange", () => {
    it("formats a completed multi-year range with duration", () => {
      expect(formatDateRange("2014", "2019")).toBe("2014 – 2019 (5 yrs)");
    });

    it("collapses a same-year entry to just that year", () => {
      expect(formatDateRange("2018", "2018")).toBe("2018");
    });

    it("formats an ongoing year-month range as Present with duration", () => {
      expect(formatDateRange("2020-02", undefined, new Date("2026-06-21"))).toBe(
        "Feb 2020 – Present (6 yrs)"
      );
    });
  });
  ```

- [ ] **Step 2: Run the tests to verify they fail**

  ```bash
  npx vitest run
  ```
  Expected: FAIL — `Cannot find module './dates'` (the module doesn't exist yet).

- [ ] **Step 3: Implement `dates.ts`**

  Create `src/lib/dates.ts`:
  ```typescript
  function parseToFullDate(dateIso: string): string {
    const parts = dateIso.split("-");
    const year = parts[0];
    const month = parts[1] ?? "01";
    const day = parts[2] ?? "01";
    return `${year}-${month}-${day}`;
  }

  function formatPartialDate(dateIso: string): string {
    const parts = dateIso.split("-");
    const year = parts[0];
    const month = parts[1];
    if (!month) return year;
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${monthNames[Number(month) - 1]} ${year}`;
  }

  export function calculateAge(birthDateIso: string, asOf: Date = new Date()): number {
    const birthDate = new Date(parseToFullDate(birthDateIso));
    let age = asOf.getFullYear() - birthDate.getFullYear();
    const hasNotHadBirthdayThisYear =
      asOf.getMonth() < birthDate.getMonth() ||
      (asOf.getMonth() === birthDate.getMonth() && asOf.getDate() < birthDate.getDate());
    if (hasNotHadBirthdayThisYear) {
      age -= 1;
    }
    return age;
  }

  export function yearsSince(dateIso: string, asOf: Date = new Date()): number {
    const startDate = new Date(parseToFullDate(dateIso));
    let years = asOf.getFullYear() - startDate.getFullYear();
    const hasNotReachedAnniversaryThisYear =
      asOf.getMonth() < startDate.getMonth() ||
      (asOf.getMonth() === startDate.getMonth() && asOf.getDate() < startDate.getDate());
    if (hasNotReachedAnniversaryThisYear) {
      years -= 1;
    }
    return years;
  }

  export function formatDateRange(
    startIso: string,
    endIso?: string,
    asOf: Date = new Date()
  ): string {
    const startLabel = formatPartialDate(startIso);
    if (!endIso) {
      const years = yearsSince(startIso, asOf);
      return `${startLabel} – Present (${years} ${years === 1 ? "yr" : "yrs"})`;
    }
    const endLabel = formatPartialDate(endIso);
    if (startLabel === endLabel) {
      return startLabel;
    }
    const years = yearsSince(startIso, new Date(parseToFullDate(endIso)));
    return `${startLabel} – ${endLabel} (${years} ${years === 1 ? "yr" : "yrs"})`;
  }
  ```

- [ ] **Step 4: Run the tests to verify they pass**

  ```bash
  npx vitest run
  ```
  Expected: PASS, 9 tests.

- [ ] **Step 5: Create the profile data module**

  Create `src/data/profile.ts`:
  ```typescript
  export const profile = {
    name: "Fabian Roßmann",
    title: "Software Engineer",
    location: "Austria",
    email: "fabrossmann@gmail.com",
    links: {
      github: "https://github.com/fabrossmann",
      linkedin: "https://www.linkedin.com/in/fabrossmann/",
    },
    birthDate: "2000-01-15",
    codingSince: "2011",
    knappStartDate: "2020-02",
    myftbStartDate: "2018-12",
  } as const;
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add src/lib/dates.ts src/lib/dates.test.ts src/data/profile.ts
  git commit -m "Add date-math utilities (TDD) and profile data module"
  ```

---

### Task 5: Content Collections — schema and real content

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/timeline/wiku-brg-graz.md`, `htl-pinkafeld.md`, `tu-graz.md`, `internship-meduni-2016.md`, `internship-meduni-2017.md`, `internship-knapp-2018.md`, `software-engineer-knapp.md`
- Create: `src/content/projects/caritas-platform.md`, `meduni-app.md`, `myftb.md`
- Create: `src/content/qualifications/ccna.md`, `entrepreneurship.md`

- [ ] **Step 1: Define the collection schemas**

  Create `src/content.config.ts`:
  ```typescript
  import { defineCollection } from "astro:content";
  import { glob } from "astro/loaders";
  import { z } from "astro/zod";

  const timeline = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/timeline" }),
    schema: z.object({
      category: z.enum(["education", "experience"]),
      org: z.string(),
      title: z.string(),
      url: z.string().url().optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
    }),
  });

  const projects = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      url: z.string().url().optional(),
      image: z.string().optional(),
      order: z.number(),
    }),
  });

  const qualifications = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/qualifications" }),
    schema: z.object({
      group: z.string(),
      items: z.array(z.string()),
      order: z.number(),
    }),
  });

  export const collections = { timeline, projects, qualifications };
  ```

  Note on date precision: `startDate`/`endDate` are plain strings at whatever precision the fact has (`"2018"`, `"2020-02"`) — `formatDateRange()` from Task 4 renders each at its own precision. `endDate` absent means "ongoing." A single-year entry (e.g. a 2018 internship) uses the same value for both `startDate` and `endDate`.

- [ ] **Step 2: Create the timeline entries**

  `src/content/timeline/wiku-brg-graz.md`:
  ```markdown
  ---
  category: "education"
  org: "WIKU BRG Graz"
  title: "Secondary School"
  startDate: "2010"
  endDate: "2014"
  ---
  ```

  `src/content/timeline/htl-pinkafeld.md`:
  ```markdown
  ---
  category: "education"
  org: "HTL Pinkafeld"
  title: "Matura"
  url: "https://www.htlpinkafeld.at"
  startDate: "2014"
  endDate: "2019"
  ---
  ```

  `src/content/timeline/tu-graz.md`:
  ```markdown
  ---
  category: "education"
  org: "TU Graz"
  title: "Computer Science"
  startDate: "2019"
  endDate: "2024"
  ---
  ```

  `src/content/timeline/internship-meduni-2016.md`:
  ```markdown
  ---
  category: "experience"
  org: "Medical University of Graz"
  title: "Internship — IT Department"
  url: "https://www.medunigraz.at"
  startDate: "2016"
  endDate: "2016"
  ---
  ```

  `src/content/timeline/internship-meduni-2017.md`:
  ```markdown
  ---
  category: "experience"
  org: "Medical University of Graz"
  title: "Internship — IT Department"
  url: "https://www.medunigraz.at"
  startDate: "2017"
  endDate: "2017"
  ---
  ```

  `src/content/timeline/internship-knapp-2018.md`:
  ```markdown
  ---
  category: "experience"
  org: "Knapp Systemintegration GmbH"
  title: "Internship"
  url: "https://www.knapp.com"
  startDate: "2018"
  endDate: "2018"
  ---
  ```

  `src/content/timeline/software-engineer-knapp.md`:
  ```markdown
  ---
  category: "experience"
  org: "Knapp Systemintegration GmbH"
  title: "Software Engineer"
  url: "https://www.knapp.com"
  startDate: "2020-02"
  ---
  ```
  (No `endDate` — this is the ongoing role, so `formatDateRange` renders it as "Feb 2020 – Present (N yrs)".)

- [ ] **Step 3: Create the project entries**

  `src/content/projects/caritas-platform.md`:
  ```markdown
  ---
  title: "Online Consulting Platform for People with Addictions"
  description: "Diploma thesis project built for Caritas Steiermark: a platform for people with addictions to seek aid, keep a daily diary of consumption, and video chat or message with a Caritas supervisor or other users. Designed to motivate clients to seek help and take action."
  url: "https://www.caritas-steiermark.at/"
  image: "/images/project2.jpg"
  order: 1
  ---
  ```

  `src/content/projects/meduni-app.md`:
  ```markdown
  ---
  title: "Med Uni Graz iOS App"
  description: "An iOS app for students, employees, and visitors of the Medical University of Graz, with Map, News, and Events sections giving a quick overview of campus information."
  url: "https://www.medunigraz.at/"
  image: "/images/project1.jpg"
  order: 2
  ---
  ```

  `src/content/projects/myftb.md`:
  ```markdown
  ---
  title: "MyFTB"
  description: "Admin and developer for MyFTB, the biggest German Minecraft network for modded servers, since December 2018. One of its main features is that every player gets their own world."
  url: "https://myftb.de/"
  image: "/images/project3.png"
  order: 3
  ---
  ```

- [ ] **Step 4: Create the qualifications entries**

  `src/content/qualifications/ccna.md`:
  ```markdown
  ---
  group: "CCNA R&S"
  items:
    - "Introduction to Networks"
    - "Routing & Switching Essentials"
    - "Scaling Networks"
  order: 1
  ---
  ```

  `src/content/qualifications/entrepreneurship.md`:
  ```markdown
  ---
  group: "Entrepreneurship / Economy"
  items:
    - "Entrepreneurship in Engineering"
    - "Regional winner, JA Austria Junior Company Competition"
    - "Best sales pitch, Virtual Enterprise Fair Burgenland"
  order: 2
  ---
  ```

- [ ] **Step 5: Verify the build picks up the collections**

  ```bash
  npm run build
  ```
  Expected: exits 0 with no schema validation errors (a Zod error would name the offending file and field).

- [ ] **Step 6: Commit**

  ```bash
  git add src/content.config.ts src/content
  git commit -m "Add Content Collections for timeline, projects, and qualifications"
  ```

---

### Task 6: BaseLayout + dark/light mode toggle

**Files:**
- Create: `src/layouts/BaseLayout.astro`, `src/components/ThemeToggle.tsx`
- Delete: `src/layouts/main.astro` (template's default layout, superseded)

- [ ] **Step 1: Remove the template's default layout**

  ```bash
  rm src/layouts/main.astro
  ```

- [ ] **Step 2: Create the theme toggle island**

  Create `src/components/ThemeToggle.tsx`:
  ```tsx
  import { useEffect, useState } from "react";
  import { Moon, Sun } from "lucide-react";
  import { Button } from "@/components/ui/button";

  export function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    }, []);

    function toggle() {
      const next = !isDark;
      setIsDark(next);
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
    }

    return (
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode">
        {isDark ? <Sun /> : <Moon />}
      </Button>
    );
  }
  ```

- [ ] **Step 3: Create the layout**

  Create `src/layouts/BaseLayout.astro`:
  ```astro
  ---
  import "../styles/global.css";
  import { profile } from "@/data/profile";
  import { ThemeToggle } from "@/components/ThemeToggle";

  interface Props {
    title?: string;
    description?: string;
  }
  const {
    title = `${profile.name} — ${profile.title}`,
    description = "Portfolio of Fabian Roßmann, Software Engineer.",
  } = Astro.props;
  ---
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="google-site-verification" content="QPDbfYNerfpvG95j-CXuzXi5bQdlP_fkv84RBPSCYqg" />
      <meta name="author" content={profile.name} />
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <title>{title}</title>
      <script is:inline>
        const theme =
          localStorage.getItem("theme") ??
          (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        document.documentElement.classList.toggle("dark", theme === "dark");
      </script>
    </head>
    <body>
      <header class="fixed right-4 top-4 z-50">
        <ThemeToggle client:load />
      </header>
      <slot />
      <footer class="py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {profile.name}
      </footer>
    </body>
  </html>
  ```

  The inline script uses `is:inline` so Astro emits it verbatim and synchronously in `<head>`, before first paint — this is what avoids a light-mode flash for visitors who prefer dark mode. The footer year uses `new Date().getFullYear()` directly since Astro components execute at build time; no need to route something this trivial through `dates.ts`.

- [ ] **Step 4: Verify the build**

  ```bash
  npm run build
  ```
  Expected: exits 0 (the page still has no real content yet — that's Task 14 — but the layout itself must compile).

- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "Add BaseLayout with dark/light mode toggle and carried-over meta tags"
  ```

---

### Task 7: Hero component

**Files:**
- Create: `src/components/Hero.astro`

- [ ] **Step 1: Create the component**

  ```astro
  ---
  import { Button } from "@/components/ui/button";
  import { profile } from "@/data/profile";

  const firstName = profile.name.split(" ")[0];
  ---
  <section class="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
    <p class="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">{profile.title}</p>
    <h1 class="text-5xl font-medium tracking-tight sm:text-6xl">Hi, I'm {firstName}.</h1>
    <p class="mt-4 max-w-xl text-muted-foreground">
      I build software at Knapp Systemintegration, and tinker on the side as admin &amp; developer
      for MyFTB.
    </p>
    <div class="mt-8 flex gap-3">
      <Button asChild>
        <a href="#about">About me</a>
      </Button>
      <Button asChild variant="outline">
        <a href="#contact">Get in touch</a>
      </Button>
    </div>
  </section>
  ```

- [ ] **Step 2: Verify the build**

  ```bash
  npm run build
  ```
  Expected: exits 0.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/Hero.astro
  git commit -m "Add Hero component"
  ```

---

### Task 8: About Me component

**Files:**
- Create: `src/components/AboutMe.astro`

- [ ] **Step 1: Create the component**

  ```astro
  ---
  import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import { profile } from "@/data/profile";
  import { calculateAge, yearsSince } from "@/lib/dates";

  const age = calculateAge(profile.birthDate);
  const codingYears = yearsSince(profile.codingSince);
  const knappYears = yearsSince(profile.knappStartDate);
  const myftbYears = yearsSince(profile.myftbStartDate);
  ---
  <section id="about" class="mx-auto max-w-3xl px-6 py-24">
    <h2 class="text-3xl font-medium">About Me</h2>
    <div class="mt-8 flex flex-col gap-8 sm:flex-row sm:items-start">
      <div class="flex flex-shrink-0 flex-col items-center gap-3 sm:items-start">
        <Avatar className="size-32">
          <AvatarImage src="/images/me.jpg" alt={profile.name} />
          <AvatarFallback>FR</AvatarFallback>
        </Avatar>
        <div class="text-center sm:text-left">
          <p class="font-medium">{profile.name}</p>
          <p class="text-sm text-muted-foreground">{profile.title}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/cv.pdf" target="_blank" rel="noopener noreferrer">Download CV</a>
        </Button>
      </div>
      <div>
        <p class="text-lg leading-relaxed text-muted-foreground">
          I'm a {age}-year-old software engineer based in {profile.location}, currently building
          software at Knapp Systemintegration GmbH. I started coding at 11 and never really
          stopped — these days that also means volunteering as an admin and developer for MyFTB, a
          large German Minecraft network, on the side. Outside of work you'll usually find me
          sailing, tinkering with PC hardware, or losing time to a good game.
        </p>
        <div class="mt-6 flex flex-wrap gap-2">
          <Badge variant="secondary">{knappYears} {knappYears === 1 ? "yr" : "yrs"} at Knapp</Badge>
          <Badge variant="secondary">{myftbYears} {myftbYears === 1 ? "yr" : "yrs"} at MyFTB</Badge>
          <Badge variant="secondary">Coding for {codingYears} yrs</Badge>
          <Badge variant="secondary">{profile.location}</Badge>
        </div>
      </div>
    </div>
  </section>
  ```

  This replaces the old bullet trivia list (Age/Nationality/Job/Languages/Hobbies/Phone/Fav OS/Things I love) with prose + a few dynamic fact badges, per the design spec's About Me rework. Phone/Fav OS/"Things I love" are dropped entirely; hobbies are folded into the bio sentence.

- [ ] **Step 2: Verify the build**

  ```bash
  npm run build
  ```
  Expected: exits 0.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/AboutMe.astro
  git commit -m "Add reworked About Me component with dynamic age/experience badges"
  ```

---

### Task 9: Resume timeline components

**Files:**
- Create: `src/components/ResumeTimeline.astro`, `src/components/TimelineEntry.astro`

- [ ] **Step 1: Create the entry component**

  ```astro
  ---
  // src/components/TimelineEntry.astro
  import type { CollectionEntry } from "astro:content";
  import { formatDateRange } from "@/lib/dates";

  interface Props {
    entry: CollectionEntry<"timeline">;
  }
  const { entry } = Astro.props;
  const { org, title, url, startDate, endDate } = entry.data;
  const range = formatDateRange(startDate, endDate);
  ---
  <li class="border-l-2 border-border pl-4">
    <p class="text-sm text-muted-foreground">{range}</p>
    <p class="font-medium">{title}</p>
    {url ? (
      <a href={url} target="_blank" rel="noreferrer" class="underline-offset-4 hover:underline">
        {org}
      </a>
    ) : (
      <p>{org}</p>
    )}
  </li>
  ```

- [ ] **Step 2: Create the section component**

  ```astro
  ---
  // src/components/ResumeTimeline.astro
  import { getCollection } from "astro:content";
  import TimelineEntry from "./TimelineEntry.astro";

  const allEntries = await getCollection("timeline");
  const byStartDate = (a: (typeof allEntries)[number], b: (typeof allEntries)[number]) =>
    a.data.startDate.localeCompare(b.data.startDate);

  const education = allEntries.filter((e) => e.data.category === "education").sort(byStartDate);
  const experience = allEntries.filter((e) => e.data.category === "experience").sort(byStartDate);
  ---
  <section id="resume" class="mx-auto max-w-3xl px-6 py-24">
    <h2 class="text-3xl font-medium">Resume</h2>
    <div class="mt-10">
      <h3 class="text-xl font-medium">Education</h3>
      <ul class="mt-4 space-y-4">
        {education.map((entry) => (
          <TimelineEntry entry={entry} />
        ))}
      </ul>
    </div>
    <div class="mt-10">
      <h3 class="text-xl font-medium">Experience</h3>
      <ul class="mt-4 space-y-4">
        {experience.map((entry) => (
          <TimelineEntry entry={entry} />
        ))}
      </ul>
    </div>
  </section>
  ```

- [ ] **Step 3: Verify the build**

  ```bash
  npm run build
  ```
  Expected: exits 0.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/ResumeTimeline.astro src/components/TimelineEntry.astro
  git commit -m "Add Resume timeline driven by the timeline content collection"
  ```

---

### Task 10: Qualifications component

**Files:**
- Create: `src/components/Qualifications.astro`

- [ ] **Step 1: Create the component**

  ```astro
  ---
  import { getCollection } from "astro:content";

  const groups = (await getCollection("qualifications")).sort((a, b) => a.data.order - b.data.order);
  ---
  <section id="qualifications" class="mx-auto max-w-3xl px-6 py-24">
    <h2 class="text-3xl font-medium">Extra Qualifications</h2>
    <div class="mt-8 grid gap-8 sm:grid-cols-2">
      {groups.map((group) => (
        <div>
          <p class="font-medium">{group.data.group}</p>
          <ul class="mt-2 list-inside list-disc text-muted-foreground">
            {group.data.items.map((item) => (
              <li>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </section>
  ```

- [ ] **Step 2: Verify the build**

  ```bash
  npm run build
  ```
  Expected: exits 0.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/Qualifications.astro
  git commit -m "Add Extra Qualifications component"
  ```

---

### Task 11: Skills component (carried over, re-themed only)

**Files:**
- Create: `src/components/Skills.astro`

- [ ] **Step 1: Create the component**

  ```astro
  ---
  import { Progress } from "@/components/ui/progress";

  const skills = [
    { name: "JavaSE/EE", value: 100 },
    { name: "Databases", value: 100 },
    { name: "C/C++", value: 100 },
    { name: "Web Development", value: 70 },
    { name: "SAP ERP", value: 80 },
    { name: "TypeScript", value: 60 },
    { name: "C#", value: 50 },
    { name: "Swift", value: 50 },
  ];
  ---
  <section id="skills" class="mx-auto max-w-3xl px-6 py-24">
    <h2 class="text-3xl font-medium">Skills</h2>
    <div class="mt-8 grid gap-6 sm:grid-cols-2">
      {skills.map((skill) => (
        <div>
          <p class="mb-2 font-medium">{skill.name}</p>
          <Progress value={skill.value} />
        </div>
      ))}
    </div>
  </section>
  ```

  Values are carried over verbatim from the old site's visible bar widths (the old markup's `aria-valuenow` attributes didn't match their own `style="width"` values on most bars — a pre-existing bug; shadcn's `Progress` derives `aria-valuenow` from `value` automatically, so that class of bug can't recur). This section's content/format is explicitly **not** being restructured in this phase — that's the deferred phase-2 work (removing the bars in favor of a past-work list).

- [ ] **Step 2: Verify the build**

  ```bash
  npm run build
  ```
  Expected: exits 0.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/Skills.astro
  git commit -m "Add Skills component (carried over content, re-themed)"
  ```

---

### Task 12: Projects components (with shadcn Dialog island)

**Files:**
- Create: `src/components/Projects.astro`, `src/components/ProjectCard.astro`, `src/components/ProjectDialog.tsx`

- [ ] **Step 1: Create the React dialog island**

  ```tsx
  // src/components/ProjectDialog.tsx
  import { Card, CardHeader, CardTitle } from "@/components/ui/card";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog";

  interface ProjectData {
    title: string;
    description: string;
    url?: string;
    image?: string;
  }

  export function ProjectDialog({ project }: { project: ProjectData }) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Card className="cursor-pointer overflow-hidden transition hover:shadow-md">
            {project.image ? (
              <img
                src={project.image}
                alt={project.title}
                className="aspect-square w-full object-cover"
              />
            ) : null}
            <CardHeader>
              <CardTitle className="text-base">{project.title}</CardTitle>
            </CardHeader>
          </Card>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{project.title}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">{project.description}</p>
          {project.url ? (
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              Visit website →
            </a>
          ) : null}
        </DialogContent>
      </Dialog>
    );
  }
  ```

  Project descriptions live as a plain `description` string in the content collection frontmatter (Task 5), not as the Markdown body — this avoids needing to render Astro's `<Content />` across the Astro→React boundary, which doesn't work as plain children. A short string prop is simpler and is all these 2-3 sentence descriptions need.

- [ ] **Step 2: Create the Astro wrapper**

  ```astro
  ---
  // src/components/ProjectCard.astro
  import type { CollectionEntry } from "astro:content";
  import { ProjectDialog } from "./ProjectDialog";

  interface Props {
    project: CollectionEntry<"projects">;
  }
  const { project } = Astro.props;
  ---
  <ProjectDialog project={project.data} client:load />
  ```

  `client:load` is required here — unlike every other component in this project, the dialog needs real interactivity (open/close, focus trap, Escape key), so it must hydrate.

- [ ] **Step 3: Create the section component**

  ```astro
  ---
  // src/components/Projects.astro
  import { getCollection } from "astro:content";
  import ProjectCard from "./ProjectCard.astro";

  const projects = (await getCollection("projects")).sort((a, b) => a.data.order - b.data.order);
  ---
  <section id="projects" class="mx-auto max-w-4xl px-6 py-24">
    <h2 class="text-3xl font-medium">Projects</h2>
    <div class="mt-8 grid gap-6 sm:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard project={project} />
      ))}
    </div>
  </section>
  ```

- [ ] **Step 4: Verify the build**

  ```bash
  npm run build
  ```
  Expected: exits 0.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/Projects.astro src/components/ProjectCard.astro src/components/ProjectDialog.tsx
  git commit -m "Add Projects section with shadcn Dialog replacing the old Bootstrap modals"
  ```

---

### Task 13: Contact component

**Files:**
- Create: `src/components/Contact.astro`

- [ ] **Step 1: Create the component**

  ```astro
  ---
  import { Github, Linkedin, Mail } from "lucide-react";
  import { profile } from "@/data/profile";
  ---
  <section id="contact" class="mx-auto max-w-3xl px-6 py-24 text-center">
    <h2 class="text-3xl font-medium">Contact Me</h2>
    <div class="mt-8 flex justify-center gap-8">
      <a
        href={`mailto:${profile.email}`}
        aria-label="Email"
        class="text-muted-foreground hover:text-primary"
      >
        <Mail size={32} />
      </a>
      <a
        href={profile.links.github}
        target="_blank"
        rel="noreferrer"
        aria-label="GitHub"
        class="text-muted-foreground hover:text-primary"
      >
        <Github size={32} />
      </a>
      <a
        href={profile.links.linkedin}
        target="_blank"
        rel="noreferrer"
        aria-label="LinkedIn"
        class="text-muted-foreground hover:text-primary"
      >
        <Linkedin size={32} />
      </a>
    </div>
  </section>
  ```

  Lucide icons render fine directly inside `.astro` markup with no `client:` directive — they're presentational SVGs with no interactivity, so Astro renders them to static markup at build time and ships zero JS for this section.

- [ ] **Step 2: Verify the build**

  ```bash
  npm run build
  ```
  Expected: exits 0.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/Contact.astro
  git commit -m "Add Contact component"
  ```

---

### Task 14: Compose the homepage

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Assemble all sections**

  Replace the contents of `src/pages/index.astro`:
  ```astro
  ---
  import BaseLayout from "@/layouts/BaseLayout.astro";
  import Hero from "@/components/Hero.astro";
  import AboutMe from "@/components/AboutMe.astro";
  import ResumeTimeline from "@/components/ResumeTimeline.astro";
  import Qualifications from "@/components/Qualifications.astro";
  import Skills from "@/components/Skills.astro";
  import Projects from "@/components/Projects.astro";
  import Contact from "@/components/Contact.astro";
  import { Separator } from "@/components/ui/separator";
  ---
  <BaseLayout>
    <Hero />
    <Separator />
    <AboutMe />
    <Separator />
    <ResumeTimeline />
    <Separator />
    <Qualifications />
    <Separator />
    <Skills />
    <Separator />
    <Projects />
    <Separator />
    <Contact />
  </BaseLayout>
  ```

  This matches the approved information architecture (Hero → About Me → Resume → Extra Qualifications → Skills → Projects → Contact) and the `<Separator />` between each section mirrors the old site's `<hr />` dividers.

- [ ] **Step 2: Run the dev server and visually check every section**

  ```bash
  npm run dev
  ```
  Open `http://localhost:4321` and confirm: Hero renders with the Terracotta accent on the title and CTA button; About Me shows your photo, bio, and four badges with correct numbers (age 26, "6 yrs at Knapp", "7 yrs at MyFTB", "Coding for 15 yrs" as of 2026); Resume shows Education (3 entries) and Experience (4 entries) in chronological order with correct date-range labels; Extra Qualifications shows both groups; Skills shows 8 progress bars; Projects shows 3 cards that open a dialog with description + link on click; Contact shows 3 working icon links; the toggle in the top-right switches light/dark without a flash on reload. Stop the server with `q` + Enter.

- [ ] **Step 3: Run the full verification suite**

  ```bash
  npm run check
  npm run test
  npm run build
  ```
  Expected: all three exit 0.

- [ ] **Step 4: Commit**

  ```bash
  git add src/pages/index.astro
  git commit -m "Compose homepage from all sections"
  ```

---

### Task 15: Sitemap integration

**Files:**
- Modify: `astro.config.mjs`, `package.json`, `package-lock.json`

- [ ] **Step 1: Add the integration**

  ```bash
  npx astro add sitemap --yes
  ```
  Expected: installs `@astrojs/sitemap`, adds `import sitemap from '@astrojs/sitemap';` and `sitemap()` to the `integrations` array.

- [ ] **Step 2: Set the `site` URL** (required for sitemap generation and for canonical/OG URLs)

  In `astro.config.mjs`, add `site` to `defineConfig`:
  ```javascript
  export default defineConfig({
    site: "https://fabrossmann.github.io",
    vite: {
      plugins: [tailwindcss()],
    },
    integrations: [react(), sitemap()],
  });
  ```

  No `base` setting is needed — this is a user/org page (`fabrossmann.github.io`), served from the domain root, not a project page under a subpath.

- [ ] **Step 3: Verify the sitemap is generated**

  ```bash
  npm run build
  ```
  Expected: exits 0; `dist/sitemap-index.xml` and `dist/sitemap-0.xml` exist.

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "Add sitemap integration"
  ```

---

### Task 16: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the workflow**

  ```yaml
  name: Deploy to GitHub Pages

  on:
    push:
      branches: [master]
    schedule:
      - cron: "0 4 1 * *"
    workflow_dispatch:

  permissions:
    contents: read
    pages: write
    id-token: write

  concurrency:
    group: "pages"
    cancel-in-progress: false

  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - name: Checkout your repository using git
          uses: actions/checkout@v6
        - name: Install, build, and upload your site
          uses: withastro/action@v6

    deploy:
      needs: build
      runs-on: ubuntu-latest
      environment:
        name: github-pages
        url: ${{ steps.deployment.outputs.page_url }}
      steps:
        - name: Deploy to GitHub Pages
          id: deployment
          uses: actions/deploy-pages@v5
  ```

  The `schedule` trigger (04:00 UTC on the 1st of every month) is the mechanism that keeps age/duration figures fresh without a manual push — `withastro/action@v6` handles Node setup, `npm ci`, and `astro build` internally, so there's no hand-rolled install/build steps to maintain. `concurrency` prevents a scheduled run and a push-triggered run from deploying over each other.

- [ ] **Step 2: Commit**

  ```bash
  git add .github/workflows/deploy.yml
  git commit -m "Add GitHub Actions workflow to build and deploy to Pages"
  ```

- [ ] **Step 3: Manual step — tell the user, do not attempt to automate**

  This cannot be done via git or any CLI in this repo: the user must go to the repo's **Settings → Pages → Build and deployment → Source** and change it from "Deploy from a branch" to **"GitHub Actions."** Until that's done, pushing this workflow will not actually deploy anything.

---

### Task 17: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Clean full build from scratch**

  ```bash
  rm -rf node_modules dist .astro
  npm install
  npm run check
  npm run test
  npm run build
  ```
  Expected: all commands exit 0. This catches anything that only worked because of leftover local state.

- [ ] **Step 2: Confirm no old-site remnants remain**

  ```bash
  git ls-files | grep -E "^(index\.html|resources/|sitemap\.xml)$"
  ```
  Expected: no output (empty) — confirms the old static files are fully removed from version control.

- [ ] **Step 3: Push to origin**

  ⚠️ Confirm with the user before pushing — this updates the live remote `master` branch.

  ```bash
  git push origin master
  ```

- [ ] **Step 4: Remind the user of the one remaining manual step**

  Repo **Settings → Pages → Source → "GitHub Actions"** (see Task 16, Step 3). Once that's set, the next push (or the next 1st-of-the-month scheduled run) will deploy the new site live.
