const isDev = process.env.NODE_ENV !== 'production';

/** Server port. Default 2567 in development only. */
export const port = Number(
  process.env.PORT ?? (isDev ? 2567 : undefined)
) || 2567;

/** Allowed CORS origin for Socket.IO. Default localhost:5173 in development, else * if unset. */
export const clientOrigin =
  process.env.CLIENT_ORIGIN ?? (isDev ? 'http://localhost:5173' : '*');

export const nodeEnv = process.env.NODE_ENV ?? 'development';
