import type { Server } from 'socket.io';
import type { Lobby, Player, Trail } from '../types/game.js';
import { dist, r2 } from './utils.js';
import {
  WIDTH,
  HEIGHT,
  BORDER,
  MATCH_DURATION_MS,
  COUNTDOWN_MS,
  SPAWN_NO_TRAIL_MS,
  DRAW_DISTANCE,
  GAP_DISTANCE,
  COLORS,
} from '../config/constants.js';

function makeCode(): string {
  return Math.random().toString(36).slice(2, 5).toUpperCase();
}

export function createLobby(existingCodes: Set<string>): Lobby {
  let code = makeCode();
  while (existingCodes.has(code)) code = makeCode();
  const lobby: Lobby = {
    code,
    phase: 'waiting',
    roundNumber: 0,
    roundPlayerCount: 0,
    countdownRemaining: 0,
    roundEndRemaining: 0,
    roundStartedAt: 0,
    matchEndsAt: 0,
    winnerText: '',
    players: new Map(),
    trails: [],
    pickup: null,
    pickupSpawnAt: 0,
    placements: [],
  };
  return lobby;
}

export function getSpawn(lobby: Lobby): { x: number; y: number; angle: number } {
  const centerX = WIDTH / 2;
  const centerY = HEIGHT / 2;

  for (let i = 0; i < 50; i++) {
    const x = BORDER + 120 + Math.random() * (WIDTH - BORDER * 2 - 240);
    const y = BORDER + 120 + Math.random() * (HEIGHT - BORDER * 2 - 240);

    const bad = [...lobby.players.values()].some(
      (p) => dist(x, y, p.x, p.y) < 180
    );
    if (bad) continue;

    let angle = Math.atan2(centerY - y, centerX - x);
    angle += (Math.random() - 0.5) * 0.5;

    return { x, y, angle };
  }

  const x = WIDTH / 2;
  const y = HEIGHT / 2;
  return {
    x,
    y,
    angle: Math.atan2(centerY - y, centerX - x),
  };
}

export function snapshot(lobby: Lobby, localPlayerId?: string) {
  return {
    phase: lobby.phase,
    roomCode: lobby.code,
    roundNumber: lobby.roundNumber,
    matchRemainingMs:
      lobby.matchEndsAt > 0
        ? Math.max(0, lobby.matchEndsAt - Date.now())
        : MATCH_DURATION_MS,
    countdown: lobby.countdownRemaining / 1000,
    players: [...lobby.players.values()]
      .map((p) => ({
        id: p.id,
        nickname: p.nickname,
        color: p.color,
        x: r2(p.x),
        y: r2(p.y),
        angle: p.angle,
        alive: p.alive,
        score: p.score,
      }))
      .sort((a, b) => b.score - a.score),
    trails: lobby.trails.slice(-2500).map((t: Trail) => ({
      ...t,
      x1: r2(t.x1),
      y1: r2(t.y1),
      x2: r2(t.x2),
      y2: r2(t.y2),
    })),
    pickup: lobby.pickup,
    placements: lobby.placements,
    winnerText: lobby.winnerText,
    localPlayerId,
  };
}

export function emitLobby(lobby: Lobby, io: Server): void {
  for (const p of lobby.players.values()) {
    io.to(p.id).emit('snapshot', snapshot(lobby, p.id));
  }
}

export function finishMatch(lobby: Lobby): void {
  lobby.phase = 'finished';
  lobby.matchEndsAt = 0;
  const sorted = [...lobby.players.values()].sort((a, b) => b.score - a.score);
  lobby.winnerText = sorted[0]
    ? `${sorted[0].nickname} wins the match!`
    : 'Match finished';
}

export function startRound(lobby: Lobby, resetScores: boolean): void {
  console.log('startRound', {
    lobby: lobby.code,
    players: lobby.players.size,
    resetScores,
  });

  if (resetScores) {
    for (const p of lobby.players.values()) p.score = 0;
    lobby.roundNumber = 1;
    lobby.matchEndsAt = Date.now() + MATCH_DURATION_MS;
  } else {
    lobby.roundNumber += 1;
  }

  lobby.roundPlayerCount = lobby.players.size;
  lobby.phase = 'countdown';
  lobby.countdownRemaining = COUNTDOWN_MS;
  lobby.roundEndRemaining = 0;
  lobby.roundStartedAt = 0;
  lobby.placements = [];
  lobby.winnerText = '';
  lobby.trails = [];
  lobby.pickup = null;
  lobby.pickupSpawnAt = Date.now() + 10000;

  for (const p of lobby.players.values()) {
    const s = getSpawn(lobby);
    p.color = p.baseColor;
    p.x = s.x;
    p.y = s.y;
    p.angle = s.angle;
    p.alive = true;
    p.turn = 0;
    p.spawnProtectedUntil = Date.now() + COUNTDOWN_MS + SPAWN_NO_TRAIL_MS;
    p.trailEnabled = false;
    p.drawRemaining = DRAW_DISTANCE;
    p.gapRemaining = GAP_DISTANCE;
  }
}


/** Get the color for the next player joining the lobby (fixed palette by index). */
export function getNextPlayerColor(lobby: Lobby): (typeof COLORS)[number] {
  return COLORS[lobby.players.size % COLORS.length];
}
