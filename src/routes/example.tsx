import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/example")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="p-4">
      <p className="pb-4">Testing Sentry</p>
      <button
        className="bg-amber-500 px-4 py-2 rounded-md cursor-pointer"
        onClick={() => {
          throw new Error("This is your first error!");
        }}
      >
        Break the world
      </button>
    </div>
  );
}
