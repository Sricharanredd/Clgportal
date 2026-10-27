# College Management Portal — Frontend

Vite + React 18 + TypeScript + Tailwind CSS v3 frontend for the Intermediate College Management Portal.

## Scripts

```bash
npm install        # install dependencies
npm run dev        # start dev server on http://localhost:5173
npm run build      # production build to dist/
npm run typecheck  # tsc --noEmit
npm run preview    # preview the production build on http://localhost:4173
```

## Environment

Copy `.env.example` to `.env` and adjust values. `VITE_API_BASE_URL` points at the backend API
(default `http://localhost:8000/api/v1`); `VITE_USE_MOCKS` toggles mock data during development.

See the root README for full project setup and architecture notes.
