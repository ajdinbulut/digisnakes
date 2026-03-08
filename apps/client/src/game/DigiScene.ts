import Phaser from 'phaser';
import type { TurnDirection } from '../types/game';
import { socket } from '../net/socket';
import {
  ui,
  lastState,
} from '../state/uiState';

const SHUFFLE_PICKUP_COLORS = [0xff4d4f, 0x3b82f6, 0xfacc15, 0x22c55e] as const;
const WHITE_PLAYER_COLOR = '#ffffff';
const WHITE_PLAYER_STROKE_COLOR = 0x334155;
const LOCAL_WHITE_PLAYER_STROKE_COLOR = 0x2563eb;

export class DigiScene extends Phaser.Scene {
  private localTurn: TurnDirection = 0;
  private circles = new Map<string, Phaser.GameObjects.Arc>();
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private pickupCircle!: Phaser.GameObjects.Arc;
  private pickupBadge!: Phaser.GameObjects.Graphics;
  private pickupText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private winnerText!: Phaser.GameObjects.Text;

  constructor() {
    super('digi');
  }

  create() {
    this.add.rectangle(0, 0, 900, 1600, 0x090b12).setOrigin(0, 0);

    const borderX = 20;
    const borderY = 20;
    const borderW = 860;
    const borderH = 1560;

    const borderGlow = this.add.graphics();
    borderGlow.lineStyle(28, 0x3b82f6, 0.06);
    borderGlow.strokeRect(borderX - 2, borderY - 2, borderW + 4, borderH + 4);
    borderGlow.lineStyle(18, 0x60a5fa, 0.1);
    borderGlow.strokeRect(borderX - 1, borderY - 1, borderW + 2, borderH + 2);
    borderGlow.lineStyle(10, 0x93c5fd, 0.16);
    borderGlow.strokeRect(borderX, borderY, borderW, borderH);

    this.add.rectangle(borderX, borderY, borderW, borderH).setOrigin(0, 0).setStrokeStyle(4, 0x2a3145, 1);

    const borderShine = this.add.graphics();
    borderShine.lineStyle(2, 0xffffff, 0.12);
    borderShine.strokeRect(borderX + 2, borderY + 2, borderW - 4, borderH - 4);

    this.trailGraphics = this.add.graphics();
    this.pickupCircle = this.add
      .circle(-100, -100, 10, 0xffffff, 1)
      .setVisible(false);
    this.pickupBadge = this.add.graphics().setVisible(false);
    this.pickupText = this.add
      .text(-100, -100, '', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setVisible(false);
    this.countdownText = this.add
      .text(450, 160, '', {
        fontFamily: 'Arial',
        fontSize: '72px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.winnerText = this.add
      .text(450, 240, '', {
        fontFamily: 'Arial',
        fontSize: '30px',
        color: '#c7d5f5',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
  }

  setTurn(dir: TurnDirection) {
    if (this.localTurn === dir) return;
    this.localTurn = dir;
    socket.emit('turn', { direction: dir });
  }

  private drawShufflePickupBadge(x: number, y: number): void {
    this.pickupBadge.clear();
    this.pickupBadge.setVisible(true);

    const radius = 18;
    const segmentSize = Math.PI / 2;
    const startAngle = -Math.PI / 2;

    for (let i = 0; i < SHUFFLE_PICKUP_COLORS.length; i++) {
      const from = startAngle + i * segmentSize;
      const to = from + segmentSize;

      this.pickupBadge.fillStyle(SHUFFLE_PICKUP_COLORS[i], 1);
      this.pickupBadge.beginPath();
      this.pickupBadge.moveTo(x, y);
      this.pickupBadge.arc(x, y, radius, from, to, false);
      this.pickupBadge.closePath();
      this.pickupBadge.fillPath();
    }

    this.pickupBadge.lineStyle(3, 0xffffff, 0.95);
    this.pickupBadge.strokeCircle(x, y, radius);
  }

  update() {
    if (!lastState) return;

    this.countdownText.setText(
      lastState.phase === 'countdown'
        ? String(Math.max(1, Math.ceil(lastState.countdown)))
        : ''
    );
    this.winnerText.setText(
      lastState.phase === 'round-end' || lastState.phase === 'finished'
        ? lastState.winnerText
        : ''
    );

    const active = new Set<string>();
    for (const p of lastState.players) {
      active.add(p.id);
      let c = this.circles.get(p.id);
      if (!c) {
        c = this.add.circle(
          p.x,
          p.y,
          11,
          Phaser.Display.Color.HexStringToColor(p.color).color,
          1
        );
        this.circles.set(p.id, c);
      }
      const smooth = p.id === ui.localPlayerId ? 0.35 : 0.22;
      const nextX = Phaser.Math.Linear(c.x, p.x, smooth);
      const nextY = Phaser.Math.Linear(c.y, p.y, smooth);
      c.setPosition(nextX, nextY);
      c.setFillStyle(
        Phaser.Display.Color.HexStringToColor(p.color).color,
        p.alive ? 1 : 0.25
      );
      const isWhitePlayer = p.color.toLowerCase() === WHITE_PLAYER_COLOR;
      const isLocalPlayer = p.id === ui.localPlayerId;
      const strokeWidth = isLocalPlayer ? 3 : isWhitePlayer ? 2 : 0;
      const strokeColor = isLocalPlayer
        ? isWhitePlayer
          ? LOCAL_WHITE_PLAYER_STROKE_COLOR
          : 0xffffff
        : WHITE_PLAYER_STROKE_COLOR;
      c.setStrokeStyle(strokeWidth, strokeColor, strokeWidth > 0 ? 1 : 0);
    }
    for (const [id, c] of this.circles.entries()) {
      if (!active.has(id)) {
        c.destroy();
        this.circles.delete(id);
      }
    }

    this.trailGraphics.clear();
    for (const t of lastState.trails) {
      if (!t.active) continue;
      this.trailGraphics.lineStyle(
        6,
        Phaser.Display.Color.HexStringToColor(t.color).color,
        1
      );
      this.trailGraphics.beginPath();
      this.trailGraphics.moveTo(t.x1, t.y1);
      this.trailGraphics.lineTo(t.x2, t.y2);
      this.trailGraphics.strokePath();
    }

    if (lastState.pickup?.active) {
      const isReset = lastState.pickup.kind === 'reset-trails';

      if (isReset) {
        this.pickupBadge.clear();
        this.pickupBadge.setVisible(false);
        this.pickupCircle
          .setVisible(true)
          .setPosition(lastState.pickup.x, lastState.pickup.y)
          .setRadius(18)
          .setFillStyle(0x38bdf8, 1)
          .setStrokeStyle(3, 0xffffff, 0.95);

        this.pickupText
          .setVisible(true)
          .setPosition(lastState.pickup.x, lastState.pickup.y)
          .setText('↺');
      } else {
        this.pickupCircle.setVisible(false);
        this.pickupText.setVisible(false);
        this.drawShufflePickupBadge(lastState.pickup.x, lastState.pickup.y);
      }
    } else {
      this.pickupBadge.clear();
      this.pickupBadge.setVisible(false);
      this.pickupCircle.setVisible(false);
      this.pickupText.setVisible(false);
    }
  }
}
