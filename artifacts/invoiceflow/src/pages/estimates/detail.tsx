import { useParams, useLocation } from "wouter";
import { useGetEstimate, useGetBusinessProfile, useDeleteEstimate, useUpdateEstimate, useConvertEstimate } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, ChevronLeft, ArrowRightLeft, CheckCircle, XCircle, Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  converted: "bg-purple-100 text-purple-700",
};

export default function EstimateDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const estimateId = parseInt(id || "0", 10);

  const { data: estimate, isLoading } = useGetEstimate(estimateId, { query: { enabled: !!estimateId } });
  const { data: profile } = useGetBusinessProfile();
  const deleteMut = useDeleteEstimate();
  const updateMut = useUpdateEstimate();
  const convertMut = useConvertEstimate();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!estimate) return <div className="p-8 text-center text-destructive">Estimate not found.</div>;

  const handleDelete = () => {
    if (confirm("Delete this estimate?")) {
      deleteMut.mutate({ id: estimateId }, {
        onSuccess: () => {
          toast({ title: "Estimate deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
          setLocation("/estimates");
        }
      });
    }
  };

  const handleStatusChange = (newStatus: string) => {
    updateMut.mutate({ id: estimateId, data: { status: newStatus as any } }, {
      onSuccess: () => {
        toast({ title: `Marked as ${newStatus}` });
        queryClient.invalidateQueries({ queryKey: [`/api/estimates/${estimateId}`] });
      }
    });
  };

  const handleConvert = () => {
    if (confirm("Convert this estimate to an invoice?")) {
      convertMut.mutate({ id: estimateId }, {
        onSuccess: (result) => {
          toast({ title: "Invoice created!", description: result.invoiceNumber });
          queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
          queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
          setLocation(`/invoices/${result.invoiceId}`);
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    }
  };

  const supplyType = estimate.supplyType ?? "intra";
  const taxAmount = estimate.taxAmount;
  const cgst = supplyType === "intra" ? taxAmount / 2 : 0;
  const sgst = supplyType === "intra" ? taxAmount / 2 : 0;
  const igst = supplyType === "inter" ? taxAmount : 0;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/estimates")} className="self-start -ml-2">
          <ChevronLeft className="w-4 h-4 mr-1" /> All Estimates
        </Button>
        <div className="flex flex-wrap gap-2">
          {estimate.status !== "converted" && (
            <>
              {estimate.status === "draft" && (
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleStatusChange("sent")}>
                  <Send className="w-4 h-4 mr-2" /> Mark Sent
                </Button>
              )}
              {estimate.status === "sent" && (
                <>
                  <Button variant="outline" size="sm" className="rounded-xl text-emerald-600 border-emerald-200" onClick={() => handleStatusChange("accepted")}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Mark Accepted
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl text-destructive border-destructive/20" onClick={() => handleStatusChange("rejected")}>
                    <XCircle className="w-4 h-4 mr-2" /> Mark Rejected
                  </Button>
                </>
              )}
              {(estimate.status === "accepted" || estimate.status === "sent") && (
                <Button size="sm" className="rounded-xl shadow-md shadow-primary/20" onClick={handleConvert} disabled={convertMut.isPending}>
                  <ArrowRightLeft className="w-4 h-4 mr-2" /> Convert to Invoice
                </Button>
              )}
              <Button variant="outline" size="sm" className="rounded-xl" asChild>
                <Link href={`/estimates/${estimateId}/edit`}><Edit className="w-4 h-4 mr-2" /> Edit</Link>
              </Button>
            </>
          )}
          {estimate.status === "converted" && estimate.convertedToInvoiceId && (
            <Button variant="outline" size="sm" className="rounded-xl text-purple-600" asChild>
              <Link href={`/invoices/${estimate.convertedToInvoiceId}`}>View Invoice →</Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" className="rounded-xl text-destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8">
            <div>
              <h1 className="text-2xl font-display font-bold">{profile?.shopName || "Your Business"}</h1>
              {profile?.address && <p className="text-sm text-muted-foreground mt-1">{profile.address}</p>}
              {profile?.gstin && <p className="text-sm text-muted-foreground">GSTIN: {profile.gstin}</p>}
              {profile?.phone && <p className="text-sm text-muted-foreground">{profile.phone}</p>}
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2">
                <h2 className="text-3xl font-display font-bold text-primary">ESTIMATE</h2>
                <Badge className={`${STATUS_COLORS[estimate.status]} border-0 capitalize`}>{estimate.status}</Badge>
              </div>
              <p className="text-muted-foreground mt-1">#{estimate.estimateNumber}</p>
              <p className="text-sm mt-1">Date: <span className="font-medium">{new Date(estimate.estimateDate).toLocaleDateString("en-IN")}</span></p>
              {estimate.validUntil && <p className="text-sm text-amber-600">Valid Until: {new Date(estimate.validUntil).toLocaleDateString("en-IN")}</p>}
            </div>
          </div>

          {/* Bill To */}
          {estimate.customerName && (
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Bill To</p>
              <p className="font-bold text-lg">{estimate.customerName}</p>
              {estimate.customerAddress && <p className="text-sm text-muted-foreground">{estimate.customerAddress}</p>}
              {estimate.customerGstin && <p className="text-sm text-muted-foreground">GSTIN: {estimate.customerGstin}</p>}
              {estimate.customerPhone && <p className="text-sm text-muted-foreground">{estimate.customerPhone}</p>}
            </div>
          )}

          {/* Items */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">HSN/SAC</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">GST%</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {estimate.items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 1 ? "bg-slate-50 dark:bg-muted/20" : ""}>
                    <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.name}</p>
                      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.hsnCode || "—"}</td>
                    <td className="px-4 py-3 text-right">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.rate)}</td>
                    <td className="px-4 py-3 text-right">{item.taxRate}%</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-1 text-sm">
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(estimate.subtotal)}</span>
              </div>
              {estimate.discountValue > 0 && (
                <div className="flex justify-between py-1.5 border-b text-destructive">
                  <span>Discount ({estimate.discountType === "percent" ? `${estimate.discountValue}%` : "flat"})</span>
                  <span>−{formatCurrency(estimate.discountType === "percent" ? estimate.subtotal * estimate.discountValue / 100 : estimate.discountValue)}</span>
                </div>
              )}
              {supplyType === "intra" ? (
                <>
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-muted-foreground">CGST ({estimate.taxPercent / 2}%)</span>
                    <span>{formatCurrency(cgst)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-muted-foreground">SGST ({estimate.taxPercent / 2}%)</span>
                    <span>{formatCurrency(sgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">IGST ({estimate.taxPercent}%)</span>
                  <span>{formatCurrency(igst)}</span>
                </div>
              )}
              <div className="flex justify-between py-2.5 font-bold text-base border-t-2 border-foreground">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(estimate.total)}</span>
              </div>
            </div>
          </div>

          {estimate.notes && (
            <div className="mt-8 pt-6 border-t">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{estimate.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
