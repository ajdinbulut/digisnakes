export type Phase =
  | 'menu'
  | 'waiting'
  | 'playing'
  | 'round-end'
  | 'finished';

export type TurnDirection = -1 | 0 | 1;

export type PlayerSnapshot = {
  id: string;
  nickname: string;
  color: string;
  x: number;
  y: number;
  angle: number;
  alive: boolean;
  score: number;
};

export type TrailSnapshot = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  active: boolean;
};

export type StateSnapshot = {
  phase: 'waiting' | 'countdown' | 'playing' | 'round-end' | 'finished';
  roomCode: string;
  roundNumber: number;
  matchRemainingMs: number;
  countdown: number;
  players: PlayerSnapshot[];
  trails: TrailSnapshot[];
  pickup: {
    x: number;
    y: number;
    active: boolean;
    kind: 'reset-trails' | 'shuffle-colors';
  } | null;
  placements: PlacementRow[];
  winnerText: string;
  localPlayerId?: string;
};

export type PlacementRow = {
  id: string;
  nickname: string;
  placement: number;
  pointsAwarded: number;
};
