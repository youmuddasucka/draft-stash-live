This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Naming Conventions

Naming follows a **language boundary**: the web/TypeScript side and the Python/data side each use their own idiomatic convention. Don't mix conventions *within* a side.

**TypeScript / web side** (`app/`, `components/`, `lib/`, web-facing `public/` paths):

| Thing | Convention | Example |
| --- | --- | --- |
| React component files | `PascalCase.tsx` | `MobileNav.tsx`, `TeamLogo.tsx` |
| Utility / lib files | `camelCase.ts` | `loadPicks.ts`, `teamMetadata.ts` |
| App Router route folders | `kebab-case` | `app/stash-value/`, `app/projected-standings/` |
| Dynamic route folders | `[bracket]` | `[team]`, `[pickId]` |
| Next.js special files | lowercase (required) | `page.tsx`, `layout.tsx`, `route.ts` |
| Variables / functions | `camelCase` | `loadSwapGroups` |
| Constants | `UPPER_SNAKE` (optional) | |

**Python / data-pipeline side** (`scripts/` engines — `engine_v2.py`, `special_picks_solver.py` — which read the pick JSON in `public/pick-data/teams/` and emit the sim output in `public/sim-output/`):

- `snake_case` for everything — files, folders, identifiers. This is standard Python convention.

**Known exception:** the team folders under `public/pick-data/teams/` are `snake_case` (`new_york`, `golden_state`) even though they live on the web side. These are load-bearing path keys shared with the Python scripts that generate them (mapped from team abbreviations in `lib/picks/constants.ts`, `lib/loadSwapGroups.ts`, and `app/teams/[team]/page.tsx`). Leave them as-is — renaming would break the Python↔web contract.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
