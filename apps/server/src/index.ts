import http from 'node:http';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import type { Lobby, Player, MoveFrame } from './types/game.js';
import { port, clientOrigin } from './config/env.js';
import {
  BORDER,
  WIDTH,
  HEIGHT,
  PLAYER_SPEED,
  TURN_SPEED,
  TICK_MS,
  DT,
  PICKUP_RADIUS,
  PLAYER_RADIUS,
  TOTAL_ROUNDS,
  DRAW_DISTANCE,
  GAP_DISTANCE,
} from './config/constants.js';
import { dist } from './core/utils.js';
import {
  headsCollide,
  hitTrail,
  getIgnoredOwnTrails,
} from './core/collision.js';
import {
  eliminatePlayer,
  eliminatePlayersHeadToHead,
  finalizeRoundIfNeeded,
} from './core/scoring.js';
import { trySpawnPickup, activatePickup } from './core/pickup.js';
import {
  createLobby,
  getSpawn,
  emitLobby,
  startRound,
  getNextPlayerColor,
} from './core/lobby.js';

const app = express();
app.use(cors());
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: clientOrigin,
  },
});
const lobbies = new Map<string, Lobby>();

io.on('connection', (socket) => {
  socket.on(
    'joinLobby',
    (payload: { nickname: string; roomCode?: string }) => {
      let lobby: Lobby | undefined = payload.roomCode
        ? lobbies.get(payload.roomCode.trim().toUpperCase())
        : undefined;
      if (!lobby) {
        lobby = createLobby(new Set(lobbies.keys()));
        lobbies.set(lobby.code, lobby);
      }
      if (lobby.players.size >= 4) {
        socket.emit('toast', 'Lobby is full');
        return;
      }
      const spawn = getSpawn(lobby);
      const player: Player = {
        id: socket.id,
        nickname: (payload.nickname || 'Player').slice(0, 18),
        color: getNextPlayerColor(lobby),
        x: spawn.x,
        y: spawn.y,
        angle: spawn.angle,
        alive: true,
        score: 0,
        turn: 0,
        spawnProtectedUntil: 0,
        trailEnabled: false,
        drawRemaining: DRAW_DISTANCE,
        gapRemaining: GAP_DISTANCE,
        roomCode: lobby.code,
      };
      lobby.players.set(socket.id, player);
      socket.join(lobby.code);
      socket.emit('toast', `Joined room ${lobby.code}`);
      emitLobby(lobby, io);
    }
  );

  socket.on('turn', (m: { direction: -1 | 0 | 1 }) => {
    const lobby = [...lobbies.values()].find((l) => l.players.has(socket.id));
    const p = lobby?.players.get(socket.id);
    if (p) p.turn = m.direction;
  });

  socket.on('startGame', () => {
    const lobby = [...lobbies.values()].find((l) => l.players.has(socket.id));
    if (!lobby || lobby.players.size < 2) {
      if (lobby && lobby.players.size < 2)
        socket.emit('toast', 'Need at least 2 players in the same lobby');
      return;
    }
    if (lobby.phase === 'waiting') {
      startRound(lobby, true);
      emitLobby(lobby, io);
      return;
    }
    if (lobby.phase === 'between-rounds') {
      lobby.roundNumber += 1;
      startRound(lobby, false);
      emitLobby(lobby, io);
      return;
    }
    if (lobby.phase === 'finished') {
      startRound(lobby, true);
      emitLobby(lobby, io);
    }
  });

  socket.on('disconnect', () => {
    const lobby = [...lobbies.values()].find((l) => l.players.has(socket.id));
    if (!lobby) return;
    lobby.players.delete(socket.id);
    lobby.trails = lobby.trails.filter((t: { ownerId: string }) => t.ownerId !== socket.id);
    lobby.placements = lobby.placements.filter((x: { id: string }) => x.id !== socket.id);
    if (lobby.players.size === 0) {
      lobbies.delete(lobby.code);
      return;
    }
    finalizeRoundIfNeeded(lobby);
    emitLobby(lobby, io);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const lobby of lobbies.values()) {
    if (
      lobby.phase === 'waiting' ||
      lobby.phase === 'finished' ||
      lobby.phase === 'between-rounds'
    ) {
      emitLobby(lobby, io);
      continue;
    }
    if (lobby.phase === 'countdown') {
      lobby.countdownRemaining -= TICK_MS;
      if (lobby.countdownRemaining <= 0) {
        lobby.phase = 'playing';
        lobby.roundStartedAt = Date.now();
      }
      emitLobby(lobby, io);
      continue;
    }
    if (lobby.phase === 'round-end') {
      lobby.roundEndRemaining -= TICK_MS;
      if (lobby.roundEndRemaining <= 0) {
        if (lobby.roundNumber >= TOTAL_ROUNDS) {
          lobby.phase = 'finished';
          const sorted = [...lobby.players.values()].sort(
            (a, b) => b.score - a.score
          );
          lobby.winnerText = sorted[0]
            ? `${sorted[0].nickname} wins the match!`
            : 'Match finished';
        } else {
          lobby.phase = 'between-rounds';
        }
      }
      emitLobby(lobby, io);
      continue;
    }

    trySpawnPickup(lobby, now);

    const moves: MoveFrame[] = [];

    for (const p of lobby.players.values()) {
      if (!p.alive) continue;

      const oldX = p.x;
      const oldY = p.y;
      const newAngle = p.angle + p.turn * TURN_SPEED * DT;
      const newX = oldX + Math.cos(newAngle) * PLAYER_SPEED * DT;
      const newY = oldY + Math.sin(newAngle) * PLAYER_SPEED * DT;

      moves.push({
        player: p,
        oldX,
        oldY,
        newX,
        newY,
        newAngle,
      });
    }

    for (const move of moves) {
      move.player.angle = move.newAngle;
      move.player.x = move.newX;
      move.player.y = move.newY;
    }

    for (const move of moves) {
      const p = move.player;
      if (!p.alive) continue;

      if (
        p.x <= BORDER ||
        p.x >= WIDTH - BORDER ||
        p.y <= BORDER ||
        p.y >= HEIGHT - BORDER
      ) {
        eliminatePlayer(lobby, p);
      }
    }

    const headCrashPlayers = new Set<Player>();

    for (let i = 0; i < moves.length; i++) {
      for (let j = i + 1; j < moves.length; j++) {
        const a = moves[i];
        const b = moves[j];

        if (!a.player.alive || !b.player.alive) continue;

        if (
          headsCollide(
            a.oldX,
            a.oldY,
            a.player.x,
            a.player.y,
            b.oldX,
            b.oldY,
            b.player.x,
            b.player.y
          )
        ) {
          headCrashPlayers.add(a.player);
          headCrashPlayers.add(b.player);
        }
      }
    }

    if (headCrashPlayers.size > 0) {
      eliminatePlayersHeadToHead(lobby, [...headCrashPlayers]);
    }

    for (const move of moves) {
      const p = move.player;
      if (!p.alive) continue;

      if (now >= p.spawnProtectedUntil) {
        p.trailEnabled = true;
      }

      const ignoredOwnTrails = getIgnoredOwnTrails(lobby, p.id, 2);

      for (const t of lobby.trails) {
        if (!t.active) continue;
        if (ignoredOwnTrails.has(t)) continue;

        if (hitTrail(p.x, p.y, t.x1, t.y1, t.x2, t.y2)) {
          eliminatePlayer(lobby, p);
          break;
        }
      }

      if (!p.alive) continue;

      if (
        lobby.pickup?.active &&
        dist(p.x, p.y, lobby.pickup.x, lobby.pickup.y) <=
          PICKUP_RADIUS + PLAYER_RADIUS
      ) {
        activatePickup(lobby, (msg: string) => io.to(lobby.code).emit('toast', msg));
      }
    }

    for (const move of moves) {
      const p = move.player;
      if (!p.alive) continue;

      const step = dist(move.oldX, move.oldY, p.x, p.y);

      if (p.trailEnabled) {
        if (p.drawRemaining > 0) {
          lobby.trails.push({
            x1: move.oldX,
            y1: move.oldY,
            x2: p.x,
            y2: p.y,
            color: p.color,
            ownerId: p.id,
            active: true,
          });

          p.drawRemaining -= step;
          if (p.drawRemaining <= 0) {
            p.gapRemaining = GAP_DISTANCE;
          }
        } else {
          p.gapRemaining -= step;
          if (p.gapRemaining <= 0) {
            p.drawRemaining = DRAW_DISTANCE;
          }
        }
      }
    }

    finalizeRoundIfNeeded(lobby);
    emitLobby(lobby, io);
  }
}, TICK_MS);

server.listen(port, '0.0.0.0', () =>
  console.log(`Digi Snakes server on http://localhost:${port}`)
);
