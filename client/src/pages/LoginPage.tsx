import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email, password, name);
      } else {
        await login(email, password);
      }
      window.location.href = "/overview";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">ARCA</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            The Bloomberg Terminal for Pokemon Cards
          </p>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <h2 className="mb-4 text-lg font-semibold">{isSignup ? "Create account" : "Sign in"}</h2>

          {error && (
            <div className="mb-4 rounded-md bg-[color-mix(in_srgb,var(--color-negative)_10%,var(--color-card))] p-3 text-sm text-[var(--color-negative)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm outline-none focus:border-[var(--color-ring)] focus:ring-1 focus:ring-[var(--color-ring)]"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm outline-none focus:border-[var(--color-ring)] focus:ring-1 focus:ring-[var(--color-ring)]"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-2 text-sm outline-none focus:border-[var(--color-ring)] focus:ring-1 focus:ring-[var(--color-ring)]"
                placeholder={isSignup ? "Min 8 characters" : "Your password"}
                required
                minLength={isSignup ? 8 : undefined}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Loading..." : isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-[var(--color-muted-foreground)]">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
              }}
              className="font-medium text-[var(--color-primary)] hover:underline"
            >
              {isSignup ? "Sign in" : "Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
