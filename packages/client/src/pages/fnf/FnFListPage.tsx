import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calculator,
  DollarSign,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { apiGet } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  draft: { bg: "bg-muted text-muted-foreground", label: "Draft" },
  calculated: { bg: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300", label: "Calculated" },
  approved: { bg: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300", label: "Approved" },
  paid: { bg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300", label: "Paid" },
};

const STATUS_FILTERS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "calculated", label: "Calculated" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
];

interface FnFRow {
  id: string;
  exit_request_id: string;
  status: string;
  total_payable: number;
  updated_at: string;
  last_working_date: string | null;
  employee?: {
    first_name: string;
    last_name: string;
    designation: string | null;
    emp_code: string | null;
  } | null;
}

// Amounts are stored in paise; show as ₹ with grouping.
function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((paise || 0) / 100);
}

export function FnFListPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FnFRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params: Record<string, any> = {};
        if (statusFilter) params.status = statusFilter;
        const res = await apiGet<FnFRow[]>("/fnf", params);
        if (!cancelled) setRows(res.data ?? []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          Full & Final Settlements
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage FnF calculations, approvals, and payments.
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
        >
          {STATUS_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${rows.length} settlement${rows.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600 dark:text-rose-400" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-sm font-medium text-foreground">No FnF settlements yet</h3>
          <p className="mt-2 mx-auto max-w-lg text-sm text-muted-foreground">
            FnF settlements are created from an exit request. Open an exit and calculate its
            full &amp; final settlement to see it here.
          </p>
          <button
            onClick={() => navigate("/exits")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
          >
            View Exits
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Working Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Net Payable</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.draft;
                const name = r.employee
                  ? `${r.employee.first_name} ${r.employee.last_name}`
                  : "—";
                return (
                  <tr key={r.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <Link
                        to={`/fnf/${r.exit_request_id}`}
                        className="text-sm font-medium text-foreground hover:text-rose-600 dark:text-rose-400"
                      >
                        {name}
                      </Link>
                      {r.employee?.designation && (
                        <p className="text-xs text-muted-foreground">{r.employee.designation}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {r.last_working_date ? formatDate(r.last_working_date) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {formatINR(r.total_payable)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                          cfg.bg,
                        )}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/fnf/${r.exit_request_id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-300"
                      >
                        View
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Workflow legend */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h4 className="mb-4 text-center text-sm font-medium text-muted-foreground">Settlement Workflow</h4>
        <div className="flex items-center justify-center gap-2">
          {["draft", "calculated", "approved", "paid"].map((status, idx) => {
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                    cfg.bg,
                  )}
                >
                  {cfg.label}
                </span>
                {idx < 3 && <ArrowRight className="h-4 w-4 text-muted-foreground/50" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
