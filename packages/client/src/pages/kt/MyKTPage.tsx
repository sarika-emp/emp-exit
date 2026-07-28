import { useState, useEffect } from "react";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  Clock,
  CheckCircle,
} from "lucide-react";
import { apiGet, apiPut } from "@/api/client";
import toast from "react-hot-toast";
import { cn, formatDate } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const KT_STATUS: Record<string, { label: string; color: string }> = {
  not_started: { label: "Not Started", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", color: "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" },
  completed: { label: "Completed", color: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300" },
};

export function MyKTPage() {
  const [kt, setKt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  async function fetchKT() {
    setLoading(true);
    try {
      // Self-service: the server resolves MY exit — no exitId needed.
      const res = await apiGet<any>("/self-service/my-kt");
      if (res.success) setKt(res.data);
    } catch {
      // no KT plan
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchKT();
  }, []);

  // Once the plan is completed the checklist is locked (read-only).
  const planCompleted = kt?.status === "completed";
  const items = kt?.items ?? [];
  const allItemsDone = items.length > 0 && items.every((i: any) => i.status === "completed");

  async function toggleItem(itemId: string, currentStatus: string) {
    if (planCompleted) return; // locked after completion
    const newStatus = currentStatus === "completed" ? "not_started" : "completed";
    try {
      await apiPut(`/self-service/my-kt/items/${itemId}`, { status: newStatus });
      toast.success(newStatus === "completed" ? "Item completed" : "Item reopened");
      fetchKT();
    } catch {
      toast.error("Failed to update item");
    }
  }

  async function handleCompleteKT() {
    setCompleting(true);
    try {
      await apiPut("/self-service/my-kt/complete", {});
      toast.success("Knowledge transfer completed");
      setConfirmOpen(false);
      fetchKT();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to complete KT");
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600 dark:text-rose-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Knowledge Transfer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track the knowledge transfer items assigned to you and mark them complete.
        </p>
      </div>

      {!kt ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No knowledge transfer has been assigned to you.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your HR team will set up a KT plan if one is needed for your exit.
          </p>
        </div>
      ) : (
        <>
          {/* KT info */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">KT Plan Overview</h3>
              <span className={cn("rounded-full px-3 py-1 text-xs font-medium", KT_STATUS[kt.status]?.color)}>
                {KT_STATUS[kt.status]?.label}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Due: {kt.due_date ? formatDate(kt.due_date) : "Not set"}
              </span>
              <span>
                {kt.items?.filter((i: any) => i.status === "completed").length || 0}/{kt.items?.length || 0} completed
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {!kt.items || kt.items.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground text-sm">
                No KT items have been assigned yet.
              </div>
            ) : (
              kt.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
                >
                  <button
                    onClick={() => toggleItem(item.id, item.status)}
                    disabled={planCompleted}
                    className={cn("mt-0.5 flex-shrink-0", planCompleted && "cursor-default")}
                  >
                    {item.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/50 hover:text-rose-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", item.status === "completed" ? "text-muted-foreground line-through" : "text-foreground")}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                    )}
                    {item.document_url && (
                      <a
                        href={item.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:underline"
                      >
                        <FileText className="h-3 w-3" />
                        Document
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Complete-KT action / completed banner */}
          {items.length > 0 && (
            planCompleted ? (
              <div className="flex items-center gap-3 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 p-4">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Knowledge transfer completed</p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    {kt.completed_date
                      ? `Completed on ${formatDate(kt.completed_date)}`
                      : "All items handed over and signed off."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {allItemsDone
                    ? "All items are done. Finish your knowledge transfer to sign it off."
                    : "Complete all the items above to finish your knowledge transfer."}
                </p>
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={!allItemsDone}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark KT as Complete
                </button>
              </div>
            )
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Complete Knowledge Transfer?"
        message="This marks your knowledge transfer as complete and locks the items. You won't be able to change them afterwards."
        confirmLabel="Mark as Complete"
        tone="primary"
        loading={completing}
        onConfirm={handleCompleteKT}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
