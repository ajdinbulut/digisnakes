# Digi Snakes Starter (Socket.IO version)

This version uses:
- Phaser 3 for rendering
- Socket.IO for realtime multiplayer
- Node.js + TypeScript backend

Why Socket.IO here?
The previous Colyseus package combination caused version/install friction. This version is meant to be easier to run immediately on Windows.

Included:
- up to 4 players per lobby
- random spawn positions
- 3 second grace period before trail starts
- trails with periodic gaps
- collision with walls and any trail
- 5 rounds total
- scoring 3 / 2 / 1 / 0
- special pickup that clears trails and shuffles colors
