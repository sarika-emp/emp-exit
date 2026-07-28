import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  UserMinus,
  ClipboardCheck,
  Shield,
  CheckCircle,
  DollarSign,
  Calculator,
  FileSignature,
  Download,
} from "lucide-react";
import { apiGet, api } from "@/api/client";
import toast from "react-hot-toast";
import { cn, formatDate } from "@/lib/utils";

const LETTER_TYPES: Record<string, string> = {
  experience: "Experience Letter",
  relieving: "Relieving Letter",
  service_certificate: "Service Certificate",
  noc: "NOC",
};

const STATUS_COLORS: Record<string, string> = {
  initiated: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
  notice_period: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  clearance_pending: "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300",
  fnf_pending: "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300",
  fnf_processed: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300",
  completed: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
  cancelled: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  initiated: "Initiated",
  notice_period: "Notice Period",
  clearance_pending: "Clearance Pending",
  fnf_pending: "FnF Pending",
  fnf_processed: "FnF Processed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const CHECKLIST_STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
  completed: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
  waived: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  na: "bg-muted/50 text-muted-foreground",
};

const CLEARANCE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
  rejected: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
  waived: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
};

export function MyExitPage() {
  const [exit, setExit] = useState<any>(null);
  const [checklist, setChecklist] = useState<any>(null);
  const [letters, setLetters] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const exitRes = await apiGet<any>("/self-service/my-exit");
        if (cancelled) return;

        if (exitRes.data) {
          setExit(exitRes.data);

          // Load checklist
          try {
            const checklistRes = await apiGet<any>("/self-service/my-checklist");
            if (!cancelled) setChecklist(checklistRes.data);
          } catch {
            // no checklist
          }

          // Load my documents (generated letters)
          try {
            const lettersRes = await apiGet<any[]>("/self-service/my-letters");
            if (!cancelled) setLetters(lettersRes.data ?? []);
          } catch {
            // no letters
          }
        }
      } catch {
        // no exit
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // The download endpoint returns raw HTML as an attachment, so fetch it as a
  // blob and trigger a browser download.
  async function handleDownload(letterId: string, letterType: string) {
    setDownloadingId(letterId);
    try {
      const response = await api.get(`/self-service/my-letters/${letterId}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${letterType}_letter.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download document");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleWithdraw() {
    setWithdrawing(true);
    try {
      const res = await api.post("/self-service/my-exit/withdraw");
      setExit(res.data?.data ?? null);
      toast.success("Resignation withdrawn");
      setConfirmWithdraw(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to withdraw resignation");
    } finally {
      setWithdrawing(false);
    }
  }

  // Employees can withdraw their own resignation only while it's still early.
  const canWithdraw = exit && (exit.status === "initiated" || exit.status === "notice_period");

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
          <h1 className="text-2xl font-bold text-foreground">My Exit Status</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track your exit process.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <UserMinus className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">You don't have an active exit request.</p>
          <Link
            to="/exits/resign"
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
          >
            Submit Resignation
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Exit Status</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track your exit process and pending actions.</p>
      </div>

      {/* Status Card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">Exit Request</h2>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                  STATUS_COLORS[exit.status],
                )}
              >
                {STATUS_LABELS[exit.status] || exit.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground capitalize">
              {exit.exit_type?.replace(/_/g, " ")} &middot; {exit.reason_category?.replace(/_/g, " ")}
            </p>
          </div>
          {canWithdraw && (
            <button
              onClick={() => setConfirmWithdraw(true)}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <UserMinus className="h-3.5 w-3.5" />
              Withdraw Resignation
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Resignation Date</p>
            <p className="mt-0.5 text-sm text-foreground">
              {exit.resignation_date ? formatDate(exit.resignation_date) : "--"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Working Date</p>
            <p className="mt-0.5 text-sm text-foreground">
              {exit.last_working_date ? formatDate(exit.last_working_date) : "--"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notice Period</p>
            <p className="mt-0.5 text-sm text-foreground">
              {exit.notice_period_days} days
              {exit.notice_period_waived ? " (waived)" : ""}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Initiated On</p>
            <p className="mt-0.5 text-sm text-foreground">{formatDate(exit.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Notice Buyout Card */}
      {exit && exit.status !== "completed" && exit.status !== "cancelled" && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950/40">
                <Calculator className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Notice Period Buyout</h3>
                <p className="text-xs text-muted-foreground">Want to leave before your notice period ends?</p>
              </div>
            </div>
            <Link
              to="/buyout/calculator"
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              <Calculator className="h-4 w-4" />
              Calculate Buyout
            </Link>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {exit.checklist_summary && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
              <ClipboardCheck className="h-5 w-5 text-rose-500" />
              Checklist Progress
            </div>
            <p className="text-3xl font-bold text-foreground">{exit.checklist_summary.progress}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {exit.checklist_summary.completed} / {exit.checklist_summary.total} items done
            </p>
            <div className="mt-2 w-full bg-muted rounded-full h-2">
              <div
                className="bg-rose-500 h-2 rounded-full transition-all"
                style={{ width: `${exit.checklist_summary.progress}%` }}
              />
            </div>
          </div>
        )}

        {exit.clearance_summary && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
              <Shield className="h-5 w-5 text-rose-500" />
              Clearance Progress
            </div>
            <p className="text-3xl font-bold text-foreground">{exit.clearance_summary.progress}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {exit.clearance_summary.approved} / {exit.clearance_summary.total} departments
            </p>
            <div className="mt-2 w-full bg-muted rounded-full h-2">
              <div
                className="bg-rose-500 h-2 rounded-full transition-all"
                style={{ width: `${exit.clearance_summary.progress}%` }}
              />
            </div>
          </div>
        )}

        {exit.fnf_summary ? (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
              <DollarSign className="h-5 w-5 text-rose-500" />
              Full & Final
            </div>
            <p className="text-3xl font-bold text-foreground capitalize">{exit.fnf_summary.status}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {exit.fnf_summary.total_payable}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
              <DollarSign className="h-5 w-5 text-muted-foreground/50" />
              Full & Final
            </div>
            <p className="text-sm text-muted-foreground mt-2">Not yet initiated</p>
          </div>
        )}
      </div>

      {/* Checklist Items */}
      {checklist && checklist.items && checklist.items.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">My Checklist</h2>
          </div>
          <div className="divide-y divide-border px-6">
            {checklist.items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  {item.status === "completed" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-border" />
                  )}
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      item.status === "completed" ? "text-muted-foreground line-through" : "text-foreground",
                    )}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    CHECKLIST_STATUS_COLORS[item.status] || "bg-muted text-muted-foreground",
                  )}
                >
                  {item.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Documents */}
      {letters.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-6 py-4">
            <FileSignature className="h-5 w-5 text-rose-500" />
            <h2 className="text-lg font-semibold text-foreground">My Documents</h2>
          </div>
          <div className="divide-y divide-border px-6">
            {letters.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {LETTER_TYPES[l.letter_type] || l.letter_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Issued: {l.issued_date ? formatDate(l.issued_date) : "--"}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(l.id, l.letter_type)}
                  disabled={downloadingId === l.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
                >
                  {downloadingId === l.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdraw confirmation */}
      {confirmWithdraw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Withdraw Resignation?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This cancels your exit request. Your manager and HR will be notified. You can submit a
              new resignation later if needed.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmWithdraw(false)}
                disabled={withdrawing}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
              >
                Keep Resignation
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {withdrawing && <Loader2 className="h-4 w-4 animate-spin" />}
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
