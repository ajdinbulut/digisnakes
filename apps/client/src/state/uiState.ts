import type { Phase, PlayerSnapshot, StateSnapshot, PlacementRow } from '../types/game';

export type UiState = {
  phase: Phase;
  roomCode: string;
  roundNumber: number;
  matchRemainingMs: number;
  scoreboard: PlayerSnapshot[];
  toast: string;
  placements: PlacementRow[];
  winnerText: string;
  nickname: string;
  localPlayerId: string;
};

export const ui: UiState = {
  phase: 'menu',
  roomCode: '',
  roundNumber: 0,
  matchRemainingMs: 5 * 60 * 1000,
  scoreboard: [] as PlayerSnapshot[],
  toast: '',
  placements: [] as PlacementRow[],
  winnerText: '',
  nickname: `Player${Math.floor(Math.random() * 1000)}`,
  localPlayerId: '',
};

export let lastState: StateSnapshot | null = null;
export let toastTimer = 0;

export function setLastState(state: StateSnapshot | null): void {
  lastState = state;
}

export function getToastTimer(): number {
  return toastTimer;
}

export function setToastTimer(id: number): void {
  toastTimer = id;
}

/**
 * Updates UI state from a server snapshot. Returns true if overlay should re-render.
 */
export function updateFromSnapshot(state: StateSnapshot): boolean {
  const previousPhase = ui.phase;
  const previousRoom = ui.roomCode;
  const previousWinnerText = ui.winnerText;
  const previousPlayersCount = ui.scoreboard.length;
  const previousSeconds = Math.ceil(ui.matchRemainingMs / 1000);

  lastState = state;
  ui.roomCode = state.roomCode;
  ui.roundNumber = state.roundNumber;
  ui.matchRemainingMs = state.matchRemainingMs;
  ui.scoreboard = [...state.players].sort((a, b) => b.score - a.score);
  ui.placements = state.placements;
  ui.winnerText = state.winnerText;
  ui.localPlayerId = state.localPlayerId ?? ui.localPlayerId;
  ui.phase =
    state.phase === 'waiting'
      ? 'waiting'
      : state.phase === 'round-end'
        ? 'round-end'
        : state.phase === 'finished'
          ? 'finished'
          : 'playing';

  const currentSeconds = Math.ceil(ui.matchRemainingMs / 1000);

  return (
    previousPhase !== ui.phase ||
    previousRoom !== ui.roomCode ||
    previousWinnerText !== ui.winnerText ||
    previousPlayersCount !== ui.scoreboard.length ||
    previousSeconds !== currentSeconds
  );
}

export function resetToMenu(): void {
  ui.phase = 'menu';
  ui.roomCode = '';
  ui.roundNumber = 0;
  ui.scoreboard = [];
  ui.placements = [];
  ui.winnerText = '';
  ui.localPlayerId = '';
  lastState = null;
}
