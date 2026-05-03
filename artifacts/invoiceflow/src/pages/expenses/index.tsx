import { useState } from "react";
import { useListExpenses, useCreateExpense, useDeleteExpense } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Receipt, Trash2, TrendingDown, Download } from "lucide-react";

function downloadCSV(rows: (string | number | undefined | null)[][], filename: string) {
  const content = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = ["rent", "salaries", "utilities", "travel", "marketing", "supplies", "maintenance", "food", "software", "other"];
const PAYMENT_METHODS = ["cash", "upi", "bank_transfer", "cheque", "card"];

const CATEGORY_COLORS: Record<string, string> = {
  rent: "bg-orange-100 text-orange-700",
  salaries: "bg-blue-100 text-blue-700",
  utilities: "bg-yellow-100 text-yellow-700",
  travel: "bg-cyan-100 text-cyan-700",
  marketing: "bg-pink-100 text-pink-700",
  supplies: "bg-green-100 text-green-700",
  maintenance: "bg-gray-100 text-gray-700",
  food: "bg-red-100 text-red-700",
  software: "bg-purple-100 text-purple-700",
  other: "bg-slate-100 text-slate-700",
};

const expenseSchema = z.object({
  date: z.string().min(1),
  category: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  description: z.string().optional(),
  vendor: z.string().optional(),
  paymentMethod: z.enum(["cash", "upi", "bank_transfer", "cheque", "card"]).default("cash"),
  reference: z.string().optional(),
});

export default function Expenses() {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { data: expenses, isLoading } = useListExpenses({ search: search || undefined });
  const createMut = useCreateExpense();
  const deleteMut = useDeleteExpense();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      category: "other",
      paymentMethod: "cash",
      amount: 0,
    },
  });

  const totalExpenses = expenses?.reduce((s, e) => s + e.amount, 0) ?? 0;

  const onSubmit = (data: z.infer<typeof expenseSchema>) => {
    createMut.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Expense recorded" });
        queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        setIsOpen(false);
        form.reset({ date: new Date().toISOString().split("T")[0], category: "other", paymentMethod: "cash", amount: 0 });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this expense?")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Expense deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        }
      });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track your business spending.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" className="rounded-xl h-10 px-3"
            onClick={() => {
              const rows: (string | number | undefined | null)[][] = [
                ["Date", "Category", "Description", "Vendor", "Payment Method", "Reference", "Amount"],
                ...(expenses ?? []).map((e) => [
                  e.date, e.category, e.description, e.vendor,
                  e.paymentMethod, e.reference, e.amount,
                ]),
              ];
              downloadCSV(rows, `expenses-${new Date().toISOString().split("T")[0]}.csv`);
            }}
          >
            <Download className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Export CSV</span>
          </Button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20 hover-elevate h-10 px-3 sm:px-4">
              <Plus className="w-4 h-4 mr-1.5 shrink-0" /><span className="hidden sm:inline">Add </span>Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Record Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" {...form.register("date")} />
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input type="number" step="0.01" {...form.register("amount")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Controller
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input {...form.register("description")} placeholder="Brief description" />
              </div>
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input {...form.register("vendor")} placeholder="Vendor / payee name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Controller
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>{m.replace("_", " ").toUpperCase()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reference / UTR</Label>
                  <Input {...form.register("reference")} placeholder="Optional" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMut.isPending}>Save Expense</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold font-display">{formatCurrency(totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold font-display">{expenses?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg. per Record</p>
              <p className="text-2xl font-bold font-display">
                {expenses?.length ? formatCurrency(totalExpenses / expenses.length) : "₹0"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search expenses..."
          className="pl-9 h-11 rounded-xl bg-card border-border/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : expenses?.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                <Receipt className="w-8 h-8 text-primary/40" />
              </div>
              <p className="font-medium text-lg text-foreground">No expenses recorded</p>
              <p className="mb-4">Track your spending to see profit & loss.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Vendor</th>
                    <th className="px-6 py-3">Method</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {expenses?.map((exp) => (
                    <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground">{new Date(exp.date).toLocaleDateString("en-IN")}</td>
                      <td className="px-6 py-4">
                        <Badge className={`${CATEGORY_COLORS[exp.category] ?? "bg-slate-100 text-slate-700"} border-0 rounded-lg capitalize`}>{exp.category}</Badge>
                      </td>
                      <td className="px-6 py-4">{exp.description || "—"}</td>
                      <td className="px-6 py-4">{exp.vendor || "—"}</td>
                      <td className="px-6 py-4 text-muted-foreground capitalize">{exp.paymentMethod.replace("_", " ")}</td>
                      <td className="px-6 py-4 font-bold text-destructive">−{formatCurrency(exp.amount)}</td>
                      <td className="px-6 py-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(exp.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
