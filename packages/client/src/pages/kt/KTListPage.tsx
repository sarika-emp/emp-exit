import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  FileText,
  User,
  Search,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/api/client";
import toast from "react-hot-toast";
import { cn, formatDate } from "@/lib/utils";

const KT_STATUS: Record<string, { label: string; color: string }> = {
  not_started: { label: "Not Started", color: "bg-gray-100 text-gray-600" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
};

// Exit lifecycle status → badge colour + readable label.
const EXIT_STATUS: Record<string, { label: string; color: string }> = {
  initiated: { label: "Initiated", color: "bg-blue-100 text-blue-700" },
  notice_period: { label: "Notice Period", color: "bg-amber-100 text-amber-700" },
  clearance_pending: { label: "Clearance Pending", color: "bg-orange-100 text-orange-700" },
  fnf_pending: { label: "FnF Pending", color: "bg-purple-100 text-purple-700" },
  fnf_processed: { label: "FnF Processed", color: "bg-indigo-100 text-indigo-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500" },
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

export function KTListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const exitId = searchParams.get("exitId") || "";

  // When no exit is selected via the URL, fetch active exits so the user
  // can pick one. Without this the page just shows the "?exitId=UUID"
  // hint and there's no in-UI way to proceed.
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
  const [kt, setKt] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({ title: "", description: "", document_url: "" });
  const [submitting, setSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit-plan form (successor + due date)
  const [editingPlan, setEditingPlan] = useState(false);
  const [planForm, setPlanForm] = useState({ assignee_id: "", due_date: "" });
  const [savingPlan, setSavingPlan] = useState(false);
  const [employees, setEmployees] = useState<{ id: number; first_name: string; last_name: string; emp_code: string | null }[]>([]);

  async function fetchKT() {
    if (!exitId) return;
    setLoading(true);
    try {
      const res = await apiGet<any>(`/kt/exit/${exitId}`);
      if (res.success) setKt(res.data);
    } catch {
      // KT may not exist yet
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchKT();
  }, [exitId]);

  // Load the org's active employees once an exit is selected, so the successor
  // name (not a raw ID) shows on the plan and the edit dropdown is ready.
  useEffect(() => {
    if (!exitId || employees.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<any>("/users", { limit: 200 });
        const list = res.data?.data ?? res.data ?? [];
        if (!cancelled) setEmployees(Array.isArray(list) ? list : []);
      } catch {
        /* successor will fall back to ID */
      }
    })();
    return () => { cancelled = true; };
  }, [exitId]);

  async function handleCreateKT() {
    if (!exitId) return;
    setCreating(true);
    try {
      await apiPost(`/kt/exit/${exitId}`, {});
      toast.success("KT plan created");
      fetchKT();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to create KT plan");
    } finally {
      setCreating(false);
    }
  }

  // Mark the entire KT plan as complete. Backend supports this directly
  // (PUT /kt/exit/:exitId with { status: "completed" }) and also auto-
  // completes when the last item flips to completed.
  const [completingPlan, setCompletingPlan] = useState(false);
  async function handleCompletePlan() {
    if (!exitId) return;
    setCompletingPlan(true);
    try {
      await apiPut(`/kt/exit/${exitId}`, { status: "completed" });
      toast.success("KT plan marked complete");
      fetchKT();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to complete KT plan");
    } finally {
      setCompletingPlan(false);
    }
  }

  async function openEditPlan() {
    setPlanForm({
      assignee_id: kt?.assignee_id ? String(kt.assignee_id) : "",
      due_date: kt?.due_date ? String(kt.due_date).slice(0, 10) : "",
    });
    setEditingPlan(true);
    // Load active employees for the successor dropdown (once).
    if (employees.length === 0) {
      try {
        const res = await apiGet<any>("/users", { limit: 200 });
        const list = res.data?.data ?? res.data ?? [];
        setEmployees(Array.isArray(list) ? list : []);
      } catch {
        setEmployees([]);
      }
    }
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!exitId) return;
    setSavingPlan(true);
    try {
      await apiPut(`/kt/exit/${exitId}`, {
        assignee_id: planForm.assignee_id ? Number(planForm.assignee_id) : null,
        due_date: planForm.due_date || null,
      });
      toast.success("KT plan updated");
      setEditingPlan(false);
      fetchKT();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to update KT plan");
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost(`/kt/exit/${exitId}/items`, {
        title: itemForm.title,
        description: itemForm.description || undefined,
        document_url: itemForm.document_url || undefined,
      });
      toast.success("KT item added");
      setShowItemForm(false);
      setItemForm({ title: "", description: "", document_url: "" });
      fetchKT();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to add item");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleItemStatus(itemId: string, currentStatus: string) {
    const newStatus = currentStatus === "completed" ? "not_started" : "completed";
    try {
      await apiPut(`/kt/items/${itemId}`, { status: newStatus });
      toast.success(newStatus === "completed" ? "Item completed" : "Item reopened");
      fetchKT();
    } catch (err: any) {
      toast.error("Failed to update item");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Transfer</h1>
          <p className="mt-1 text-sm text-gray-500">Manage knowledge transfer plans and items.</p>
        </div>
        <div className="flex items-center gap-2">
          {exitId && (
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete("exitId");
                setSearchParams(next);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Switch exit
            </button>
          )}
          {kt && (
            <button
              onClick={() => setShowItemForm(!showItemForm)}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* Exit picker — shown only when no exit is selected via the URL.
          Clicking a card sets ?exitId=... and the rest of the page renders
          the KT plan / items for that exit. Cancelled exits are hidden since
          KT can't meaningfully run on them. */}
      {!exitId && (() => {
        // Hide cancelled exits, then apply the search filter.
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
                <h2 className="text-base font-semibold text-gray-900">Select an exit</h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  Pick the exit you want to manage knowledge transfer for.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={exitSearch}
                  onChange={(e) => setExitSearch(e.target.value)}
                  placeholder="Search by name, code, designation…"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            {loadingExits ? (
              <div className="flex h-40 items-center justify-center rounded-xl border border-gray-200 bg-white">
                <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  {exitSearch
                    ? "No exits match your search."
                    : "No active exits found. Initiate an exit first to manage its KT plan."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((exit) => {
                  const name = exit.employee
                    ? `${exit.employee.first_name} ${exit.employee.last_name}`
                    : "Unknown employee";
                  const st = EXIT_STATUS[exit.status] || { label: exit.status, color: "bg-gray-100 text-gray-600" };
                  return (
                    <button
                      key={exit.id}
                      type="button"
                      onClick={() => selectExit(exit.id)}
                      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-rose-200 hover:shadow-md"
                    >
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-semibold text-rose-700">
                        {initials(exit.employee?.first_name, exit.employee?.last_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                        {exit.employee?.designation && (
                          <p className="truncate text-xs text-gray-500">{exit.employee.designation}</p>
                        )}
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", st.color)}>
                            {st.label}
                          </span>
                          {exit.last_working_date && (
                            <span className="text-[11px] text-gray-400">
                              LWD {formatDate(exit.last_working_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-rose-500" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
        </div>
      ) : !kt && exitId ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No KT plan exists for this exit yet.</p>
          <button
            onClick={handleCreateKT}
            disabled={creating}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create KT Plan"}
          </button>
        </div>
      ) : kt ? (
        <>
          {/* KT Summary */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">KT Plan</h3>
              <div className="flex items-center gap-3">
                {/* "Mark plan complete" — only enabled when at least one
                    item exists AND every item is completed. The button
                    disappears once the plan is already completed. */}
                {kt.status !== "completed" && Array.isArray(kt.items) && kt.items.length > 0 && (() => {
                  const allDone = kt.items.every((it: any) => it.status === "completed");
                  return (
                    <button
                      type="button"
                      onClick={handleCompletePlan}
                      disabled={!allDone || completingPlan}
                      title={allDone ? "Mark plan complete" : "Complete every item first"}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {completingPlan ? "Completing..." : "Mark plan complete"}
                    </button>
                  );
                })()}
                {kt.status !== "completed" && !editingPlan && (
                  <button
                    type="button"
                    onClick={openEditPlan}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
                <span className={cn("rounded-full px-3 py-1 text-xs font-medium", KT_STATUS[kt.status]?.color || KT_STATUS.not_started.color)}>
                  {KT_STATUS[kt.status]?.label || kt.status}
                </span>
              </div>
            </div>

            {editingPlan ? (
              <form onSubmit={handleSavePlan} className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Successor</label>
                  <select
                    value={planForm.assignee_id}
                    onChange={(e) => setPlanForm((f) => ({ ...f, assignee_id: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="">Not assigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}{emp.emp_code ? ` (${emp.emp_code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Due date</label>
                  <input
                    type="date"
                    value={planForm.due_date}
                    onChange={(e) => setPlanForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div className="flex gap-3 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={savingPlan}
                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {savingPlan && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPlan(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="h-4 w-4" />
                  <span>
                    Successor:{" "}
                    {(() => {
                      const s = employees.find((e) => e.id === kt.assignee_id);
                      if (s) return `${s.first_name} ${s.last_name}`;
                      return kt.assignee_id ? `ID ${kt.assignee_id}` : "Not assigned";
                    })()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Due: {kt.due_date ? formatDate(kt.due_date) : "Not set"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Add item form */}
          {showItemForm && (
            <form onSubmit={handleAddItem} className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Add KT Item</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="Handover API documentation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="Details about this KT item..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Document URL</label>
                <input
                  type="url"
                  value={itemForm.document_url}
                  onChange={(e) => setItemForm({ ...itemForm, document_url: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  placeholder="https://docs.google.com/..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add Item"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowItemForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Items list */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">
              Items ({kt.items?.length || 0})
            </h3>
            {!kt.items || kt.items.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500">
                No KT items yet. Add items to track knowledge transfer progress.
              </div>
            ) : (
              <div className="space-y-2">
                {kt.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50"
                  >
                    <button
                      type="button"
                      onClick={() => toggleItemStatus(item.id, item.status)}
                      title={item.status === "completed" ? "Reopen item" : "Mark item complete"}
                      aria-label={item.status === "completed" ? "Reopen item" : "Mark item complete"}
                      className="mt-0.5 flex-shrink-0 cursor-pointer rounded-full transition-colors hover:bg-rose-50 p-0.5"
                    >
                      {item.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400 hover:text-rose-500" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", item.status === "completed" ? "text-gray-400 line-through" : "text-gray-900")}>
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="mt-1 text-xs text-gray-500">{item.description}</p>
                      )}
                      {item.document_url && (
                        <a
                          href={item.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
                        >
                          <FileText className="h-3 w-3" />
                          Document
                        </a>
                      )}
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", KT_STATUS[item.status]?.color || "bg-gray-100 text-gray-600")}>
                      {KT_STATUS[item.status]?.label || item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
