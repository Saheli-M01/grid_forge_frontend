export interface CellState {
  owner: string | null;
  color: string | null;
  name: string | null;
  claimedAt: number | null;
  lockedUntil: number | null; // protected for a particular time N ms after claim
  contestCount: number; // how many times the cell changed
}
export interface LeaderboardEntry {
  id: string;
  name: string;
  color: string;
  score: number;
  streak: number;
  bombs: number;
}

export interface ActivityEvent {
  actorId: string; // stable id ->  used to resolve current name
  actorName: string; // name at time of event (fallback)
  actorColor: string;
  victimName: string | null; // null -> unclaimed cell
  index: number;
  ts: number;
  isBomb: boolean;
}

export type ServerMessage =
  | {
      type: "init";
      userId: string;
      color: string;
      name: string;
      grid: CellState[];
      cols: number;
      rows: number;
      leaderboard: LeaderboardEntry[];
      onlineCount: number;
      myBombs: number;
      myStreak: number;
    }
  | {
      type: "update";
      indices: number[]; // array — bomb can update multiple cells
      cells: CellState[];
      owner: string;
      color: string;
      name: string;
      leaderboard: LeaderboardEntry[];
      isBomb: boolean;
    }
  | {
      type: "presence";
      onlineCount: number;
      leaderboard: LeaderboardEntry[];
    }
  | {
      type: "rename";
      userId: string;
      name: string;
      leaderboard: LeaderboardEntry[];
    }
  | {
      type: "cooldown";
      remaining: number;
    }
  | {
      type: "streak";
      streak: number;
      multiplier: number;
    }
  | {
      type: "bomb_ready";
      bombs: number;
    }
  | {
      type: "activity";
      events: ActivityEvent[];
    }
  | {
      type: "protected";
      index: number;
      lockedUntil: number;
    };

export type ClientMessage =
  | { type: "claim"; index: number }
  | { type: "bomb"; index: number }
  | { type: "rename"; name: string };
