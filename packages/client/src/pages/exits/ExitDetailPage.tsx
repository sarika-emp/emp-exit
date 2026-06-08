import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Loader2,
  UserMinus,
  ClipboardCheck,
  Shield,
  CheckCircle,
  XCircle,
  MessageSquare,
  DollarSign,
  Calculator,
  Package,
  BookOpen,
  FileSignature,
  ArrowLeft,
  Clock,
  Pencil,
  Eye,
} from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import toast from "react-hot-toast";
import { apiGet, apiPost, apiPatch, apiPut, api } from "@/api/client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn, formatDate } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  initiated: "bg-blue-100 text-blue-700 border-blue-200",
  notice_period: "bg-amber-100 text-amber-700 border-amber-200",
  clearance_pending: "bg-orange-100 text-orange-700 border-orange-200",
  fnf_pending: "bg-purple-100 text-purple-700 border-purple-200",
  fnf_processed: "bg-indigo-100 text-indigo-700 border-indigo-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
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

const TYPE_LABELS: Record<string, string> = {
  resignation: "Resignation",
  termination: "Termination",
  retirement: "Retirement",
  end_of_contract: "End of Contract",
  mutual_separation: "Mutual Separation",
};

// Reason categories accepted by updateExitSchema (shared validators).
const REASON_OPTIONS: { value: string; label: string }[] = [
  { value: "better_opportunity", label: "Better Opportunity" },
  { value: "compensation", label: "Compensation" },
  { value: "relocation", label: "Relocation" },
  { value: "personal", label: "Personal" },
  { value: "health", label: "Health" },
  { value: "higher_education", label: "Higher Education" },
  { value: "retirement", label: "Retirement" },
  { value: "performance", label: "Performance" },
  { value: "misconduct", label: "Misconduct" },
  { value: "redundancy", label: "Redundancy" },
  { value: "other", label: "Other" },
];

const CHECKLIST_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  waived: "bg-amber-100 text-amber-700",
  na: "bg-gray-50 text-gray-400",
};

const CLEARANCE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  waived: "bg-amber-100 text-amber-700",
};

type Tab = "overview" | "checklist" | "clearance" | "interview" | "fnf" | "buyout" | "assets" | "kt" | "letters";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: UserMinus },
  { key: "checklist", label: "Checklist", icon: ClipboardCheck },
  { key: "clearance", label: "Clearance", icon: Shield },
  { key: "interview", label: "Interview", icon: MessageSquare },
  { key: "fnf", label: "FnF", icon: DollarSign },
  { key: "buyout", label: "Buyout", icon: Calculator },
  { key: "assets", label: "Assets", icon: Package },
  { key: "kt", label: "KT", icon: BookOpen },
  { key: "letters", label: "Letters", icon: FileSignature },
];

export function ExitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [exit, setExit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [checklist, setChecklist] = useState<any>(null);
  const [clearance, setClearance] = useState<any>(null);
  const [buyout, setBuyout] = useState<any>(null);
  const [kt, setKt] = useState<any>(null);
  const [letters, setLetters] = useState<any[] | null>(null);
  const [letterTemplates, setLetterTemplates] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editError, setEditError] = useState<string | null>(null);
  // Generic in-app confirmation dialog (replaces native confirm()).
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    tone: "danger" | "primary";
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    loadExit();
  }, [id]);

  useEffect(() => {
    if (!id || !exit) return;
    if (activeTab === "checklist") loadChecklist();
    if (activeTab === "clearance") loadClearance();
    if (activeTab === "buyout") loadBuyout();
    if (activeTab === "kt") loadKt();
    if (activeTab === "letters") loadLetters();
  }, [activeTab, id, exit]);

  async function loadExit() {
    setLoading(true);
    try {
      const res = await apiGet<any>(`/exits/${id}`);
      setExit(res.data);
    } catch {
      setExit(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadChecklist() {
    try {
      const res = await apiGet<any>(`/checklists/exit/${id}`);
      setChecklist(res.data);
    } catch {
      setChecklist(null);
    }
  }

  async function loadClearance() {
    try {
      const res = await apiGet<any>(`/clearance/exit/${id}`);
      setClearance(res.data);
    } catch {
      setClearance(null);
    }
  }

  async function loadBuyout() {
    try {
      const res = await apiGet<any>(`/buyout/exit/${id}`);
      setBuyout(res.data);
    } catch {
      setBuyout(null);
    }
  }

  function openEdit() {
    setEditForm({
      reason_category: exit.reason_category ?? "",
      reason_detail: exit.reason_detail ?? "",
      notice_start_date: exit.notice_start_date ? String(exit.notice_start_date).slice(0, 10) : "",
      last_working_date: exit.last_working_date ? String(exit.last_working_date).slice(0, 10) : "",
      actual_exit_date: exit.actual_exit_date ? String(exit.actual_exit_date).slice(0, 10) : "",
      notice_period_days: exit.notice_period_days ?? 30,
      notice_period_waived: !!exit.notice_period_waived,
    });
    setEditError(null);
    setShowEdit(true);
  }

  async function handleSaveEdit() {
    setActionLoading(true);
    setEditError(null);
    // Send only fields with a value; the API schema accepts all of these optionally.
    const payload: Record<string, any> = {
      reason_category: editForm.reason_category || undefined,
      reason_detail: editForm.reason_detail || undefined,
      notice_start_date: editForm.notice_start_date || undefined,
      last_working_date: editForm.last_working_date || undefined,
      actual_exit_date: editForm.actual_exit_date || undefined,
      notice_period_days:
        editForm.notice_period_days === "" || editForm.notice_period_days == null
          ? undefined
          : Number(editForm.notice_period_days),
      notice_period_waived: !!editForm.notice_period_waived,
    };
    try {
      await apiPut(`/exits/${id}`, payload);
      setShowEdit(false);
      await loadExit();
      toast.success("Exit details updated successfully");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to update exit details";
      setEditError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  }

  function handleCancel() {
    setConfirmState({
      open: true,
      title: "Cancel exit request?",
      message: "This will mark the exit request as cancelled. This action cannot be undone.",
      confirmLabel: "Cancel Exit",
      tone: "danger",
      onConfirm: doCancel,
    });
  }

  async function doCancel() {
    setActionLoading(true);
    try {
      await apiPost(`/exits/${id}/cancel`);
      await loadExit();
      setConfirmState(null);
      toast.success("Exit request cancelled");
    } catch (err: any) {
      setConfirmState(null);
      toast.error(
        err?.response?.data?.error?.message || err?.message || "Failed to cancel exit request",
      );
    } finally {
      setActionLoading(false);
    }
  }

  function handleComplete() {
    setConfirmState({
      open: true,
      title: "Mark exit as completed?",
      message: "This will finalize the exit and deactivate the employee's account. This action cannot be undone.",
      confirmLabel: "Complete Exit",
      tone: "primary",
      onConfirm: doComplete,
    });
  }

  async function doComplete() {
    setActionLoading(true);
    try {
      await apiPost(`/exits/${id}/complete`);
      await loadExit();
      setConfirmState(null);
      toast.success("Exit marked as completed");
    } catch (err: any) {
      setConfirmState(null);
      toast.error(
        err?.response?.data?.error?.message || err?.message || "Failed to complete exit",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleInitiateClearance() {
    setActionLoading(true);
    try {
      await apiPost(`/clearance/exit/${id}`);
      await loadClearance();
    } catch {
      // handled
    } finally {
      setActionLoading(false);
    }
  }

  async function handleChecklistItemUpdate(itemId: string, status: string) {
    try {
      await apiPatch(`/checklists/items/${itemId}`, { status });
      await loadChecklist();
    } catch {
      // handled
    }
  }

  async function loadKt() {
    try {
      const res = await apiGet<any>(`/kt/exit/${id}`);
      setKt(res.data);
    } catch {
      setKt(null);
    }
  }

  async function handleKtItemUpdate(itemId: string, status: string) {
    try {
      await apiPut(`/kt/items/${itemId}`, { status });
      await loadKt();
      toast.success("Knowledge transfer item updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to update KT item");
    }
  }

  async function loadLetters() {
    try {
      const res = await apiGet<any[]>(`/letters/exit/${id}`);
      setLetters(res.data ?? []);
    } catch {
      setLetters([]);
    }
    try {
      const tplRes = await apiGet<any[]>(`/letters/templates`);
      setLetterTemplates(tplRes.data ?? []);
    } catch {
      setLetterTemplates([]);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (!exit) {
    return (
      <div className="space-y-4">
        <Link to="/exits" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to exits
        </Link>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">Exit request not found.</p>
        </div>
      </div>
    );
  }

  const isTerminal = exit.status === "completed" || exit.status === "cancelled";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/exits" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to exits
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {exit.employee
              ? `${exit.employee.first_name} ${exit.employee.last_name}`
              : `Exit #${exit.id.slice(0, 8)}`}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>{TYPE_LABELS[exit.exit_type] || exit.exit_type}</span>
            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[exit.status])}>
              {STATUS_LABELS[exit.status] || exit.status}
            </span>
            {exit.employee?.designation && <span>{exit.employee.designation}</span>}
          </div>
        </div>
        {!isTerminal && (
          <div className="flex items-center gap-2">
            <button
              onClick={openEdit}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Cancel Exit
            </button>
            <button
              onClick={handleComplete}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              Complete Exit
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-rose-500 text-rose-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {activeTab === "overview" && <OverviewTab exit={exit} />}
        {activeTab === "checklist" && (
          <ChecklistTab
            checklist={checklist}
            exitId={id!}
            onUpdateItem={handleChecklistItemUpdate}
          />
        )}
        {activeTab === "clearance" && (
          <ClearanceTab
            clearance={clearance}
            onInitiate={handleInitiateClearance}
            actionLoading={actionLoading}
          />
        )}
        {activeTab === "interview" && <PlaceholderTab name="Exit Interview" />}
        {activeTab === "fnf" && <PlaceholderTab name="Full & Final Settlement" />}
        {activeTab === "buyout" && <BuyoutTab buyout={buyout} exitId={id!} onReload={loadBuyout} />}
        {activeTab === "assets" && <PlaceholderTab name="Asset Returns" />}
        {activeTab === "kt" && <KtTab kt={kt} onUpdateItem={handleKtItemUpdate} />}
        {activeTab === "letters" && (
          <LettersTab
            letters={letters}
            templates={letterTemplates}
            exitId={id!}
            exitStatus={exit.status}
            onReload={loadLetters}
          />
        )}
      </div>

      {/* Edit Exit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Exit Details</h3>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Reason Category</label>
                <select
                  value={editForm.reason_category}
                  onChange={(e) => setEditForm({ ...editForm, reason_category: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
                >
                  {REASON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Reason Detail</label>
                <textarea
                  value={editForm.reason_detail}
                  onChange={(e) => setEditForm({ ...editForm, reason_detail: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Notice Start</label>
                  <input type="date" value={editForm.notice_start_date}
                    onChange={(e) => setEditForm({ ...editForm, notice_start_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Last Working Date</label>
                  <input type="date" value={editForm.last_working_date}
                    onChange={(e) => setEditForm({ ...editForm, last_working_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Actual Exit Date</label>
                  <input type="date" value={editForm.actual_exit_date}
                    onChange={(e) => setEditForm({ ...editForm, actual_exit_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Notice Period (days)</label>
                  <input type="number" min={0} value={editForm.notice_period_days}
                    onChange={(e) => setEditForm({ ...editForm, notice_period_days: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={!!editForm.notice_period_waived}
                  onChange={(e) => setEditForm({ ...editForm, notice_period_waived: e.target.checked })} />
                Notice period waived
              </label>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button onClick={() => setShowEdit(false)} disabled={actionLoading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50">
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app confirmation dialog (replaces native confirm()) */}
      <ConfirmDialog
        open={!!confirmState?.open}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        confirmLabel={confirmState?.confirmLabel ?? "Confirm"}
        tone={confirmState?.tone ?? "primary"}
        loading={actionLoading}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OverviewTab({ exit }: { exit: any }) {
  const fields = [
    { label: "Exit Type", value: TYPE_LABELS[exit.exit_type] || exit.exit_type },
    { label: "Status", value: STATUS_LABELS[exit.status] || exit.status },
    { label: "Reason Category", value: exit.reason_category?.replace(/_/g, " ") },
    { label: "Reason Detail", value: exit.reason_detail || "--" },
    { label: "Resignation Date", value: exit.resignation_date ? formatDate(exit.resignation_date) : "--" },
    { label: "Notice Start", value: exit.notice_start_date ? formatDate(exit.notice_start_date) : "--" },
    { label: "Last Working Date", value: exit.last_working_date ? formatDate(exit.last_working_date) : "--" },
    { label: "Actual Exit Date", value: exit.actual_exit_date ? formatDate(exit.actual_exit_date) : "--" },
    { label: "Notice Period", value: `${exit.notice_period_days} days${exit.notice_period_waived ? " (waived)" : ""}` },
    { label: "Initiated", value: formatDate(exit.created_at) },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {exit.checklist_summary && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <ClipboardCheck className="h-4 w-4 text-rose-500" />
              Checklist
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">{exit.checklist_summary.progress}%</p>
            <p className="text-xs text-gray-500">
              {exit.checklist_summary.completed} / {exit.checklist_summary.total} items
            </p>
          </div>
        )}
        {exit.clearance_summary && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Shield className="h-4 w-4 text-rose-500" />
              Clearance
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">{exit.clearance_summary.progress}%</p>
            <p className="text-xs text-gray-500">
              {exit.clearance_summary.approved} / {exit.clearance_summary.total} departments
            </p>
          </div>
        )}
        {exit.fnf_summary && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <DollarSign className="h-4 w-4 text-rose-500" />
              FnF
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900 capitalize">{exit.fnf_summary.status}</p>
            <p className="text-xs text-gray-500">
              Total payable: {exit.fnf_summary.total_payable}
            </p>
          </div>
        )}
      </div>

      {/* Detail Fields */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label}>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-500">{f.label}</dt>
            <dd className="mt-0.5 text-sm text-gray-900 capitalize">{f.value}</dd>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChecklistTab({
  checklist,
  exitId,
  onUpdateItem,
}: {
  checklist: any;
  exitId: string;
  onUpdateItem: (itemId: string, status: string) => void;
}) {
  if (!checklist || !checklist.items || checklist.items.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardCheck className="mx-auto h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 mb-4">No checklist generated yet.</p>
        <p className="text-xs text-gray-400">
          Go to Checklists to generate a checklist from a template.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          {checklist.completed} / {checklist.total} completed ({checklist.progress}%)
        </h3>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-rose-500 h-2 rounded-full transition-all"
          style={{ width: `${checklist.progress}%` }}
        />
      </div>
      <div className="divide-y divide-gray-100">
        {checklist.items.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between py-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{item.title}</p>
              {item.description && (
                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
              )}
              {item.remarks && (
                <p className="text-xs text-gray-400 mt-0.5 italic">{item.remarks}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                  CHECKLIST_STATUS_COLORS[item.status] || "bg-gray-100 text-gray-600",
                )}
              >
                {item.status.replace(/_/g, " ")}
              </span>
              {item.status === "pending" && (
                <button
                  onClick={() => onUpdateItem(item.id, "completed")}
                  className="rounded-md bg-green-50 p-1 text-green-600 hover:bg-green-100"
                  title="Mark complete"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const KT_STATUS_COLORS: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

function KtTab({
  kt,
  onUpdateItem,
}: {
  kt: any;
  onUpdateItem: (itemId: string, status: string) => void;
}) {
  if (!kt) {
    return (
      <div className="py-8 text-center">
        <BookOpen className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="mb-1 text-sm text-gray-500">No knowledge transfer plan yet.</p>
        <p className="text-xs text-gray-400">
          A KT plan is created when handover tasks are assigned for this exit.
        </p>
      </div>
    );
  }

  const items: any[] = Array.isArray(kt.items) ? kt.items : [];
  const completed = items.filter((i) => i.status === "completed").length;
  const total = items.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Plan summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
              KT_STATUS_COLORS[kt.status] || "bg-gray-100 text-gray-600",
            )}
          >
            {String(kt.status || "not_started").replace(/_/g, " ")}
          </span>
          {kt.assignee && (
            <span>
              Assignee: <span className="font-medium text-gray-800">{kt.assignee.first_name} {kt.assignee.last_name}</span>
            </span>
          )}
          {kt.due_date && <span>Due: {formatDate(kt.due_date)}</span>}
        </div>
        <span className="text-sm font-medium text-gray-700">
          {completed} / {total} completed ({progress}%)
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div className="h-2 rounded-full bg-rose-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      {kt.notes && (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">{kt.notes}</p>
      )}

      {/* Items */}
      {total === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">No knowledge transfer items added yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-xs text-gray-500">{item.description}</p>
                )}
                {item.document_url && (
                  <a
                    href={item.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-block text-xs text-rose-600 hover:underline"
                  >
                    View document
                  </a>
                )}
              </div>
              <div className="ml-4 flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    KT_STATUS_COLORS[item.status] || "bg-gray-100 text-gray-600",
                  )}
                >
                  {String(item.status).replace(/_/g, " ")}
                </span>
                {item.status === "not_started" && (
                  <button
                    onClick={() => onUpdateItem(item.id, "in_progress")}
                    className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                  >
                    Start
                  </button>
                )}
                {item.status !== "completed" && (
                  <button
                    onClick={() => onUpdateItem(item.id, "completed")}
                    className="rounded-md bg-green-50 p-1 text-green-600 hover:bg-green-100"
                    title="Mark complete"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClearanceTab({
  clearance,
  onInitiate,
  actionLoading,
}: {
  clearance: any;
  onInitiate: () => void;
  actionLoading: boolean;
}) {
  if (!clearance || !clearance.records || clearance.records.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="mx-auto h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 mb-4">No clearance records yet.</p>
        <button
          onClick={onInitiate}
          disabled={actionLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
        >
          {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          Initiate Clearance
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          {clearance.approved} / {clearance.total} approved ({clearance.progress}%)
        </h3>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-rose-500 h-2 rounded-full transition-all"
          style={{ width: `${clearance.progress}%` }}
        />
      </div>
      <div className="divide-y divide-gray-100">
        {clearance.records.map((record: any) => (
          <div key={record.id} className="flex items-center justify-between py-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {record.department?.name || "Unknown Department"}
              </p>
              {record.remarks && (
                <p className="text-xs text-gray-500 mt-0.5">{record.remarks}</p>
              )}
              {record.approved_at && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Approved: {formatDate(record.approved_at)}
                </p>
              )}
            </div>
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                CLEARANCE_STATUS_COLORS[record.status] || "bg-gray-100 text-gray-600",
              )}
            >
              {record.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatINR(amountPaise: number): string {
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupees);
}

const LETTER_TYPES: Record<string, string> = {
  experience: "Experience Letter",
  relieving: "Relieving Letter",
  service_certificate: "Service Certificate",
  noc: "NOC",
};

function LettersTab({
  letters,
  templates,
  exitId,
  exitStatus,
  onReload,
}: {
  letters: any[] | null;
  templates: any[];
  exitId: string;
  exitStatus: string;
  onReload: () => void;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingSendId, setPendingSendId] = useState<string | null>(null);

  // Letters may only be generated once the exit is completed (mirrors the
  // backend guard in letter.service.generateLetter).
  const canGenerate = exitStatus === "completed";

  async function handleGenerate() {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;
    setGenerating(true);
    try {
      // The generate endpoint requires template_id at runtime, and a valid
      // letter_type to pass validation (its value is ignored — the type comes
      // from the template). Send the template's own letter_type.
      await apiPost(`/letters/exit/${exitId}/generate`, {
        template_id: tpl.id,
        letter_type: tpl.letter_type,
      });
      toast.success("Letter generated");
      setSelectedTemplateId("");
      onReload();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to generate letter");
    } finally {
      setGenerating(false);
    }
  }

  // The download endpoint returns raw HTML as an attachment (not JSON/URL), so
  // fetch it as a blob and trigger a browser download.
  async function handleDownload(letterId: string, letterType: string) {
    setBusyId(letterId);
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
    } finally {
      setBusyId(null);
    }
  }

  // View opens the rendered letter HTML inline in a new tab (no file save).
  async function handleView(letterId: string) {
    setBusyId(letterId);
    try {
      const response = await api.get(`/letters/${letterId}/download`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "text/html" });
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) {
        toast.error("Pop-up blocked — allow pop-ups to view the letter.");
      }
      // Revoke after a delay so the new tab has time to load the document.
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error("Failed to open letter");
    } finally {
      setBusyId(null);
    }
  }

  async function doSend() {
    const letterId = pendingSendId;
    if (!letterId) return;
    setBusyId(letterId);
    try {
      const res = await apiPost<{ sent: boolean; to: string }>(`/letters/${letterId}/send`);
      setPendingSendId(null);
      toast.success(`Letter sent to ${res.data?.to ?? "employee"}`);
    } catch (err: any) {
      setPendingSendId(null);
      toast.error(err?.response?.data?.error?.message || "Failed to send letter");
    } finally {
      setBusyId(null);
    }
  }

  const isLoading = letters === null;
  const list = letters ?? [];

  return (
    <div className="space-y-5">
      {/* Generate control */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        {!canGenerate ? (
          <p className="text-sm text-gray-500">
            Letters can be generated once the exit is <b>completed</b> — finish clearance and the
            full &amp; final settlement, then mark the exit complete.
          </p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-gray-500">
            No letter templates available. Create one in Letter Templates first.
          </p>
        ) : (
          <>
            <div className="flex-1 min-w-[220px]">
              <label className="mb-1 block text-xs font-medium text-gray-600">Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
              >
                <option value="" disabled>Select a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({LETTER_TYPES[t.letter_type] || t.letter_type})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!selectedTemplateId || generating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {generating && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate Letter
            </button>
          </>
        )}
      </div>

      {/* Generated letters list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
        </div>
      ) : list.length === 0 ? (
        // Only show the "no letters yet" empty state when generation is actually
        // possible. When the exit isn't completed, the notice above already
        // explains why — showing both would be redundant/contradictory.
        canGenerate ? (
          <div className="py-10 text-center">
            <FileSignature className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No letters generated yet.</p>
            <p className="text-xs text-gray-400">Use the control above to generate one from a template.</p>
          </div>
        ) : null
      ) : (
        <div className="divide-y divide-gray-100">
          {list.map((l) => (
            <div key={l.id} className="flex items-center justify-between py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {LETTER_TYPES[l.letter_type] || l.letter_type}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Issued: {l.issued_date ? formatDate(l.issued_date) : "—"}
                </p>
              </div>
              <div className="ml-4 flex items-center gap-2">
                <button
                  onClick={() => handleView(l.id)}
                  disabled={busyId === l.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </button>
                <button
                  onClick={() => handleDownload(l.id, l.letter_type)}
                  disabled={busyId === l.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {busyId === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Download
                </button>
                <button
                  onClick={() => setPendingSendId(l.id)}
                  disabled={busyId === l.id}
                  className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* In-app confirm for the (irreversible) email send */}
      <ConfirmDialog
        open={pendingSendId !== null}
        title="Send letter by email?"
        message="This will email the generated letter to the employee. This action cannot be undone."
        confirmLabel="Send Letter"
        tone="primary"
        loading={busyId !== null && busyId === pendingSendId}
        onConfirm={doSend}
        onCancel={() => setPendingSendId(null)}
      />
    </div>
  );
}

const BUYOUT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function BuyoutTab({
  buyout,
  exitId,
  onReload,
}: {
  buyout: any;
  exitId: string;
  onReload: () => void;
}) {
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  async function handleApprove() {
    if (!buyout) return;
    if (!confirm("Approve this buyout? The employee's last working date will be updated.")) return;
    setActionLoading(true);
    try {
      await apiPost(`/buyout/${buyout.id}/approve`);
      onReload();
    } catch {
      // handled
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!buyout || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await apiPost(`/buyout/${buyout.id}/reject`, { reason: rejectReason });
      setShowReject(false);
      setRejectReason("");
      onReload();
    } catch {
      // handled
    } finally {
      setActionLoading(false);
    }
  }

  if (!buyout) {
    return (
      <div className="text-center py-8">
        <Calculator className="mx-auto h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500 mb-4">No buyout request for this exit.</p>
        <p className="text-xs text-gray-400">
          The employee can submit a buyout request from their self-service portal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="h-5 w-5 text-rose-500" />
          <h3 className="text-sm font-semibold text-gray-900">Notice Buyout Request</h3>
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
              BUYOUT_STATUS_COLORS[buyout.status] || "bg-gray-100 text-gray-600",
            )}
          >
            {buyout.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Original Last Date</p>
          <p className="mt-0.5 text-sm text-gray-900">{formatDate(buyout.original_last_date)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Requested Last Date</p>
          <p className="mt-0.5 text-sm font-medium text-gray-900">{formatDate(buyout.requested_last_date)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Original Notice</p>
          <p className="mt-0.5 text-sm text-gray-900">{buyout.original_notice_days} days</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Days Served</p>
          <p className="mt-0.5 text-sm text-gray-900">{buyout.served_days} days</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
          <p className="text-xs text-amber-600 font-medium">Days to Buy Out</p>
          <p className="text-lg font-bold text-amber-700">{buyout.remaining_days} days</p>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
          <p className="text-xs text-gray-500">Daily Rate</p>
          <p className="text-lg font-semibold text-gray-900">{formatINR(buyout.daily_rate)}</p>
        </div>
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3">
          <p className="text-xs text-rose-500 font-medium">Buyout Amount</p>
          <p className="text-2xl font-bold text-rose-600">{formatINR(buyout.buyout_amount)}</p>
        </div>
      </div>

      {buyout.status === "rejected" && buyout.rejected_reason && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-xs font-medium text-red-600 mb-1">Rejection Reason</p>
          <p className="text-sm text-red-700">{buyout.rejected_reason}</p>
        </div>
      )}

      {buyout.status === "approved" && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          Approved on {buyout.approved_at ? formatDate(buyout.approved_at) : "--"}.
          The buyout amount will be added to the notice period recovery in the F&F settlement.
        </div>
      )}

      {buyout.status === "pending" && (
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleApprove}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Approve Buyout
          </button>
          {!showReject ? (
            <button
              onClick={() => setShowReject(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Rejection reason..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none"
              />
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => { setShowReject(false); setRejectReason(""); }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm text-gray-500">{name} — coming soon.</p>
    </div>
  );
}
