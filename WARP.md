# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.
``

## Project overview
- Frontend-only Vite + React + TypeScript app styled with Tailwind CSS.
- Routing via react-router-dom with three pages: Login, Report, Summary.
- XLSX export implemented on the Summary page; barcode scanning package is installed but not wired up (placeholder in Report page).

## Common commands
Install dependencies (no lockfile present; npm assumed):
```bash path=null start=null
npm install
```

Start dev server:
```bash path=null start=null
npm run dev
```

Build for production (runs TypeScript build then Vite):
```bash path=null start=null
npm run build
```

Preview production build locally:
```bash path=null start=null
npm run preview
```

Type-check only:
```bash path=null start=null
npx tsc --noEmit
```

Linting: not configured in this repo (no ESLint config or script found).

Testing: not configured in this repo (no test runner or tests present).

## Architecture and code structure
- Entry: `index.html` loads `src/main.tsx`, which mounts React within `<BrowserRouter>`, rendering `src/App.tsx`.
- Routing: `App.tsx` defines routes `"/" -> LoginPage`, `"/report" -> ReportPage`, `"/summary" -> SummaryPage`, with a catch-all redirect to root.
- State and navigation: local component state via React hooks; navigation with `useNavigate`.
- Styling: Tailwind configured via `tailwind.config.js`; global styles and utility classes in `src/index.css` (e.g., `button-gradient`, `card`).
- Features:
  - Login: basic phone input and OTP flow stub (no backend integration).
  - Report: form collects store, device, plan; computes price from an in-file map; IMEI input with a toggle for scanner placeholder. `react-qr-barcode-scanner` is listed but not yet integrated.
  - Summary: renders mock data table; computes totals with `useMemo`; exports to Excel using `xlsx`.
- Build tooling:
  - Vite config: minimal plugin setup with `@vitejs/plugin-react`.
  - TypeScript: path alias `@/*` -> `src/*` defined in `tsconfig.json`.

## Notes for future work
- Environment variables: if needed, Vite requires variables to be prefixed with `VITE_` and placed in `.env` files (already gitignored).