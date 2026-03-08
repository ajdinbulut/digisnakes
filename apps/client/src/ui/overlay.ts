import type { TurnDirection } from '../types/game';
import type { DigiScene } from '../game/DigiScene';
import type { StateSnapshot } from '../types/game';
import { socket } from '../net/socket';
import {
  ui,
  updateFromSnapshot,
  resetToMenu,
  getToastTimer,
  setToastTimer,
} from '../state/uiState';

let overlayEl: HTMLElement;
let sceneRef: DigiScene | null = null;

const arrowKeys = { left: false, right: false };

function updateTurnFromKeys() {
  const dir: TurnDirection = arrowKeys.right ? 1 : arrowKeys.left ? -1 : 0;
  sceneRef?.setTurn(dir);
}

function bindEvents() {
  if (!sceneRef) return;

  const bind = (id: string, dir: TurnDirection) => {
    const el = document.getElementById(id);
    if (!el || (el as HTMLElement & { _bound?: boolean })._bound) return;

    const start = (e: Event) => {
      e.preventDefault();
      sceneRef?.setTurn(dir);
    };

    const end = (e: Event) => {
      e.preventDefault();
      sceneRef?.setTurn(0);
    };

    ['pointerdown', 'touchstart'].forEach((n) =>
      el.addEventListener(n, start, { passive: false })
    );

    ['pointerup', 'pointercancel', 'pointerleave', 'touchend', 'touchcancel'].forEach(
      (n) => el.addEventListener(n, end, { passive: false })
    );

    (el as HTMLElement & { _bound?: boolean })._bound = true;
  };

  bind('touch-left', -1);
  bind('touch-right', 1);

  if (!(window as Window & { _arrowKeysBound?: boolean })._arrowKeysBound) {
    (window as Window & { _arrowKeysBound?: boolean })._arrowKeysBound = true;
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        arrowKeys.left = true;
        updateTurnFromKeys();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        arrowKeys.right = true;
        updateTurnFromKeys();
      }
    });
    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        arrowKeys.left = false;
        updateTurnFromKeys();
      } else if (e.key === 'ArrowRight') {
        arrowKeys.right = false;
        updateTurnFromKeys();
      }
    });
  }
}

function formatMatchTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function renderScoreboard(): string {
  return `<div class="score-list">${ui.scoreboard
    .map(
      (p) =>
        `<div class="score-row"><div><span class="player-badge" style="background:${p.color}"></span>${p.nickname}${p.id === ui.localPlayerId ? ' (You)' : ''}</div><strong>${p.score}</strong></div>`
    )
    .join('')}</div>`;
}

function renderPlacements(): string {
  return `<div class="score-list">${ui.placements
    .map(
      (p) =>
        `<div class="score-row"><div>${p.placement}. ${p.nickname}</div><strong>+${p.pointsAwarded}</strong></div>`
    )
    .join('')}</div>`;
}

function renderShuffleLegendBadge(): string {
  return `<span style="display:inline-block; width:14px; height:14px; border-radius:50%; border:1px solid rgba(255,255,255,0.85); vertical-align:-2px; margin:0 2px; background:conic-gradient(#ff4d4f 0deg 90deg, #3b82f6 90deg 180deg, #facc15 180deg 270deg, #22c55e 270deg 360deg);"></span>`;
}

function renderCenterPanel(): string {
  if (ui.phase === 'menu')
    return `<div class="center-panel">
    <div class="panel">
      <div class="title">Digi Snakes</div>
      <div class="subtitle">
        Create a new lobby or join an existing one by room id.
      </div>

      <input id="nickname" class="input" value="${ui.nickname}" maxlength="18" placeholder="Nickname" />
      <input id="roomCode" class="input" maxlength="64" placeholder="Room id for joining" />

      <div style="display:flex; gap:12px; flex-direction:column;">
        <button id="createBtn" class="button">Create Lobby</button>
        <button id="joinBtn" class="button secondary">Join Lobby</button>
      </div>
    </div>
  </div>`;

  if (ui.phase === 'waiting')
    return `<div class="center-panel"><div class="panel"><div class="title">Lobby</div><div class="subtitle">Share this room id: <strong>${ui.roomCode}</strong><br/>Players in lobby: <strong>${ui.scoreboard.length}</strong><br/>Match duration: <strong>5 minutes</strong><br/>Pickup icons: <strong>↺</strong> reset trails, ${renderShuffleLegendBadge()} shuffle colors</div><button id="startBtn" class="button">Start match</button>${renderScoreboard()}</div></div>`;

  if (ui.phase === 'round-end')
    return `<div class="center-panel"><div class="panel"><div class="title">Round finished</div><div class="subtitle">${ui.winnerText || 'Preparing next round...'}</div>${renderPlacements()}${renderScoreboard()}</div></div>`;

  if (ui.phase === 'finished')
    return `<div class="center-panel"><div class="panel"><div class="title">Match finished</div><div class="subtitle">${ui.winnerText || ''}</div>${renderScoreboard()}<button id="startBtn" class="button">Start new match</button><button id="backBtn" class="button secondary">Back to menu</button></div></div>`;

  return '';
}

function renderOverlayContent(): void {
  const timeValue =
    ui.phase === 'waiting' ? '05:00' : formatMatchTime(ui.matchRemainingMs);
  const showTopRow = ui.phase === 'round-end' || ui.phase === 'finished';

  overlayEl.innerHTML = `
    ${showTopRow ? `
    <div class="top-row">
      <div class="card metric">
        <div class="label">Room</div>
        <div class="value">${ui.roomCode || '—'}</div>
      </div>
      <div class="card metric">
        <div class="label">Time</div>
        <div class="value">${timeValue}</div>
      </div>
    </div>
    ` : ''}

    ${ui.phase === 'playing' ? `
      <div class="touch-controls">
        <div id="touch-left" class="touch-half"></div>
        <div id="touch-right" class="touch-half"></div>
      </div>
      <div class="touch-labels">
        <span>Hold left</span>
        <span>Hold right</span>
      </div>
    ` : ''}

    ${ui.toast ? `<div class="toast">${ui.toast}</div>` : ''}
    ${renderCenterPanel()}
  `;

  bindEvents();
}

function handleOverlayClick(e: Event) {
  const target = (e.target as HTMLElement) ?? null;
  if (!target) return;

  if (target.id === 'createBtn') {
    createLobby();
    return;
  }

  if (target.id === 'joinBtn') {
    joinExistingLobby();
    return;
  }

  if (target.id === 'startBtn') {
    console.log('Emitting start game');
    socket.emit('startGame');
    return;
  }

  if (target.id === 'backBtn') {
    leaveToMenu();
  }
}

function createLobby() {
  const nickname =
    (document.getElementById('nickname') as HTMLInputElement | null)?.value.trim() ||
    ui.nickname;

  ui.nickname = nickname;

  if (socket.connected) socket.disconnect();
  socket.connect();
  socket.emit('joinLobby', { nickname, roomCode: '' });
}

function joinExistingLobby() {
  const nickname =
    (document.getElementById('nickname') as HTMLInputElement | null)?.value.trim() ||
    ui.nickname;
  const roomCode =
    (document.getElementById('roomCode') as HTMLInputElement | null)?.value
      ?.trim()
      ?.toUpperCase() ?? '';

  if (!roomCode) {
    setToast('Enter room id first');
    return;
  }

  ui.nickname = nickname;

  if (socket.connected) socket.disconnect();
  socket.connect();
  socket.emit('joinLobby', { nickname, roomCode });
}

function leaveToMenu() {
  socket.disconnect();
  resetToMenu();
  renderOverlayContent();
}

/** Reset UI to menu and re-render (e.g. after disconnect). */
export function goToMenu(): void {
  resetToMenu();
  renderOverlayContent();
}

export function setToast(message: string, duration = 2200): void {
  ui.toast = message;
  renderOverlayContent();
  window.clearTimeout(getToastTimer());
  setToastTimer(
    window.setTimeout(() => {
      ui.toast = '';
      renderOverlayContent();
    }, duration)
  );
}

export function renderOverlay(): void {
  renderOverlayContent();
}

export function applyState(state: StateSnapshot): void {
  if (updateFromSnapshot(state)) {
    renderOverlayContent();
  }
}

export function setScene(scene: DigiScene): void {
  sceneRef = scene;
}

export function init(appContainer: HTMLDivElement): HTMLElement {
  appContainer.innerHTML = `<div class="app-shell"><div id="game"></div><div id="overlay" class="overlay"></div></div>`;
  overlayEl = document.getElementById('overlay')!;
  overlayEl.addEventListener('click', handleOverlayClick);
  return overlayEl;
}
