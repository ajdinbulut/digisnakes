import type { Lobby, Player, Placement } from '../types/game.js';
import { ROUND_END_MS, MIN_PLAYING_MS } from '../config/constants.js';

export function getPointsForPlacement(
  roundPlayerCount: number,
  placement: number
): number {
  return Math.max(roundPlayerCount - placement, 0);
}

export function addPlacement(
  lobby: Lobby,
  p: Player,
  placement: number,
  pointsAwarded: number
): void {
  if (lobby.placements.some((x: Placement) => x.id === p.id)) return;

  p.alive = false;
  p.score += pointsAwarded;

  lobby.placements.push({
    id: p.id,
    nickname: p.nickname,
    placement,
    pointsAwarded,
  });
}

export function eliminatePlayer(
  lobby: Lobby,
  p: Player,
  options?: { headCollision?: boolean }
): void {
  if (!p.alive) return;

  const aliveBefore = [...lobby.players.values()].filter((x) => x.alive).length;
  const placement = aliveBefore;
  const pointsAwarded = options?.headCollision
    ? 0
    : getPointsForPlacement(lobby.roundPlayerCount, placement);

  addPlacement(lobby, p, placement, pointsAwarded);
}

export function eliminatePlayersHeadToHead(
  lobby: Lobby,
  players: Player[]
): void {
  const alivePlayers = players.filter((p) => p.alive);
  if (alivePlayers.length === 0) return;

  const aliveBefore = [...lobby.players.values()].filter((x) => x.alive).length;
  const remainingAfter = aliveBefore - alivePlayers.length;
  const sharedPlacement = remainingAfter + 1;

  for (const p of alivePlayers) {
    addPlacement(lobby, p, sharedPlacement, 0);
  }
}

export function finalizeRoundIfNeeded(lobby: Lobby): void {
  const alive = [...lobby.players.values()].filter((p) => p.alive);
  if (lobby.phase !== 'playing' || alive.length > 1) return;

  const now = Date.now();
  const playedLongEnough =
    lobby.roundStartedAt > 0 && now - lobby.roundStartedAt >= MIN_PLAYING_MS;

  if (lobby.placements.length > 0 || playedLongEnough) {
    if (alive.length === 1 && !lobby.placements.some((x: Placement) => x.id === alive[0].id)) {
      addPlacement(
        lobby,
        alive[0],
        1,
        getPointsForPlacement(lobby.roundPlayerCount, 1)
      );
    }

    lobby.placements.sort((a: Placement, b: Placement) => a.placement - b.placement);
    lobby.phase = 'round-end';
    lobby.roundEndRemaining = ROUND_END_MS;

    const winner = lobby.placements.find(
      (x: Placement) => x.placement === 1 && x.pointsAwarded > 0
    );
    lobby.winnerText = winner
      ? `${winner.nickname} wins round ${lobby.roundNumber}`
      : `Round ${lobby.roundNumber} finished`;
  }
}
