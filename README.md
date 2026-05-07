# GridForge

A real-time multiplayer territory claiming game built with Next.js, TypeScript, WebSockets, and Canvas rendering.

Players compete live on a shared grid by claiming cells, building streaks, earning bombs, and dominating the leaderboard.

---

# Features

## Real-Time Multiplayer

* Live shared grid updates using WebSockets
* Instant synchronization between players
* Online player tracking

## Interactive Grid

* 40 × 30 live grid
* Canvas-based rendering
* Smooth zoom and pan
* Heatmap mode
* Protected cells after claiming

## Competitive Gameplay

* Cell claiming system
* Streak multiplier system
* Bomb power-ups (3×3 destruction)
* Live leaderboard
* Activity feed

---

# Tech Stack

## Frontend

* Next.js
* TypeScript
* Tailwind CSS
* HTML Canvas API
* Lucide React Icons

## Realtime Communication

* WebSockets

---

# Project Structure


# Core Architecture

## 1. Grid Rendering

The grid is rendered using the HTML Canvas API for better performance.

Each cell is drawn dynamically using:

```ts
ctx.fillRect(x, y, cellW, cellH)
```

---

## 2. State Management

The entire game state is managed using React state.

```ts
const [state, setState] = useState<GridState>(INITIAL_STATE)
```

State contains:

* grid data
* player info
* leaderboard
* cooldowns
* activity feed
* bombs
* streaks

---

## 3. WebSocket Flow

### Client → Server

```ts
sendMsg({ type: "claim", index })
```

### Server → Client

```ts
ws.onmessage = (event) => {
  // update state
}
```

---

# Game Mechanics

## Claiming Cells

Players click cells to capture territory.

## Streaks

Consecutive captures increase score multiplier.

## Bombs

Players earn bombs after enough captures.
Bombs affect a 3×3 area.

## Heatmap

Shows heavily contested areas.

---

# Installation

## 1. Clone Repository

```bash
git clone <your-repo-url>
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Run Development Server

```bash
npm run dev
```
