# client

The booking UI. Talks to the API only through its own Route Handlers
(`app/api/*`), which attach the backend's API key server-side — the key
is never sent to the browser.

## Setup

```bash
cp .env.local.example .env.local
# fill in BACKEND_API_URL and BACKEND_API_KEY
npm install
npm run dev
```

Runs on http://localhost:3001 by default (the API server uses 3000).
