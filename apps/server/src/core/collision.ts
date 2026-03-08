import type { Lobby, Trail } from '../types/game.js';
import { dist, clamp } from './utils.js';
import { PLAYER_RADIUS, TRAIL_THICKNESS } from '../config/constants.js';

export function ccw(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
): boolean {
  return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
}

export function segmentsIntersect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): boolean {
  return (
    ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) &&
    ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4)
  );
}

export function pointSegDist(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return dist(px, py, x1, y1);
  const t = clamp(
    ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy),
    0,
    1
  );
  const sx = x1 + t * dx;
  const sy = y1 + t * dy;
  return dist(px, py, sx, sy);
}

export function getIgnoredOwnTrails(
  lobby: Lobby,
  playerId: string,
  count = 2
): Set<Trail> {
  const ignored = new Set<Trail>();
  let found = 0;

  for (let i = lobby.trails.length - 1; i >= 0; i--) {
    const t = lobby.trails[i];
    if (t.ownerId === playerId && t.active) {
      ignored.add(t);
      found++;
      if (found >= count) break;
    }
  }

  return ignored;
}

/** Returns true if the two players collided head-to-head (touch or path cross). */
export function headsCollide(
  oldX1: number,
  oldY1: number,
  x1: number,
  y1: number,
  oldX2: number,
  oldY2: number,
  x2: number,
  y2: number
): boolean {
  const endTouch = dist(x1, y1, x2, y2) <= PLAYER_RADIUS * 2;
  const crossed = segmentsIntersect(oldX1, oldY1, x1, y1, oldX2, oldY2, x2, y2);
  return endTouch || crossed;
}

/** Returns true if player (px, py) is within collision range of trail segment. */
export function hitTrail(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): boolean {
  return (
    pointSegDist(px, py, x1, y1, x2, y2) <=
    PLAYER_RADIUS + TRAIL_THICKNESS / 2
  );
}
