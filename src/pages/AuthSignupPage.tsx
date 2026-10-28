import { useState, type FormEvent } from "react";
import { ShieldCheck, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import signupHero from "../assets/images/stitch/auth-signup-hero.jpg";

const AuthSignupPage = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMocking, setIsMocking] = useState(false);

  const handleMockLogin = async () => {
    setError(null);
    try {
      setIsMocking(true);
      const response = await fetch("/api/auth/mock-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Mock login failed");
      }

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Mock login failed");
    } finally {
      setIsMocking(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const displayName = `${firstName} ${lastName}`.trim();

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          displayName: displayName || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Registration failed");
      }

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-md md:my-10 md:flex-row">
        <div className="relative hidden w-1/2 items-center justify-center bg-slate-900 md:flex">
          <img
            src={signupHero}
            alt="Futuristic operations center"
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="relative z-10 px-10 text-center text-white">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-semibold">The Future of Flow</h2>
            <p className="mt-3 text-sm text-slate-200">
              Turn workplace noise into focused action with precision ranking.
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center px-8 py-12 md:px-12">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold">Create an account</h1>
            <p className="mt-2 text-sm text-slate-500">
              Already have an account?{" "}
              <button
                type="button"
                className="text-blue-600"
                onClick={() => navigate("/login")}
              >
                Log In
              </button>
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              onClick={() => {
                window.location.href = "/auth/google";
              }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              disabled={isMocking}
              onClick={handleMockLogin}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 py-3 px-4 text-sm font-semibold text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg disabled:opacity-60 cursor-pointer"
            >
              <Zap className="h-4 w-4 text-amber-300" />
              <span>{isMocking ? "Logging into demo..." : "Dev / Mock Login (Skip OAuth)"}</span>
            </button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 rounded-lg py-1 px-2 border border-emerald-200/60">
              <span className="font-semibold">Local Dev:</span>
              <span>Bypasses Google OAuth with a seeded demo user</span>
            </div>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs font-semibold text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            OR
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  First Name
                </label>
                <input
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Email Address
              </label>
              <input
                type="email"
                placeholder="john@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40"
              />
            </div>
            {error ? (
              <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthSignupPage;
