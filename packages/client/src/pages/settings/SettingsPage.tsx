import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Loader2,
  Save,
  Clock,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { apiGet, apiPut } from "@/api/client";
import toast from "react-hot-toast";

type FormState = {
  default_notice_period_days: number;
  auto_initiate_clearance: boolean;
  require_exit_interview: boolean;
  fnf_approval_required: boolean;
  alumni_opt_in_default: boolean;
  email_on_exit_initiated: boolean;
  email_on_clearance_pending: boolean;
  email_on_clearance_completed: boolean;
  email_on_fnf_calculated: boolean;
  email_on_fnf_approved: boolean;
  email_on_exit_completed: boolean;
};

const DEFAULTS: FormState = {
  default_notice_period_days: 30,
  auto_initiate_clearance: true,
  require_exit_interview: true,
  fnf_approval_required: true,
  alumni_opt_in_default: true,
  email_on_exit_initiated: true,
  email_on_clearance_pending: true,
  email_on_clearance_completed: true,
  email_on_fnf_calculated: true,
  email_on_fnf_approved: true,
  email_on_exit_completed: true,
};

// ── Reusable toggle row ─────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 ${
        checked ? "bg-rose-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// Card with a coloured icon header.
function SettingsCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="px-6 py-2">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [saved, setSaved] = useState<FormState>(DEFAULTS); // last-persisted snapshot

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await apiGet<any>("/settings");
      if (res.success && res.data) {
        const next: FormState = {
          default_notice_period_days: res.data.default_notice_period_days ?? 30,
          auto_initiate_clearance: Boolean(res.data.auto_initiate_clearance),
          require_exit_interview: Boolean(res.data.require_exit_interview),
          fnf_approval_required: Boolean(res.data.fnf_approval_required),
          alumni_opt_in_default: Boolean(res.data.alumni_opt_in_default),
          email_on_exit_initiated: res.data.email_on_exit_initiated !== false,
          email_on_clearance_pending: res.data.email_on_clearance_pending !== false,
          email_on_clearance_completed: res.data.email_on_clearance_completed !== false,
          email_on_fnf_calculated: res.data.email_on_fnf_calculated !== false,
          email_on_fnf_approved: res.data.email_on_fnf_approved !== false,
          email_on_exit_completed: res.data.email_on_exit_completed !== false,
        };
        setForm(next);
        setSaved(next);
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiPut<any>("/settings", form);
      if (res.success) {
        setSaved(form);
        toast.success("Settings saved");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-3xl space-y-6 pb-24">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-600 text-white">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exit Settings</h1>
          <p className="text-sm text-gray-500">
            Configure notice periods, clearance, FnF, and alumni defaults.
          </p>
        </div>
      </div>

      {/* General */}
      <SettingsCard
        icon={<ShieldCheck className="h-5 w-5" />}
        title="General"
        subtitle="Defaults applied across the exit workflow."
      >
        <div className="flex items-start justify-between gap-4 py-3.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">Default Notice Period</p>
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
              Applied when initiating an exit if no custom period is specified.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                min={0}
                max={365}
                value={form.default_notice_period_days}
                onChange={(e) => set({ default_notice_period_days: Number(e.target.value) })}
                className="w-28 rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <span className="text-xs text-gray-400">days</span>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          <ToggleRow
            label="Auto-Initiate Clearance"
            description="Automatically create clearance records when an exit moves to clearance stage."
            checked={form.auto_initiate_clearance}
            onChange={(v) => set({ auto_initiate_clearance: v })}
          />
          <ToggleRow
            label="Require Exit Interview"
            description="Exit interview must be completed before exit can be finalized."
            checked={form.require_exit_interview}
            onChange={(v) => set({ require_exit_interview: v })}
          />
          <ToggleRow
            label="FnF Approval Required"
            description="Full & Final settlement requires HR admin approval before processing."
            checked={form.fnf_approval_required}
            onChange={(v) => set({ fnf_approval_required: v })}
          />
          <ToggleRow
            label="Alumni Opt-In Default"
            description="Automatically opt employees into the alumni network upon exit completion."
            checked={form.alumni_opt_in_default}
            onChange={(v) => set({ alumni_opt_in_default: v })}
          />
        </div>
      </SettingsCard>

      {/* Email notifications */}
      <SettingsCard
        icon={<Mail className="h-5 w-5" />}
        title="Email Notifications"
        subtitle="Enable or disable email notifications for each exit stage."
      >
        <div className="divide-y divide-gray-100">
          <ToggleRow
            label="Exit Initiated"
            description="Notify employee, manager, and HR when an exit is initiated."
            checked={form.email_on_exit_initiated}
            onChange={(v) => set({ email_on_exit_initiated: v })}
          />
          <ToggleRow
            label="Clearance Pending"
            description="Notify department heads when clearance is required."
            checked={form.email_on_clearance_pending}
            onChange={(v) => set({ email_on_clearance_pending: v })}
          />
          <ToggleRow
            label="Clearance Completed"
            description="Notify employee when all clearances are completed."
            checked={form.email_on_clearance_completed}
            onChange={(v) => set({ email_on_clearance_completed: v })}
          />
          <ToggleRow
            label="F&F Calculated"
            description="Notify employee when F&F settlement is calculated."
            checked={form.email_on_fnf_calculated}
            onChange={(v) => set({ email_on_fnf_calculated: v })}
          />
          <ToggleRow
            label="F&F Approved"
            description="Notify employee when F&F settlement is approved."
            checked={form.email_on_fnf_approved}
            onChange={(v) => set({ email_on_fnf_approved: v })}
          />
          <ToggleRow
            label="Exit Completed"
            description="Notify employee when the exit process is complete."
            checked={form.email_on_exit_completed}
            onChange={(v) => set({ email_on_exit_completed: v })}
          />
        </div>
      </SettingsCard>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="text-xs text-gray-500">
            {dirty ? "You have unsaved changes." : "All changes saved."}
          </span>
          <button
            type="submit"
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>
    </form>
  );
}
