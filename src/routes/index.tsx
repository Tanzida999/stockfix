import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-md text-center space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome</h1>
        <p className="text-sm text-muted-foreground">
          Sign in or create an account to get started.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
