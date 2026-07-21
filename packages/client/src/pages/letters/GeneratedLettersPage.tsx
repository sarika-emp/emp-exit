import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  FileSignature,
  Download,
  Send,
  Loader2,
  FileText,
  Plus,
  Settings2,
  Search,
  ChevronRight,
} from "lucide-react";
import { apiGet, apiPost } from "@/api/client";
import { api } from "@/api/client";
import toast from "react-hot-toast";
import { cn, formatDate } from "@/lib/utils";

const LETTER_TYPES: Record<string, string> = {
  experience: "Experience Letter",
  relieving: "Relieving Letter",
  service_certificate: "Service Certificate",
  noc: "NOC",
};

// Exit lifecycle status → badge colour + readable label.
const EXIT_STATUS: Record<string, { label: string; color: string }> = {
  initiated: { label: "Initiated", color: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" },
  notice_period: { label: "Notice Period", color: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" },
  clearance_pending: { label: "Clearance Pending", color: "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300" },
  fnf_pending: { label: "FnF Pending", color: "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300" },
  fnf_processed: { label: "FnF Processed", color: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300" },
  completed: { label: "Completed", color: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300" },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground" },
};

function initials(first?: string, last?: string): string {
  return `${(first?.[0] || "").toUpperCase()}${(last?.[0] || "").toUpperCase()}` || "?";
}

interface ExitOption {
  id: string;
  status: string;
  exit_type: string;
  last_working_date: string | null;
  employee?: {
    first_name: string;
    last_name: string;
    emp_code: string | null;
    designation: string | null;
  } | null;
}

export function GeneratedLettersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const exitId = searchParams.get("exitId") || "";
  const [letters, setLetters] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateForm, setGenerateForm] = useState({ template_id: "", letter_type: "experience" });

  // Same in-page picker pattern as the KT page: when no exit is in the URL
  // we fetch the list and let the user pick one instead of greeting them
  // with a "?exitId=UUID in the URL" hint.
  const [exitOptions, setExitOptions] = useState<ExitOption[]>([]);
  const [loadingExits, setLoadingExits] = useState(false);
  const [exitSearch, setExitSearch] = useState("");
  useEffect(() => {
    if (exitId) return;
    let cancelled = false;
    (async () => {
      setLoadingExits(true);
      try {
        const res = await apiGet<any>("/exits", { perPage: 100 });
        if (!cancelled) setExitOptions(res.data?.data ?? []);
      } catch {
        if (!cancelled) setExitOptions([]);
      } finally {
        if (!cancelled) setLoadingExits(false);
      }
    })();
    return () => { cancelled = true; };
  }, [exitId]);

  function selectExit(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("exitId", id);
    setSearchParams(next);
  }
  const [generating, setGenerating] = useState(false);

  async function fetchLetters() {
    if (!exitId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiGet<any[]>(`/letters/exit/${exitId}`);
      if (res.success) setLetters(res.data || []);
    } catch {
      toast.error("Failed to load letters");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTemplates() {
    try {
      const res = await apiGet<any[]>("/letters/templates");
      if (res.success) setTemplates(res.data || []);
    } catch { /* ok */ }
  }

  useEffect(() => {
    fetchLetters();
    fetchTemplates();
  }, [exitId]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!generateForm.template_id) {
      toast.error("Select a template");
      return;
    }
    setGenerating(true);
    try {
      await apiPost(`/letters/exit/${exitId}/generate`, {
        template_id: generateForm.template_id,
        letter_type: generateForm.letter_type,
      });
      toast.success("Letter generated");
      setShowGenerate(false);
      fetchLetters();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to generate letter");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(letterId: string, letterType: string) {
    try {
      const response = await api.get(`/letters/${letterId}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${letterType}_letter.html`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download letter");
    }
  }

  async function handleSend(letterId: string) {
    try {
      await apiPost(`/letters/${letterId}/send`);
      toast.success("Letter sent to employee");
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to send letter");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Generated Letters</h1>
          <p className="mt-1 text-sm text-muted-foreground">View, download, and send generated exit letters.</p>
        </div>
        <div className="flex items-center gap-2">
          {exitId && (
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete("exitId");
                setSearchParams(next);
                setShowGenerate(false);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
            >
              Switch exit
            </button>
          )}
          {/* "Manage templates" — letter templates live at /letters/templates
              but there was no UI link to it from anywhere, so users couldn't
              find the create-template flow. */}
          <Link
            to="/letters/templates"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
          >
            <Settings2 className="h-4 w-4" />
            Manage Templates
          </Link>
          {exitId && (
            <button
              onClick={() => setShowGenerate(!showGenerate)}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              <Plus className="h-4 w-4" />
              Generate Letter
            </button>
          )}
        </div>
      </div>

      {/* In-page exit picker — shown only when no exit is selected via the URL.
          Clicking a card sets ?exitId=... and the rest of the page renders
          letters for that exit. Cancelled exits are hidden. */}
      {!exitId && (() => {
        const visible = exitOptions
          .filter((e) => e.status !== "cancelled")
          .filter((e) => {
            if (!exitSearch.trim()) return true;
            const q = exitSearch.toLowerCase();
            const name = `${e.employee?.first_name ?? ""} ${e.employee?.last_name ?? ""}`.toLowerCase();
            return (
              name.includes(q) ||
              (e.employee?.emp_code ?? "").toLowerCase().includes(q) ||
              (e.employee?.designation ?? "").toLowerCase().includes(q)
            );
          });

        return (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Select an exit</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Pick the exit you want to view or generate letters for.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={exitSearch}
                  onChange={(e) => setExitSearch(e.target.value)}
                  placeholder="Search by name, code, designation…"
                  className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            {loadingExits ? (
              <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card">
                <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-10 text-center">
                <FileSignature className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {exitSearch
                    ? "No exits match your search."
                    : "No active exits found. Initiate an exit first to generate its letters."}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Emp Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Exit Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Working Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visible.map((exit) => {
                      const name = exit.employee
                        ? `${exit.employee.first_name} ${exit.employee.last_name}`
                        : "Unknown employee";
                      const st = EXIT_STATUS[exit.status] || { label: exit.status, color: "bg-muted text-muted-foreground" };
                      return (
                        <tr
                          key={exit.id}
                          onClick={() => selectExit(exit.id)}
                          className="cursor-pointer transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40 text-xs font-semibold text-rose-700 dark:text-rose-300">
                                {initials(exit.employee?.first_name, exit.employee?.last_name)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">{name}</p>
                                {exit.employee?.designation && (
                                  <p className="truncate text-xs text-muted-foreground">{exit.employee.designation}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                            {exit.employee?.emp_code || "—"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-muted-foreground">
                            {exit.exit_type.replace(/_/g, " ")}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                            {exit.last_working_date ? formatDate(exit.last_working_date) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", st.color)}>
                              {st.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 dark:text-rose-400">
                              Select
                              <ChevronRight className="h-4 w-4" />
                            </span>
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
      })()}

      {exitId && showGenerate && (
        <form onSubmit={handleGenerate} className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Generate Letter</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Template</label>
              <select
                value={generateForm.template_id}
                onChange={(e) => {
                  const tpl = templates.find((t) => t.id === e.target.value);
                  setGenerateForm({
                    template_id: e.target.value,
                    letter_type: tpl?.letter_type || "experience",
                  });
                }}
                className="mt-1 block w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="">Select a template...</option>
                {templates.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.letter_type?.replace("_", " ")})
                  </option>
                ))}
              </select>
              {templates.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  No templates configured.{" "}
                  <Link to="/letters/templates" className="font-medium text-rose-600 dark:text-rose-400 hover:underline">
                    Create a template
                  </Link>{" "}
                  to start generating letters.
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={generating}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate"}
            </button>
            <button
              type="button"
              onClick={() => setShowGenerate(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Letters list — only relevant once an exit is selected. */}
      {exitId && (loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600 dark:text-rose-400" />
        </div>
      ) : letters.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          <FileSignature className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          No letters generated yet.
        </div>
      ) : (
        <div className="space-y-3">
          {letters.map((letter: any) => (
            <div
              key={letter.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-brand-400"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/40">
                  <FileText className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {LETTER_TYPES[letter.letter_type] || letter.letter_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Generated {letter.created_at ? formatDate(letter.created_at) : ""}
                    {letter.issued_date && ` | Issued ${formatDate(letter.issued_date)}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(letter.id, letter.letter_type)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button
                  onClick={() => handleSend(letter.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
