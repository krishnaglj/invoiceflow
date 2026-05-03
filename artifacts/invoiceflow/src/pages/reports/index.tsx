import { useState } from "react";
import { useGetGstReport, useGetProfitLoss, useGetAgingReport } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line } from "recharts";
import { FileBarChart2, TrendingUp, TrendingDown, IndianRupee, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "wouter";

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const now = new Date();

export default function Reports() {
  const [gstMonth, setGstMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [gstYear, setGstYear] = useState(now.getFullYear());
  const [openBuckets, setOpenBuckets] = useState<Set<string>>(new Set(["Current", "1–30 Days"]));

  const { data: gstReport, isLoading: gstLoading } = useGetGstReport({ month: gstMonth, year: gstYear });
  const { data: pl, isLoading: plLoading } = useGetProfitLoss({});
  const { data: aging, isLoading: agingLoading } = useGetAgingReport();

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  const toggleBucket = (label: string) =>
    setOpenBuckets((prev) => { const s = new Set(prev); s.has(label) ? s.delete(label) : s.add(label); return s; });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">GST summary, profit & loss, and business insights.</p>
      </div>

      <Tabs defaultValue="gst">
        <TabsList className="rounded-xl">
          <TabsTrigger value="gst" className="rounded-lg">GST Summary</TabsTrigger>
          <TabsTrigger value="pl" className="rounded-lg">Profit & Loss</TabsTrigger>
          <TabsTrigger value="aging" className="rounded-lg">Aging Report</TabsTrigger>
        </TabsList>

        {/* ─── GST SUMMARY ────────────────────────────────────────────── */}
        <TabsContent value="gst" className="space-y-6 mt-6">
          <div className="flex items-center gap-4">
            <Select value={gstMonth} onValueChange={setGstMonth}>
              <SelectTrigger className="w-44 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(gstYear)} onValueChange={(v) => setGstYear(parseInt(v))}>
              <SelectTrigger className="w-28 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {gstLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : gstReport ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Taxable" value={formatCurrency(gstReport.totalTaxable)} icon={IndianRupee} color="text-primary" bg="bg-primary/10" />
                <StatCard label="CGST" value={formatCurrency(gstReport.totalCgst)} icon={TrendingUp} color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/30" />
                <StatCard label="SGST" value={formatCurrency(gstReport.totalSgst)} icon={TrendingUp} color="text-indigo-600" bg="bg-indigo-100 dark:bg-indigo-900/30" />
                <StatCard label="IGST" value={formatCurrency(gstReport.totalIgst)} icon={TrendingUp} color="text-violet-600" bg="bg-violet-100 dark:bg-violet-900/30" />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="rounded-2xl border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="font-display text-base">Tax Summary — {MONTHS.find(m => m.value === gstMonth)?.label} {gstYear}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-2 border-b font-medium text-muted-foreground">
                        <span>Total Revenue</span>
                        <span className="text-foreground font-bold">{formatCurrency(gstReport.totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span>Taxable Amount</span>
                        <span>{formatCurrency(gstReport.totalTaxable)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span>CGST (Intra-state)</span>
                        <span>{formatCurrency(gstReport.totalCgst)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span>SGST (Intra-state)</span>
                        <span>{formatCurrency(gstReport.totalSgst)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span>IGST (Inter-state)</span>
                        <span>{formatCurrency(gstReport.totalIgst)}</span>
                      </div>
                      <div className="flex justify-between py-2 font-bold text-base">
                        <span>Total Tax Liability</span>
                        <span className="text-primary">{formatCurrency(gstReport.totalTax)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="font-display text-base">Tax by Rate Slab (GSTR-1 Style)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {gstReport.slabs.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">No taxable invoices in this period.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-muted-foreground font-medium border-b">
                            <th className="py-2 text-left">Rate</th>
                            <th className="py-2 text-right">Taxable Amt</th>
                            <th className="py-2 text-right">CGST</th>
                            <th className="py-2 text-right">SGST</th>
                            <th className="py-2 text-right">IGST</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {gstReport.slabs.map((slab) => (
                            <tr key={slab.taxRate}>
                              <td className="py-2.5 font-medium">{slab.taxRate}%</td>
                              <td className="py-2.5 text-right">{formatCurrency(slab.taxableAmount)}</td>
                              <td className="py-2.5 text-right">{formatCurrency(slab.cgst)}</td>
                              <td className="py-2.5 text-right">{formatCurrency(slab.sgst)}</td>
                              <td className="py-2.5 text-right">{formatCurrency(slab.igst)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* ─── PROFIT & LOSS ──────────────────────────────────────────── */}
        <TabsContent value="pl" className="space-y-6 mt-6">
          {plLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : pl ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Revenue" value={formatCurrency(pl.totalRevenue)} icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-100 dark:bg-emerald-900/30" />
                <StatCard label="Total Expenses" value={formatCurrency(pl.totalExpenses)} icon={TrendingDown} color="text-red-600" bg="bg-red-100 dark:bg-red-900/30" />
                <StatCard
                  label="Net Profit"
                  value={formatCurrency(Math.abs(pl.netProfit))}
                  prefix={pl.netProfit < 0 ? "−" : ""}
                  icon={IndianRupee}
                  color={pl.netProfit >= 0 ? "text-primary" : "text-destructive"}
                  bg={pl.netProfit >= 0 ? "bg-primary/10" : "bg-destructive/10"}
                />
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 rounded-2xl border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="font-display text-base">Revenue vs Expenses (Last 6 Months)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pl.revenueByMonth} margin={{ left: -20 }}>
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `₹${v / 1000}k`} />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
                          formatter={(val: number, name: string) => [formatCurrency(val), name.charAt(0).toUpperCase() + name.slice(1)]}
                        />
                        <Legend />
                        <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--destructive)/0.6)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="font-display text-base">Expenses by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pl.expensesByCategory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {pl.expensesByCategory.map((cat) => {
                          const pct = pl.totalExpenses > 0 ? (cat.amount / pl.totalExpenses) * 100 : 0;
                          return (
                            <div key={cat.category}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="capitalize font-medium">{cat.category}</span>
                                <span className="text-muted-foreground">{formatCurrency(cat.amount)}</span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-display text-base">Monthly Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground font-medium border-b">
                        <th className="py-2 text-left">Month</th>
                        <th className="py-2 text-right">Revenue</th>
                        <th className="py-2 text-right">Expenses</th>
                        <th className="py-2 text-right">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {pl.revenueByMonth.map((m) => (
                        <tr key={m.month}>
                          <td className="py-3 font-medium">{m.month}</td>
                          <td className="py-3 text-right text-emerald-600 font-medium">{formatCurrency(m.revenue)}</td>
                          <td className="py-3 text-right text-destructive font-medium">{formatCurrency(m.expenses)}</td>
                          <td className={`py-3 text-right font-bold ${m.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                            {m.profit < 0 ? "−" : ""}{formatCurrency(Math.abs(m.profit))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* ─── AGING REPORT ───────────────────────────────────────────── */}
        <TabsContent value="aging" className="space-y-6 mt-6">
          {agingLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-muted/30 animate-pulse rounded-2xl" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Outstanding" value={formatCurrency(aging?.totalOutstanding ?? 0)} icon={IndianRupee} color="text-red-600" bg="bg-red-50" />
                <StatCard label="Unpaid Invoices" value={aging?.totalInvoices ?? 0} icon={AlertCircle} color="text-amber-600" bg="bg-amber-50" />
                <StatCard label="90+ Days Overdue" value={formatCurrency(aging?.buckets?.find(b => b.label === "90+ Days")?.total ?? 0)} icon={TrendingDown} color="text-rose-700" bg="bg-rose-50" />
              </div>

              <div className="space-y-3">
                {(aging?.buckets ?? []).map((bucket) => (
                  <Card key={bucket.label} className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                      onClick={() => toggleBucket(bucket.label)}
                    >
                      <div className="flex items-center gap-3">
                        {openBuckets.has(bucket.label)
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        <span className="font-semibold text-sm">{bucket.label}</span>
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{bucket.count}</span>
                      </div>
                      <span className={`font-bold text-sm ${bucket.label === "Current" ? "text-amber-600" : bucket.count > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                        {formatCurrency(bucket.total)}
                      </span>
                    </button>
                    {openBuckets.has(bucket.label) && bucket.invoices.length > 0 && (
                      <div className="border-t">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/40">
                            <tr>
                              <th className="text-left px-5 py-2 font-medium text-muted-foreground">Invoice</th>
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Customer</th>
                              <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">Due Date</th>
                              <th className="text-right px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Overdue</th>
                              <th className="text-right px-5 py-2 font-medium text-muted-foreground">Outstanding</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bucket.invoices.map((inv: any) => (
                              <tr key={inv.id} className="border-t hover:bg-muted/20 transition-colors">
                                <td className="px-5 py-3">
                                  <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline">{inv.invoiceNumber}</Link>
                                </td>
                                <td className="px-3 py-3 text-muted-foreground hidden sm:table-cell">{inv.customerName || "—"}</td>
                                <td className="px-3 py-3 text-muted-foreground hidden md:table-cell">{inv.dueDate ? formatDate(inv.dueDate) : "—"}</td>
                                <td className="px-3 py-3 text-right hidden sm:table-cell">
                                  {inv.daysOverdue > 0
                                    ? <span className="text-red-600 font-medium">{inv.daysOverdue}d</span>
                                    : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="px-5 py-3 text-right font-semibold text-red-600">{formatCurrency(inv.outstanding)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {openBuckets.has(bucket.label) && bucket.invoices.length === 0 && (
                      <div className="border-t px-5 py-4 text-sm text-muted-foreground italic">No invoices in this bucket.</div>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, prefix = "", icon: Icon, color, bg }: any) {
  return (
    <Card className="rounded-2xl border-border/50 shadow-sm">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold font-display">{prefix}{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
