# How to run

## Install
From the root folder:

```bash
npm install
```

## Start both apps

```bash
npm run dev
```

Client:
- http://localhost:5173

Server:
- http://localhost:2567

## Test on phones on the same Wi‑Fi
Example PC IP: `192.168.1.50`

Create file:

`apps/client/.env`

```env
VITE_SERVER_URL=http://192.168.1.50:2567
```

Then restart:

```bash
npm run dev
```

Open this on each phone:
- `http://192.168.1.50:5173`

## Flow
- First player leaves room code empty and creates a lobby
- The room code appears on screen
- Other players type that room code and join
- Press **Start match**

## Controls
- Hold left half of the screen to turn left
- Hold right half of the screen to turn right
