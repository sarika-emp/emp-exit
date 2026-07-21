import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Package,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/api/client";
import toast from "react-hot-toast";
import { cn, formatDate } from "@/lib/utils";

const CATEGORIES = [
  { key: "laptop", label: "Laptop" },
  { key: "phone", label: "Phone" },
  { key: "id_card", label: "ID Card" },
  { key: "access_card", label: "Access Card" },
  { key: "vehicle", label: "Vehicle" },
  { key: "furniture", label: "Furniture" },
  { key: "other", label: "Other" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300", icon: Clock },
  returned: { label: "Returned", color: "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300", icon: CheckCircle2 },
  damaged: { label: "Damaged", color: "bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300", icon: AlertTriangle },
  lost: { label: "Lost", color: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300", icon: XCircle },
  waived: { label: "Waived", color: "bg-muted text-muted-foreground", icon: CheckCircle2 },
};

export function AssetListPage() {
  const [searchParams] = useSearchParams();
  const exitId = searchParams.get("exitId") || "";
  const [assets, setAssets] = useState<any[]>([]);
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ asset_name: "", asset_tag: "", category: "laptop", replacement_cost: "" });
  const [submitting, setSubmitting] = useState(false);

  async function fetchAssets() {
    setLoading(true);
    try {
      if (exitId) {
        const res = await apiGet<any[]>(`/assets/exit/${exitId}`);
        if (res.success) setAssets(res.data || []);
      } else {
        // No exit selected → show the org-wide asset list.
        const res = await apiGet<any[]>("/assets");
        if (res.success) setAllAssets(res.data || []);
      }
    } catch {
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssets();
  }, [exitId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!exitId) {
      toast.error("No exit selected. Pass ?exitId= in the URL.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        asset_name: form.asset_name,
        asset_tag: form.asset_tag || undefined,
        category: form.category,
        replacement_cost: form.replacement_cost === "" ? 0 : Number(form.replacement_cost),
      };
      await apiPost(`/assets/exit/${exitId}`, payload);
      toast.success("Asset added");
      setShowForm(false);
      setForm({ asset_name: "", asset_tag: "", category: "laptop", replacement_cost: "" });
      fetchAssets();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to add asset");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusUpdate(assetId: string, status: string) {
    try {
      await apiPut(`/assets/${assetId}`, {
        status,
        returned_date: status === "returned" ? new Date().toISOString().split("T")[0] : undefined,
      });
      toast.success(`Asset marked as ${status}`);
      fetchAssets();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to update asset");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Asset Returns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track company asset returns for exiting employees.
          </p>
        </div>
        {exitId && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            <Plus className="h-4 w-4" />
            Add Asset
          </button>
        )}
      </div>

      {/* Org-wide asset list (shown when no specific exit is selected) */}
      {!exitId && (
        loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-rose-600 dark:text-rose-400" />
          </div>
        ) : allAssets.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-foreground">No assets tracked yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Asset returns are tracked per exit. Open an exit from the{" "}
              <a href="/exits" className="font-medium text-rose-600 hover:text-rose-700 dark:text-rose-300 underline">
                Exits list
              </a>{" "}
              and add the assets to be returned.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card -mx-4 lg:mx-0">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Asset</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allAssets.map((asset: any) => {
                  const sc = STATUS_CONFIG[asset.status] || STATUS_CONFIG.pending;
                  const Icon = sc.icon;
                  const name = asset.employee
                    ? `${asset.employee.first_name} ${asset.employee.last_name}`
                    : "—";
                  return (
                    <tr key={asset.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{name}</p>
                        {asset.employee?.designation && (
                          <p className="text-xs text-muted-foreground">{asset.employee.designation}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {asset.asset_name}
                        {asset.asset_tag && <span className="ml-1 text-xs text-muted-foreground">({asset.asset_tag})</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{asset.category?.replace("_", " ")}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", sc.color)}>
                          <Icon className="h-3 w-3" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/assets?exitId=${asset.exit_request_id}`}
                          className="text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-300"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Add Asset</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Asset Name</label>
              <input
                type="text"
                required
                value={form.asset_name}
                onChange={(e) => setForm({ ...form, asset_name: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                placeholder="MacBook Pro 14"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Asset Tag</label>
              <input
                type="text"
                value={form.asset_tag}
                onChange={(e) => setForm({ ...form, asset_tag: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                placeholder="IT-LAP-0042"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Damage / Replacement Cost</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.replacement_cost}
                onChange={(e) => setForm({ ...form, replacement_cost: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Asset"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!exitId ? null : loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-rose-600 dark:text-rose-400" />
        </div>
      ) : assets.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          No assets tracked yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card -mx-4 lg:mx-0">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Asset</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Tag</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Return Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.map((asset: any) => {
                const sc = STATUS_CONFIG[asset.status] || STATUS_CONFIG.pending;
                const Icon = sc.icon;
                return (
                  <tr key={asset.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{asset.asset_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{asset.asset_tag || "-"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{asset.category?.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", sc.color)}>
                        <Icon className="h-3 w-3" />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {asset.returned_date ? formatDate(asset.returned_date) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {asset.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusUpdate(asset.id, "returned")}
                            className="rounded bg-green-50 dark:bg-green-950/40 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 hover:bg-green-100 dark:bg-green-950/40"
                          >
                            Returned
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(asset.id, "damaged")}
                            className="rounded bg-orange-50 dark:bg-orange-950/40 px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:bg-orange-950/40"
                          >
                            Damaged
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(asset.id, "lost")}
                            className="rounded bg-red-50 dark:bg-red-950/40 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:bg-red-950/40"
                          >
                            Lost
                          </button>
                        </div>
                      )}
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
