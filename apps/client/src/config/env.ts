const raw = (import.meta as { env?: Record<string, string | undefined> }).env
  ?.VITE_SERVER_URL;

const isDev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

if (isDev && (raw === undefined || raw === '')) {
  throw new Error(
    'VITE_SERVER_URL is required in development. Add it to apps/client/.env (e.g. VITE_SERVER_URL=http://localhost:2567). See .env.example.'
  );
}

export const SERVER_URL = raw ?? '';
