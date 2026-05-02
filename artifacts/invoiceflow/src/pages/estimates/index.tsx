import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListEstimates, useDeleteEstimate } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  converted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function EstimatesList() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { data: estimates, isLoading } = useListEstimates({ search: search || undefined });
  const deleteMut = useDeleteEstimate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this estimate?")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Estimate deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
        }
      });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Estimates</h1>
          <p className="text-muted-foreground mt-1">Quotes that convert to invoices in one click.</p>
        </div>
        <Button className="rounded-xl shadow-lg shadow-primary/20 hover-elevate" asChild>
          <Link href="/estimates/new"><Plus className="w-4 h-4 mr-2" /> New Estimate</Link>
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search estimates..."
          className="pl-9 h-11 rounded-xl bg-card border-border/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : estimates?.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-primary/40" />
              </div>
              <p className="font-medium text-lg text-foreground">No estimates yet</p>
              <p className="mb-4">Create a quote and share it with clients.</p>
              <Button asChild><Link href="/estimates/new"><Plus className="w-4 h-4 mr-2" />New Estimate</Link></Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium">
                  <tr>
                    <th className="px-6 py-3">Estimate #</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Valid Until</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {estimates?.map((est) => (
                    <tr
                      key={est.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setLocation(`/estimates/${est.id}`)}
                    >
                      <td className="px-6 py-4 font-medium text-primary">{est.estimateNumber}</td>
                      <td className="px-6 py-4">{est.customerName || "—"}</td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(est.estimateDate).toLocaleDateString("en-IN")}</td>
                      <td className="px-6 py-4 text-muted-foreground">{est.validUntil ? new Date(est.validUntil).toLocaleDateString("en-IN") : "—"}</td>
                      <td className="px-6 py-4 font-bold">{formatCurrency(est.total)}</td>
                      <td className="px-6 py-4">
                        <Badge className={`${STATUS_COLORS[est.status]} capitalize border-0 rounded-lg`}>{est.status}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        {est.convertedToInvoiceId ? (
                          <Button variant="ghost" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                            <Link href={`/invoices/${est.convertedToInvoiceId}`}>View Invoice</Link>
                          </Button>
                        ) : null}
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
