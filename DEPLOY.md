# Deployment

## Local development

1. From repo root: `npm install`
2. Copy env files and set URLs:
   - `cp apps/client/.env.example apps/client/.env`
   - `cp apps/server/.env.example apps/server/.env`
3. Start both: `npm run dev:server` and `npm run dev:client` (or `npm run dev` to run both)
4. Client: http://localhost:5173 — Server: http://localhost:2567

## Frontend deployment

1. Build: `npm run build:client` (from root) or `npm run build` in `apps/client`
2. Set `VITE_SERVER_URL` at **build time** to your backend URL (e.g. `https://api.example.com`). No runtime env — Vite inlines it.
3. Serve the contents of `apps/client/dist` with any static host (Nginx, Vercel, Netlify, S3+CloudFront, etc.).
4. Ensure the host allows the origin your backend expects in `CLIENT_ORIGIN`.

## Backend deployment

1. Build: `npm run build:server` (from root) or `npm run build` in `apps/server`
2. Run: `npm run start` (from root) or `node dist/index.js` in `apps/server`
3. Server binds to `0.0.0.0` and uses `process.env.PORT`. Set `PORT` in the process environment (e.g. platform default 8080 or 2567).
4. Health check: `GET /health` returns `200` and `{ "ok": true }`.

## Required environment variables

| App    | Variable         | When        | Example                    |
|--------|------------------|------------|----------------------------|
| Client | `VITE_SERVER_URL`| Build time | `https://api.example.com`  |
| Server | `PORT`           | Runtime    | `2567` or `8080`           |
| Server | `CLIENT_ORIGIN`  | Runtime    | `https://app.example.com`  |
| Server | `NODE_ENV`       | Optional   | `production`               |

Set `CLIENT_ORIGIN` to the exact origin of your frontend (scheme + host + port if non-default) so Socket.IO CORS allows the client.
