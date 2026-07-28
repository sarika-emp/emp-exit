import { useState, useEffect } from "react";
import { Outlet, Navigate, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut as LogOutIcon,
  DoorOpen,
  ClipboardCheck,
  ShieldCheck,
  MessageSquare,
  Calculator,
  DollarSign,
  Package,
  BookOpen,
  FileSignature,
  GraduationCap,
  BarChart3,
  AlertTriangle,
  Settings,
  Menu,
  X,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { isLoggedIn, getUser, useAuthStore, isAdmin } from "@/lib/auth-store";
import { cn, getInitials } from "@/lib/utils";
import { BackToDashboard } from "@/components/BackToDashboard";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface NavItem {
  to: string;
  label: string;
  icon: any;
}

// Full management console — shown to admin / HR roles.
const ADMIN_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/exits", label: "Exits", icon: DoorOpen },
  { to: "/checklists", label: "Checklists", icon: ClipboardCheck },
  { to: "/clearance", label: "Clearance", icon: ShieldCheck },
  { to: "/interviews", label: "Interviews", icon: MessageSquare },
  { to: "/fnf", label: "FnF", icon: Calculator },
  { to: "/buyout", label: "Notice Buyout", icon: DollarSign },
  { to: "/assets", label: "Assets", icon: Package },
  { to: "/kt", label: "KT", icon: BookOpen },
  { to: "/letters", label: "Letters", icon: FileSignature },
  { to: "/alumni", label: "Alumni", icon: GraduationCap },
  { to: "/rehire", label: "Rehire", icon: UserPlus },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/analytics/flight-risk", label: "Flight Risk", icon: AlertTriangle },
  { to: "/settings", label: "Settings", icon: Settings },
];

// Self-service hub — shown to the employee role. Every link points at a
// "my own" page; no org-wide management views.
const EMPLOYEE_NAV: NavItem[] = [
  { to: "/exits/my", label: "My Exit", icon: UserMinus },
  { to: "/interviews/my", label: "My Interview", icon: MessageSquare },
  { to: "/kt/my", label: "My KT", icon: BookOpen },
  { to: "/alumni/my", label: "Alumni", icon: GraduationCap },
];

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const user = getUser();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  const displayName = user ? `${user.firstName} ${user.lastName}` : "User";
  const ROLE_LABELS: Record<string, string> = {
    super_admin: "Super Admin",
    org_admin: "Org Admin",
    hr_admin: "HR Admin",
    hr_manager: "HR Manager",
    employee: "Employee",
  };
  const roleLabel = ROLE_LABELS[user?.role || "employee"] || "Employee";
  const navItems = isAdmin(user) ? ADMIN_NAV : EMPLOYEE_NAV;

  function SidebarContent() {
    return (
      <div className="flex h-full w-64 flex-col bg-card border-r border-border">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
            <DoorOpen className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">EMP Exit</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              // `end` forces exact-path matching. Without this, NavLink uses
              // prefix-match, so visiting /analytics/flight-risk highlights
              // both "Analytics" (/analytics) and "Flight Risk"
              // (/analytics/flight-risk) at the same time.
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User card */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-sm font-semibold">
              {getInitials(displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
              title="Logout"
            >
              <LogOutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-muted/50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <SidebarContent />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed left-0 top-0 z-50 h-full">
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <BackToDashboard />
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-xs font-semibold">
              {getInitials(displayName)}
            </div>
            <span className="hidden md:block text-sm font-medium text-muted-foreground">{displayName}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
