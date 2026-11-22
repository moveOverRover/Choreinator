"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-lg space-y-3">
      <h1 className="h2">Something went wrong</h1>
      <p className="text-sm">{error.message || "An unexpected error happened."}</p>
      {error.digest && <p className="text-xs text-muted">Error id: {error.digest}</p>}
      <button className="btn" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
