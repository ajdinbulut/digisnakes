import type { Color } from '../types/game.js';

export const WIDTH = 900;
export const HEIGHT = 1600;
export const BORDER = 20;
export const PLAYER_SPEED = 250;
export const TURN_SPEED = 2.8;
export const PLAYER_RADIUS = 10;
export const TRAIL_THICKNESS = 6;
export const DRAW_DISTANCE = 260;
export const GAP_DISTANCE = 70;
export const SPAWN_NO_TRAIL_MS = 3000;
export const ROUND_END_MS = 3500;
export const COUNTDOWN_MS = 3000;
export const PICKUP_RADIUS = 18;
/** Match duration: 5 minutes. */
export const MATCH_DURATION_MS = 5 * 60 * 1000;
export const TICK_MS = 1000 / 30;
export const DT = TICK_MS / 1000;

export const COLORS: Color[] = ['#ff4d4f', '#3b82f6', '#facc15', '#22c55e'];

/** Minimum time (ms) in playing phase before round can end with one survivor. */
export const MIN_PLAYING_MS = 2500;
