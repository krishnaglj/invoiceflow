import { useGetDashboardStats, useGetMonthlyRevenue, useGetTopCustomers, useListInvoices, useGetReorderSuggestions } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, ArrowUpRight, AlertCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { StatusBadge } from "@/components/status-badge";

export default function Dashboard() {
  const { data: stats } = useGetDashboardStats();
  const { data: revenue } = useGetMonthlyRevenue();
  const { data: topCustomers } = useGetTopCustomers();
  const { data: recentInvoices } = useListInvoices({ status: undefined });
  const { data: reorderItems = [] } = useGetReorderSuggestions();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your business.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl hover-elevate" asChild>
            <Link href="/customers"><Users className="w-4 h-4 mr-2" /> Add Customer</Link>
          </Button>
          <Button className="rounded-xl shadow-lg shadow-primary/20 hover-elevate" asChild>
            <Link href="/invoices/new"><Plus className="w-4 h-4 mr-2" /> New Invoice</Link>
          </Button>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Total Revenue" value={stats?.totalRevenue} icon={ArrowUpRight} color="text-primary" bg="bg-primary/10" />
        <StatCard title="Pending Amount" value={stats?.pendingAmount} icon={Clock} color="text-amber-600" bg="bg-amber-100 dark:bg-amber-900/30" />
        <StatCard title="Paid Invoices" value={stats?.paidInvoices} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-100 dark:bg-emerald-900/30" isCurrency={false} />
        <StatCard title="Overdue Invoices" value={stats?.overdueCount} icon={AlertCircle} color="text-destructive" bg="bg-destructive/10" isCurrency={false} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* CHART */}
        <Card className="lg:col-span-2 rounded-2xl shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="font-display">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] w-full pt-4">
            {revenue ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                    formatter={(val: number) => [formatCurrency(val), "Revenue"]}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {revenue.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === revenue.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.3)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-xl" />}
          </CardContent>
        </Card>

        {/* TOP CUSTOMERS */}
        <Card className="rounded-2xl shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="font-display">Top Customers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {topCustomers?.slice(0, 5).map((c) => (
                <Link key={c.id} href={`/customers/${c.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.invoiceCount} invoices</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm">{formatCurrency(c.totalBilled)}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LOW STOCK ALERT */}
      {reorderItems.length > 0 && (
        <Card className="rounded-2xl shadow-sm border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <CardTitle className="font-display text-yellow-800 dark:text-yellow-400">
                Low Stock Alert ({reorderItems.length})
              </CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/inventory">View Inventory</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-yellow-200/50 dark:divide-yellow-800/30">
              {reorderItems.slice(0, 4).map((item) => (
                <div key={item.productId} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Reorder at: {item.reorderLevel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400">{item.currentQty} left</p>
                    <p className="text-xs text-muted-foreground">Order: {item.suggestedQty}</p>
                  </div>
                </div>
              ))}
              {reorderItems.length > 4 && (
                <div className="px-6 py-2 text-xs text-center text-muted-foreground">
                  +{reorderItems.length - 4} more items need restocking
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* RECENT INVOICES */}
      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="font-display">Recent Invoices</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/invoices">View All</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-medium">
              <tr>
                <th className="px-6 py-3">Invoice</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {recentInvoices?.slice(0, 5).map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.location.href = `/invoices/${inv.id}`}>
                  <td className="px-6 py-4 font-medium text-primary">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4">{inv.customerName || 'Walk-in Customer'}</td>
                  <td className="px-6 py-4 text-muted-foreground">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold">{formatCurrency(inv.total)}</td>
                  <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
              {!recentInvoices?.length && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No invoices yet. Create your first one!</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg, isCurrency = true }: any) {
  return (
    <Card className="rounded-2xl shadow-sm border-border/50 hover-elevate">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold font-display tracking-tight">
            {value !== undefined ? (isCurrency ? formatCurrency(value) : value) : "..."}
          </h3>
        </div>
      </CardContent>
    </Card>
  );
}
