import type { Color, Lobby, PickupKind } from '../types/game.js';
import { WIDTH, HEIGHT, BORDER, DRAW_DISTANCE, GAP_DISTANCE } from '../config/constants.js';

export function trySpawnPickup(lobby: Lobby, now: number): void {
  if (lobby.pickup || now < lobby.pickupSpawnAt) return;

  const kinds: PickupKind[] = ['reset-trails', 'shuffle-colors'];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];

  lobby.pickup = {
    x: BORDER + 80 + Math.random() * (WIDTH - BORDER * 2 - 160),
    y: BORDER + 80 + Math.random() * (HEIGHT - BORDER * 2 - 160),
    active: true,
    kind,
  };
}

export function activatePickup(
  lobby: Lobby,
  emitToast: (msg: string) => void
): void {
  if (!lobby.pickup) return;

  const kind = lobby.pickup.kind;
  lobby.pickup = null;

  if (kind === 'reset-trails') {
    lobby.trails = [];
    for (const p of lobby.players.values()) {
      p.drawRemaining = DRAW_DISTANCE;
      p.gapRemaining = GAP_DISTANCE;
    }
    emitToast('Pickup: trails reset');
    return;
  }

  if (kind === 'shuffle-colors') {
    const shuffled = [...lobby.players.values()]
      .map((p) => p.color)
      .sort(() => Math.random() - 0.5);

    let i = 0;
    for (const p of lobby.players.values()) {
      p.color = shuffled[i] as Color;
      i++;
    }

    emitToast('Pickup: colors shuffled');
  }
}
