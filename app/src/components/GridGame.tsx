"use client";
import Header from "./Header";
import Grid from "./Grid";
export default function GridGame() {
  //for testing
  const cols = 40;
  const rows = 30;

  const grid = Array.from({ length: cols * rows }, (_, i) => ({
    owner: i % 5 === 0 ? "user1" : null,
    color: i % 5 === 0 ? "#3B82F6" : null,
    name: i % 5 === 0 ? "Diya" : null,
    claimedAt: Date.now(),
    lockedUntil: null,
    contestCount: Math.floor(Math.random() * 10),
  }));

  return (
    <>
      {" "}
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 flex items-center justify-center overflow-hidden p-4">
            {" "}
            <Grid
              grid={grid}
              cols={cols}
              rows={rows}
              userId="user1"
              myColor="#3B82F6"
              cooldownUntil={0}
              myBombs={2}
              lastBombIndices={[]}
              onCellClick={() => {}}
              onCellHover={() => {}}
            />
          </main>
        </div>
      </div>
    </>
  );
}
