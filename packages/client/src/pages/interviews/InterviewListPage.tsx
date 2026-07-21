import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  SkipForward,
  Eye,
  Calendar,
} from "lucide-react";
import { apiGet } from "@/api/client";
import { cn, formatDate } from "@/lib/utils";

interface InterviewListItem {
  id: string;
  exit_request_id: string;
  template_id: string | null;
  interviewer_id: number | null;
  scheduled_date: string | null;
  completed_date: string | null;
  status: string;
  overall_rating: number | null;
  created_at: string;
  exit_status: string | null;
  employee?: { first_name: string; last_name: string; designation: string | null } | null;
}

const STATUS_FILTERS = [
  { value: "", label: "All Statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
];

const STATUS_CONFIG: Record<string, { bg: string; label: string; icon: React.ReactNode }> = {
  scheduled: {
    bg: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
    label: "Scheduled",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  completed: {
    bg: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300",
    label: "Completed",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  skipped: {
    bg: "bg-muted text-muted-foreground",
    label: "Skipped",
    icon: <SkipForward className="h-3.5 w-3.5" />,
  },
};

export function InterviewListPage() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await apiGet<InterviewListItem[]>("/interviews/list", params);
      setInterviews(res.data ?? []);
    } catch {
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-200 dark:border-rose-900 border-t-rose-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            Exit Interviews
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage scheduled exit interviews.
          </p>
        </div>
        <button
          onClick={() => navigate("/interviews/templates")}
          className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-card px-4 py-2 text-sm font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
        >
          <Calendar className="h-4 w-4" />
          Manage Templates
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
        >
          {STATUS_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className="text-sm text-muted-foreground">
          {interviews.length} interview{interviews.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* List */}
      {interviews.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-10 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-sm font-medium text-foreground">No exit interviews yet</h3>
          <p className="mt-2 mx-auto max-w-md text-sm text-muted-foreground">
            Interviews are scheduled from an exit request. Open an exit and use its Interview tab to
            schedule one.
          </p>
          <button
            onClick={() => navigate("/exits")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
          >
            View Exits
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Scheduled</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {interviews.map((iv) => {
                const cfg = STATUS_CONFIG[iv.status] || STATUS_CONFIG.scheduled;
                const name = iv.employee
                  ? `${iv.employee.first_name} ${iv.employee.last_name}`
                  : "—";
                return (
                  <tr key={iv.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      {iv.employee?.designation && (
                        <p className="text-xs text-muted-foreground">{iv.employee.designation}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {iv.scheduled_date ? formatDate(iv.scheduled_date) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {iv.overall_rating != null ? `${iv.overall_rating}/10` : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          cfg.bg,
                        )}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/interviews/${iv.exit_request_id}`)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-300"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
