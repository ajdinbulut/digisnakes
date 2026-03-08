import Phaser from 'phaser';
import './styles/app.css';
import { socket } from './net/socket';
import { ui } from './state/uiState';
import * as overlay from './ui/overlay';
import { DigiScene } from './game/DigiScene';

const app = document.querySelector<HTMLDivElement>('#app')!;
overlay.init(app);

const scene = new DigiScene();
new Phaser.Game({
  type: Phaser.CANVAS,
  parent: 'game',
  width: 900,
  height: 1600,
  backgroundColor: '#090b12',
  scene: [scene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});

overlay.setScene(scene);

socket.on('snapshot', (state) => overlay.applyState(state));
socket.on('toast', (msg: string) => overlay.setToast(msg));
socket.on('connect_error', () => overlay.setToast('Connection error'));
socket.on('disconnect', () => {
  if (ui.phase !== 'menu') {
    overlay.setToast('Disconnected');
    overlay.goToMenu();
  }
});

overlay.renderOverlay();
