import { Link, useLocation } from "wouter";
import { cn, refreshInvoicePrefix } from "@/lib/utils";
import {
  LayoutDashboard, Receipt, Users, Package, Settings, LogOut, Menu, X,
  FileText, TrendingDown, BarChart2, Boxes, ShoppingCart, Truck, Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "@/lib/auth-client";
import { useState, useEffect } from "react";
import { useGetBusinessProfile, useUpdateBusinessProfile } from "@workspace/api-client-react";

function usePrefixRefresh() {
  const { data: profile } = useGetBusinessProfile();
  const update = useUpdateBusinessProfile();
  useEffect(() => {
    if (!profile?.invoicePrefix) return;
    const newPrefix = refreshInvoicePrefix(profile.invoicePrefix);
    if (newPrefix) {
      update.mutate({ data: { invoicePrefix: newPrefix } });
    }
  }, [profile?.invoicePrefix]);
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Receipt, label: "Invoices", href: "/invoices" },
  { icon: FileText, label: "Estimates", href: "/estimates" },
  { icon: TrendingDown, label: "Expenses", href: "/expenses" },
  { icon: Users, label: "Customers", href: "/customers" },
  { icon: Package, label: "Products", href: "/products" },
  { icon: BarChart2, label: "Reports", href: "/reports" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

const INVENTORY_ITEMS = [
  { icon: Boxes, label: "Stock Overview", href: "/inventory" },
  { icon: ShoppingCart, label: "Purchase Orders", href: "/purchase-orders" },
  { icon: Truck, label: "Vendors", href: "/vendors" },
  { icon: Warehouse, label: "Warehouses", href: "/warehouses" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  usePrefixRefresh();

  const user = session?.user;
  const displayName = user?.name || user?.email || "User";
  const avatarUrl = user?.image;
  const initials = (user?.name ?? displayName)[0]?.toUpperCase() ?? "U";

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r bg-card h-screen sticky top-0 no-print">
        <div className="h-14 flex items-center px-5 border-b border-border/50">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/20">
              <span className="text-white font-display font-bold text-base leading-none">I</span>
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-foreground">InvoiceFlow</span>
          </Link>
        </div>

        <div className="flex-1 py-4 px-2 flex flex-col gap-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all duration-200 text-sm",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground hover-elevate",
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
          <div className="mt-2 mb-1 px-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Inventory</span>
          </div>
          {INVENTORY_ITEMS.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all duration-200 text-sm",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground hover-elevate",
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="p-3 border-t border-border/50 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/40">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{initials}</span>
              </div>
            )}
            <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive text-sm"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden flex flex-col flex-1 w-full min-w-0 overflow-hidden">
        <header className="h-16 shrink-0 border-b bg-card flex items-center justify-between px-4 sticky top-0 z-50 no-print">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-display font-bold text-lg leading-none">I</span>
            </div>
            <span className="font-display font-bold text-xl">InvoiceFlow</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 top-16 bg-background z-40 p-4 flex flex-col gap-2 overflow-y-auto no-print">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl font-medium text-base",
                  location.startsWith(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground border",
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 pt-2">Inventory</p>
            {INVENTORY_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl font-medium text-base",
                  location.startsWith(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground border",
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-muted/40">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{initials}</span>
                  </div>
                )}
                <span className="text-base font-medium">{displayName}</span>
              </div>
              <button
                onClick={() => { setMobileOpen(false); handleSignOut(); }}
                className="flex items-center gap-4 px-4 py-3 rounded-xl font-medium text-base w-full bg-card text-destructive border"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 w-full max-w-full overflow-x-hidden overflow-y-auto print-container">
          {children}
        </main>
      </div>

      {/* Desktop Main Content */}
      <main className="hidden md:flex flex-1 flex-col min-w-0 overflow-x-hidden print-container">
        {children}
      </main>
    </div>
  );
}
