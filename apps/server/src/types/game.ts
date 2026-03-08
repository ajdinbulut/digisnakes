export type Phase =
  | 'waiting'
  | 'countdown'
  | 'playing'
  | 'round-end'
  | 'finished';

export type Color =
  | '#ff4d4f'
  | '#3b82f6'
  | '#facc15'
  | '#22c55e'
  | '#f97316'
  | '#ffffff';

export type Player = {
  id: string;
  nickname: string;
  color: Color;
  baseColor: Color;
  x: number;
  y: number;
  angle: number;
  alive: boolean;
  score: number;
  turn: -1 | 0 | 1;
  spawnProtectedUntil: number;
  trailEnabled: boolean;
  drawRemaining: number;
  gapRemaining: number;
  roomCode: string;
};

export type Trail = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: Color;
  ownerId: string;
  active: boolean;
};

export type PickupKind = 'reset-trails' | 'shuffle-colors';

export type Pickup = {
  x: number;
  y: number;
  active: boolean;
  kind: PickupKind;
} | null;

export type Placement = {
  id: string;
  nickname: string;
  placement: number;
  pointsAwarded: number;
};

export type Lobby = {
  code: string;
  phase: Phase;
  roundNumber: number;
  roundPlayerCount: number;
  countdownRemaining: number;
  roundEndRemaining: number;
  roundStartedAt: number;
  matchEndsAt: number;
  winnerText: string;
  players: Map<string, Player>;
  trails: Trail[];
  pickup: Pickup;
  pickupSpawnAt: number;
  placements: Placement[];
};

export type MoveFrame = {
  player: Player;
  oldX: number;
  oldY: number;
  newX: number;
  newY: number;
  newAngle: number;
};
