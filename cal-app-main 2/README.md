# FORGE

Next.js app (App Router) with local-first Dexie data, PWA support, and FORGE operator chat via `/api/chat` and `/api/claude`.

## Setup

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for model routes
npm run icons                  # optional: PNGs for install / manifest
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command        | Description        |
|----------------|--------------------|
| `npm run dev`  | Development server |
| `npm run build`| Production build   |
| `npm run start`| Production server  |
| `npm run lint` | ESLint             |
| `npm run icons`| Write PWA PNGs to `public/` |

## Deploy

Configure environment variables from `.env.example` on your host (e.g. Vercel). Cloud sync via `/api/sync` is not wired for Vercel by default.
