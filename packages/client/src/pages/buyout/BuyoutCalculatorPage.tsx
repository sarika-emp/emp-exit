import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Loader2,
  Calendar,
  Calculator,
  DollarSign,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Send,
} from "lucide-react";
import { apiGet, apiPost } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";

function formatINR(amountPaise: number): string {
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupees);
}

interface BuyoutCalc {
  originalNoticeDays: number;
  servedDays: number;
  remainingDays: number;
  dailyRate: number;
  buyoutAmount: number;
  currency: string;
  requestedLastDate: string;
  originalLastDate: string;
}

export function BuyoutCalculatorPage() {
  const [searchParams] = useSearchParams();
  const exitIdParam = searchParams.get("exitId");

  const [exit, setExit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requestedDate, setRequestedDate] = useState("");
  const [calculation, setCalculation] = useState<BuyoutCalc | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingBuyout, setExistingBuyout] = useState<any>(null);

  useEffect(() => {
    loadExit();
  }, []);

  async function loadExit() {
    setLoading(true);
    try {
      // Try self-service first (employee view)
      const res = await apiGet<any>("/self-service/my-exit");
      if (res.data) {
        setExit(res.data);
        // Check for existing buyout
        try {
          const buyoutRes = await apiGet<any>("/self-service/my-buyout");
          if (buyoutRes.data) setExistingBuyout(buyoutRes.data);
        } catch {
          // no existing buyout
        }
      }
    } catch {
      // If self-service fails and we have an exitId, try admin API
      if (exitIdParam) {
        try {
          const res = await apiGet<any>(`/exits/${exitIdParam}`);
          setExit(res.data);
          try {
            const buyoutRes = await apiGet<any>(`/buyout/exit/${exitIdParam}`);
            if (buyoutRes.data) setExistingBuyout(buyoutRes.data);
          } catch {
            // no existing buyout
          }
        } catch {
          setExit(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!requestedDate || !exit) return;

    const timer = setTimeout(() => {
      performCalculation();
    }, 300);

    return () => clearTimeout(timer);
  }, [requestedDate]);

  async function performCalculation() {
    if (!exit || !requestedDate) return;

    setCalcLoading(true);
    setCalcError(null);
    try {
      const res = await apiPost<BuyoutCalc>("/self-service/my-buyout/calculate", {
        requested_last_date: requestedDate,
      });
      setCalculation(res.data ?? null);
    } catch (err: any) {
      setCalcError(err.response?.data?.error?.message || "Failed to calculate buyout");
      setCalculation(null);
    } finally {
      setCalcLoading(false);
    }
  }

  async function handleSubmit() {
    if (!calculation || !exit) return;

    if (!confirm("Are you sure you want to submit this buyout request? This will be sent to your manager for approval.")) {
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/self-service/my-buyout/request", {
        requested_last_date: requestedDate,
      });
      setSubmitted(true);
    } catch (err: any) {
      setCalcError(err.response?.data?.error?.message || "Failed to submit buyout request");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600 dark:text-rose-400" />
      </div>
    );
  }

  if (!exit) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notice Period Buyout</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You need an active exit request to use the buyout calculator.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Calculator className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No active exit request found.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notice Period Buyout</h1>
        </div>
        <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 p-12 text-center">
          <Send className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h2 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">Buyout Request Submitted</h2>
          <p className="text-green-700 dark:text-green-300 mb-1">
            Your request to leave on <strong>{formatDate(requestedDate)}</strong> has been submitted.
          </p>
          <p className="text-green-600 dark:text-green-400 text-sm">
            Buyout amount: <strong>{calculation ? formatINR(calculation.buyoutAmount) : "--"}</strong>
          </p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-4">
            You will be notified once your manager reviews the request.
          </p>
          <Link
            to="/exits/my"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Exit
          </Link>
        </div>
      </div>
    );
  }

  // If there's an existing pending/approved buyout
  if (existingBuyout && existingBuyout.status !== "rejected") {
    return (
      <div className="space-y-6">
        <div>
          <Link to="/exits/my" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-muted-foreground mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to My Exit
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Notice Period Buyout</h1>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="h-6 w-6 text-rose-500" />
            <h2 className="text-lg font-semibold text-foreground">Existing Buyout Request</h2>
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                existingBuyout.status === "approved"
                  ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300"
                  : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
              )}
            >
              {existingBuyout.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Requested Last Date</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">
                {formatDate(existingBuyout.requested_last_date)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Days to Buy Out</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{existingBuyout.remaining_days} days</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Daily Rate</p>
              <p className="mt-0.5 text-sm font-medium text-foreground">{formatINR(existingBuyout.daily_rate)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Buyout Amount</p>
              <p className="mt-0.5 text-lg font-bold text-rose-600 dark:text-rose-400">{formatINR(existingBuyout.buyout_amount)}</p>
            </div>
          </div>

          {existingBuyout.status === "approved" && (
            <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 p-3 text-sm text-green-700 dark:text-green-300">
              Your buyout has been approved. Your last working date has been updated to{" "}
              <strong>{formatDate(existingBuyout.requested_last_date)}</strong>.
              The buyout amount will be included in your Full & Final settlement.
            </div>
          )}
        </div>
      </div>
    );
  }

  const isTerminal = exit.status === "completed" || exit.status === "cancelled";
  const minDate = exit.resignation_date || "";
  const maxDate = exit.last_working_date || "";
  const isDateSoon = calculation && calculation.remainingDays > (exit.notice_period_days * 0.7);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/exits/my" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-muted-foreground mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to My Exit
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Notice Period Buyout Calculator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calculate how much it costs to leave before your notice period ends.
        </p>
      </div>

      {isTerminal && (
        <div className="rounded-lg bg-muted border border-border p-4 text-sm text-muted-foreground">
          This exit request is {exit.status}. Buyout is no longer applicable.
        </div>
      )}

      {!isTerminal && (
        <>
          {/* Current Exit Info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Current Notice Period</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Notice Period</p>
                <p className="text-sm font-medium text-foreground">{exit.notice_period_days} days</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Resignation Date</p>
                <p className="text-sm font-medium text-foreground">
                  {exit.resignation_date ? formatDate(exit.resignation_date) : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Working Date</p>
                <p className="text-sm font-medium text-foreground">
                  {exit.last_working_date ? formatDate(exit.last_working_date) : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Notice Waived</p>
                <p className="text-sm font-medium text-foreground">
                  {exit.notice_period_waived ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </div>

          {/* Date Picker */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-rose-500" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                When do you want your last working day to be?
              </h2>
            </div>
            <input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              min={minDate}
              max={maxDate}
              className="block w-full max-w-xs rounded-lg border border-border bg-card text-foreground px-3 py-2.5 text-sm text-foreground focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none"
            />
            {minDate && maxDate && (
              <p className="mt-2 text-xs text-muted-foreground">
                Choose a date between {formatDate(minDate)} and {formatDate(maxDate)}
              </p>
            )}
          </div>

          {/* Calculation Result */}
          {calcLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-rose-500 mr-2" />
              <span className="text-sm text-muted-foreground">Calculating...</span>
            </div>
          )}

          {calcError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-300">
              {calcError}
            </div>
          )}

          {calculation && !calcLoading && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-rose-500" />
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Buyout Calculation</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/50 border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Original Notice Period</p>
                  <p className="text-lg font-semibold text-foreground">{calculation.originalNoticeDays} days</p>
                </div>
                <div className="rounded-lg bg-muted/50 border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Days Served</p>
                  <p className="text-lg font-semibold text-foreground">{calculation.servedDays} days</p>
                </div>
                <div className="rounded-lg bg-muted/50 border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Days to Buy Out</p>
                  <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">{calculation.remainingDays} days</p>
                </div>
                <div className="rounded-lg bg-muted/50 border border-border p-4">
                  <p className="text-xs text-muted-foreground mb-1">Daily Rate</p>
                  <p className="text-lg font-semibold text-foreground">{formatINR(calculation.dailyRate)}</p>
                </div>
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-4 sm:col-span-2">
                  <p className="text-xs text-rose-500 font-medium mb-1">Buyout Amount</p>
                  <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">{formatINR(calculation.buyoutAmount)}</p>
                  <p className="text-xs text-rose-400 mt-1">
                    {calculation.remainingDays} days x {formatINR(calculation.dailyRate)}/day
                  </p>
                </div>
              </div>

              {isDateSoon && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Early departure warning</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      You are buying out more than 70% of your notice period. The buyout amount will
                      be deducted from your Full & Final settlement.
                    </p>
                  </div>
                </div>
              )}

              {calculation.dailyRate === 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-3">
                  <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Salary data unavailable</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      Your daily rate shows as zero because salary data is not available in the system.
                      HR will update the final amount after reviewing your request.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting || calculation.buyoutAmount <= 0}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Buyout Request
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
