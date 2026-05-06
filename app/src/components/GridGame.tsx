import Header from "./Header";
export default function GridGame() {
  return (
    <>
      {" "}
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <Header />
      </div>
    </>
  );
}
