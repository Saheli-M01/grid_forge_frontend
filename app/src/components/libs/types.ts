export interface CellState {
  owner: string | null;
  color: string | null;
  name: string | null;
  claimedAt: number | null;
  lockedUntil: number | null; // protected for a particular time N ms after claim
  contestCount: number; // how many times the cell changed
}
