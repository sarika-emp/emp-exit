import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DoorOpen, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useLogin } from "@/api/hooks";
import { useAuthStore, homeFor } from "@/lib/auth-store";
import toast from "react-hot-toast";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("session") === "expired";
  const loginMutation = useLogin();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await loginMutation.mutateAsync({ email, password });
      if (res.success) {
        login(res.data.user, res.data.tokens);
        toast.success(`Welcome back, ${res.data.user.firstName}!`);
        navigate(homeFor(res.data.user));
      } else {
        toast.error(res.error?.message || "Login failed");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Login failed. Check your credentials.");
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-rose-600 to-rose-800 p-12">
        <div className="max-w-md text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card/20">
              <DoorOpen className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold">EMP Exit</span>
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-4">
            Streamline employee exit management
          </h2>
          <p className="text-rose-100 text-lg leading-relaxed">
            Manage resignations, clearance, knowledge transfer, FnF settlements,
            exit interviews, and alumni networking -- all in one place.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              "Exit workflows",
              "Clearance tracking",
              "KT management",
              "FnF settlement",
              "Exit interviews",
              "Alumni network",
              "Letter generation",
              "Analytics",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-rose-100">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-300" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-muted/50 px-4">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600">
              <DoorOpen className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">EMP Exit</span>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to manage employee exits</p>

            {sessionExpired && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Your session has expired. Please log in again.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="mt-1 block w-full rounded-lg border border-border bg-card text-foreground px-3 py-2.5 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="block w-full rounded-lg border border-border bg-card text-foreground px-3 py-2.5 pr-10 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loginMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Part of the EMP HRMS ecosystem
          </p>
        </div>
      </div>
    </div>
  );
}
