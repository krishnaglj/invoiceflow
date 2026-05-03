import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetInvoice, useGetBusinessProfile, useDeleteInvoice,
  useMarkInvoicePaid, useCreatePayment, useDeletePayment,
  useCreateCreditNoteFromInvoice,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { Printer, Share2, Edit, Trash2, CheckCircle, ChevronLeft, Plus, X, Bell, FileX } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function numberToWords(amount: number): string {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
    "Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function convertTens(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }
  function convertHundreds(n: number): string {
    if (n >= 100) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertTens(n % 100) : "");
    return convertTens(n);
  }
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = "";
  if (rupees >= 10000000) words += convertHundreds(Math.floor(rupees / 10000000)) + " Crore ";
  if (rupees % 10000000 >= 100000) words += convertHundreds(Math.floor((rupees % 10000000) / 100000)) + " Lakh ";
  if (rupees % 100000 >= 1000) words += convertHundreds(Math.floor((rupees % 100000) / 1000)) + " Thousand ";
  words += convertHundreds(rupees % 1000);
  let result = "INR " + words.trim();
  if (paise > 0) result += " and " + convertTens(paise) + " Paise";
  return result + " Only";
}

const HEADER_BG = "#1e293b";
const HEADER_COLOR = "#ffffff";
const BORDER = "1px solid #cbd5e1";
const ALT_ROW = "#f8fafc";

const cellStyle: React.CSSProperties = { border: BORDER, padding: "7px 10px", verticalAlign: "top", fontSize: 12 };
const thStyle: React.CSSProperties = { ...cellStyle, backgroundColor: HEADER_BG, color: HEADER_COLOR, fontWeight: 600, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };

const PAYMENT_METHODS = ["cash","upi","bank_transfer","cheque","card"] as const;

export default function InvoiceDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const invoiceId = parseInt(id || "0", 10);

  const { data: invoice, isLoading } = useGetInvoice(invoiceId, { query: { enabled: !!invoiceId } });
  const { data: profile } = useGetBusinessProfile();

  const deleteMut = useDeleteInvoice();
  const markPaidMut = useMarkInvoicePaid();
  const createPaymentMut = useCreatePayment();
  const deletePaymentMut = useDeletePayment();
  const createCNMut = useCreateCreditNoteFromInvoice();

  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payMethod, setPayMethod] = useState<typeof PAYMENT_METHODS[number]>("cash");
  const [payRef, setPayRef] = useState("");

  const handlePrint = () => window.print();
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied to clipboard!" });
  };
  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      deleteMut.mutate({ id: invoiceId }, {
        onSuccess: () => {
          toast({ title: "Invoice deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
          setLocation("/invoices");
        },
      });
    }
  };
  const handleMarkPaid = () => {
    markPaidMut.mutate({ id: invoiceId }, {
      onSuccess: () => {
        toast({ title: "Invoice marked as paid!" });
        queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      },
    });
  };

  const handleAddPayment = () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    createPaymentMut.mutate(
      { invoiceId, data: { invoiceId, amount: amt, date: payDate, method: payMethod, reference: payRef || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Payment recorded!" });
          queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}`] });
          queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
          setPayOpen(false);
          setPayAmount("");
          setPayRef("");
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      },
    );
  };

  const handleDeletePayment = (paymentId: number) => {
    if (!confirm("Remove this payment?")) return;
    deletePaymentMut.mutate({ invoiceId, paymentId }, {
      onSuccess: () => {
        toast({ title: "Payment removed" });
        queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      },
    });
  };

  if (isLoading || !invoice || !profile) return <div className="p-8 text-center">Loading...</div>;

  const supplyType = invoice.supplyType ?? "intra";
  const discountAmount = invoice.discountValue > 0
    ? invoice.discountType === "percent"
      ? invoice.subtotal * (invoice.discountValue / 100)
      : invoice.discountValue
    : 0;
  const taxableAmount = invoice.subtotal - discountAmount;
  const halfTax = invoice.taxPercent / 2;
  const cgstAmount = supplyType === "intra" ? invoice.taxAmount / 2 : 0;
  const sgstAmount = supplyType === "intra" ? invoice.taxAmount / 2 : 0;
  const igstAmount = supplyType === "inter" ? invoice.taxAmount : 0;

  const upiValue = profile.upiId
    ? `upi://pay?pa=${profile.upiId}&pn=${encodeURIComponent(profile.shopName)}&cu=INR`
    : null;
  const totalQty = invoice.items.reduce((s, it) => s + it.quantity, 0);
  const remaining = invoice.total - invoice.paidAmount;

  return (
    <div className="bg-muted/20 min-h-screen pb-20 print:min-h-0 print:pb-0 print:bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          html, body { height: auto !important; overflow: visible !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── ACTION BAR ── */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b px-3 sm:px-4 py-3 flex items-center justify-between no-print shadow-sm gap-2">
        <Button variant="ghost" className="rounded-xl shrink-0" onClick={() => window.history.back()}>
          <ChevronLeft className="w-5 h-5 sm:mr-1" /><span className="hidden sm:inline">Back</span>
        </Button>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {invoice.status !== "paid" && (
            <Button variant="outline" size="sm" className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={handleMarkPaid} disabled={markPaidMut.isPending}>
              <CheckCircle className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Mark Paid</span>
            </Button>
          )}
          {/* Record partial payment */}
          {invoice.status !== "paid" && (
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Plus className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Record Payment</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm rounded-2xl">
                <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="p-3 rounded-xl bg-muted/50 text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{formatCurrency(invoice.total)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="font-semibold text-emerald-600">{formatCurrency(invoice.paidAmount)}</span></div>
                    <div className="flex justify-between border-t pt-1"><span className="font-medium">Remaining</span><span className="font-bold text-primary">{formatCurrency(remaining)}</span></div>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₹) *</Label>
                    <Input
                      type="number" step="0.01"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder={formatCurrency(remaining)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select value={payMethod} onValueChange={(v) => setPayMethod(v as any)}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace("_", " ").toUpperCase()}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reference / UTR</Label>
                    <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Optional" />
                  </div>
                  <Button className="w-full" onClick={handleAddPayment} disabled={createPaymentMut.isPending}>Save Payment</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setLocation(`/invoices/${invoiceId}/edit`)}>
            <Edit className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Edit</span>
          </Button>
          <Button
            variant="outline" size="sm"
            className="rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50"
            onClick={() => createCNMut.mutate(invoiceId, {
              onSuccess: (cn: any) => { toast({ title: "Credit note created" }); setLocation(`/credit-notes/${cn.id}`); },
              onError: () => toast({ title: "Error creating credit note", variant: "destructive" }),
            })}
            disabled={createCNMut.isPending}
          >
            <FileX className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Credit Note</span>
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={handlePrint}>
            <Printer className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Print</span>
          </Button>
          {invoice.status !== "paid" && (invoice as any).customerPhone && (
            <a
              href={`https://wa.me/${((invoice as any).customerPhone as string).replace(/\D/g, "")}?text=${encodeURIComponent(
                [
                  `*Payment Reminder* 🔔`,
                  ``,
                  `Hi ${invoice.customerName || "there"},`,
                  ``,
                  `This is a friendly reminder for Invoice *${invoice.invoiceNumber}*.`,
                  ``,
                  `💰 Outstanding: ₹${(invoice.total - invoice.paidAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                  invoice.dueDate ? `📅 Due: ${formatDate(invoice.dueDate)}` : null,
                  ``,
                  `Please make payment at your earliest convenience. Thank you!`,
                  ``,
                  `— ${profile?.shopName ?? ""}`,
                ].filter(Boolean).join("\n")
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm" className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Bell className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Remind</span>
              </Button>
            </a>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl shadow-lg shadow-primary/20">
                <Share2 className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Share</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader><DialogTitle>Share Invoice</DialogTitle></DialogHeader>
              <div className="flex flex-col gap-3 py-4">
                <Button variant="outline" className="h-14 justify-start text-lg rounded-xl" asChild>
                  <a href={`whatsapp://send?text=Here is your invoice ${invoice.invoiceNumber}: ${window.location.href}`} target="_blank" rel="noreferrer">
                    <svg className="w-6 h-6 mr-4 text-emerald-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.405-.883-.733-1.48-1.638-1.653-1.935-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    Send via WhatsApp
                  </a>
                </Button>
                <Button variant="outline" className="h-14 justify-start text-lg rounded-xl" onClick={handleCopyLink}>
                  <Share2 className="w-6 h-6 mr-4" /> Copy Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 rounded-xl" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── PAYMENT HISTORY (screen only) ── */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="max-w-[210mm] mx-auto mt-4 no-print">
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Payment History</h3>
                <div className="text-sm">
                  <span className="text-muted-foreground">Balance: </span>
                  <span className={`font-bold ${remaining <= 0 ? "text-emerald-600" : "text-primary"}`}>{formatCurrency(remaining)}</span>
                </div>
              </div>
              <div className="space-y-2">
                {invoice.payments.map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{formatCurrency(pay.amount)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(pay.date).toLocaleDateString("en-IN")} · {pay.method.replace("_", " ").toUpperCase()}{pay.reference ? ` · ${pay.reference}` : ""}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeletePayment(pay.id)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── PRINTABLE INVOICE ── */}
      <div className="max-w-[210mm] mx-auto mt-6 print:mt-0 bg-white shadow-2xl print:shadow-none border print:border-0" style={{ fontFamily: "Arial, sans-serif", color: "#000" }}>
        <div className="p-8 print:p-8">

          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div style={{ flex: 1 }}>
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt="Logo" style={{ maxHeight: 52, maxWidth: 160, objectFit: "contain", marginBottom: 6 }} />
              ) : (
                <div style={{ width: 44, height: 44, background: HEADER_BG, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 20, marginBottom: 6, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                  {profile.shopName.charAt(0)}
                </div>
              )}
              <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>{profile.shopName}</div>
              {profile.gstin && <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>GSTIN {profile.gstin}</div>}
              <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{[profile.address, profile.city].filter(Boolean).join(", ")}</div>
              <div style={{ fontSize: 11, color: "#555" }}>{[profile.state, profile.pincode].filter(Boolean).join(", ")}</div>
              {profile.phone && <div style={{ fontSize: 11, color: "#555" }}>Mobile {profile.phone}</div>}
              {profile.email && <div style={{ fontSize: 11, color: "#555" }}>Email {profile.email}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase" }}>Tax Invoice</div>
              <div style={{ fontSize: 10, color: "#888", marginTop: 3, textTransform: "uppercase", letterSpacing: 1 }}>Original for Recipient</div>
              <div className="no-print" style={{ marginTop: 10 }}>
                <StatusBadge status={invoice.status} />
              </div>
            </div>
          </div>

          <div style={{ borderTop: "2.5px solid #000", margin: "10px 0 8px" }} />

          {/* META */}
          <div style={{ display: "flex", gap: 24, fontSize: 12, marginBottom: 4, flexWrap: "wrap" }}>
            <div><span style={{ color: "#666" }}>Invoice #:</span> <strong>{invoice.invoiceNumber}</strong></div>
            <div><span style={{ color: "#666" }}>Invoice Date:</span> <strong>{formatDate(invoice.invoiceDate)}</strong></div>
            {invoice.dueDate && <div><span style={{ color: "#666" }}>Due Date:</span> <strong>{formatDate(invoice.dueDate)}</strong></div>}
            {invoice.placeOfSupply && <div><span style={{ color: "#666" }}>Place of Supply:</span> <strong>{invoice.placeOfSupply}</strong></div>}
          </div>

          <div style={{ borderTop: "1px solid #ddd", margin: "8px 0" }} />

          {/* BILL TO */}
          <div style={{ marginBottom: 14, fontSize: 12 }}>
            <div style={{ color: "#888", marginBottom: 3 }}>Bill To:</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{invoice.customerName}</div>
            {invoice.customerGstin && <div style={{ fontWeight: 600 }}>GSTIN: {invoice.customerGstin}</div>}
            {invoice.customerPhone && <div style={{ color: "#444" }}>Ph: {invoice.customerPhone}</div>}
            {invoice.customerAddress && <div style={{ color: "#444" }}>{invoice.customerAddress}</div>}
            {(invoice.customerCity || invoice.customerState) && (
              <div style={{ color: "#444" }}>{[invoice.customerCity, invoice.customerState].filter(Boolean).join(", ")}</div>
            )}
            {invoice.customerEmail && <div style={{ color: "#444" }}>{invoice.customerEmail}</div>}
          </div>

          {/* ITEMS TABLE */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "center", width: 28 }}>#</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Description</th>
                <th style={{ ...thStyle, textAlign: "left", width: 70 }}>HSN/SAC</th>
                <th style={{ ...thStyle, textAlign: "right", width: 60 }}>Qty</th>
                <th style={{ ...thStyle, textAlign: "right", width: 80 }}>Rate</th>
                <th style={{ ...thStyle, textAlign: "right", width: 40 }}>GST%</th>
                <th style={{ ...thStyle, textAlign: "right", width: 90 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} style={i % 2 !== 0 ? { backgroundColor: ALT_ROW, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } : {}}>
                  <td style={{ ...cellStyle, textAlign: "center", color: "#888" }}>{i + 1}</td>
                  <td style={{ ...cellStyle }}>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    {item.description && <div style={{ color: "#777", fontSize: 11, marginTop: 2 }}>{item.description}</div>}
                  </td>
                  <td style={{ ...cellStyle, color: "#666" }}>{item.hsnCode || "—"}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{item.quantity} {item.unit}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{formatCurrency(item.rate)}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{item.taxRate}%</td>
                  <td style={{ ...cellStyle, textAlign: "right", fontWeight: 600 }}>{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* SUMMARY ROW */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
            <tbody>
              <tr>
                <td style={{ ...cellStyle, borderTop: "none", color: "#555", fontSize: 11 }}>
                  Total Items / Qty : {invoice.items.length} / {totalQty.toFixed(2)}
                </td>
                <td style={{ ...cellStyle, borderTop: "none", fontSize: 11, fontStyle: "italic", color: "#555" }}>
                  Total amount (in words): <strong style={{ color: "#000", fontStyle: "normal" }}>{numberToWords(invoice.total)}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          {/* TOTALS */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 0, marginBottom: 16 }}>
            <table style={{ borderCollapse: "collapse", minWidth: 260 }}>
              <tbody>
                <tr>
                  <td style={{ ...cellStyle, borderTop: "none", color: "#555" }}>Taxable Amount</td>
                  <td style={{ ...cellStyle, borderTop: "none", textAlign: "right", fontWeight: 600 }}>{formatCurrency(taxableAmount)}</td>
                </tr>
                {discountAmount > 0 && (
                  <tr>
                    <td style={{ ...cellStyle, color: "#555" }}>Discount {invoice.discountType === "percent" ? `(${invoice.discountValue}%)` : ""}</td>
                    <td style={{ ...cellStyle, textAlign: "right", color: "#16a34a", fontWeight: 600 }}>−{formatCurrency(discountAmount)}</td>
                  </tr>
                )}
                {invoice.taxPercent > 0 && supplyType === "intra" && (
                  <>
                    <tr>
                      <td style={{ ...cellStyle, color: "#555" }}>CGST {halfTax}%</td>
                      <td style={{ ...cellStyle, textAlign: "right", fontWeight: 600 }}>{formatCurrency(cgstAmount)}</td>
                    </tr>
                    <tr>
                      <td style={{ ...cellStyle, color: "#555" }}>SGST {halfTax}%</td>
                      <td style={{ ...cellStyle, textAlign: "right", fontWeight: 600 }}>{formatCurrency(sgstAmount)}</td>
                    </tr>
                  </>
                )}
                {invoice.taxPercent > 0 && supplyType === "inter" && (
                  <tr>
                    <td style={{ ...cellStyle, color: "#555" }}>IGST {invoice.taxPercent}%</td>
                    <td style={{ ...cellStyle, textAlign: "right", fontWeight: 600 }}>{formatCurrency(igstAmount)}</td>
                  </tr>
                )}
                {invoice.paidAmount > 0 && invoice.status !== "paid" && (
                  <tr>
                    <td style={{ ...cellStyle, color: "#16a34a" }}>Amount Received</td>
                    <td style={{ ...cellStyle, textAlign: "right", color: "#16a34a", fontWeight: 600 }}>−{formatCurrency(invoice.paidAmount)}</td>
                  </tr>
                )}
                <tr style={{ backgroundColor: HEADER_BG, color: HEADER_COLOR, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                  <td style={{ ...cellStyle, fontWeight: 700, fontSize: 14, border: "1px solid #1e293b", backgroundColor: HEADER_BG, color: HEADER_COLOR, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                    {invoice.status === "partial" ? "Balance Due" : "Total"}
                  </td>
                  <td style={{ ...cellStyle, fontWeight: 800, fontSize: 16, textAlign: "right", border: "1px solid #1e293b", backgroundColor: HEADER_BG, color: HEADER_COLOR, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                    {formatCurrency(invoice.status === "partial" ? remaining : invoice.total)}
                  </td>
                </tr>
                {(invoice as any).tdsRate > 0 && (
                  <>
                    <tr>
                      <td style={{ ...cellStyle, color: "#92400e" }}>Less: TDS @{(invoice as any).tdsRate}% (u/s 194C/194J)</td>
                      <td style={{ ...cellStyle, textAlign: "right", color: "#b45309", fontWeight: 600 }}>−{formatCurrency((invoice as any).tdsAmount)}</td>
                    </tr>
                    <tr style={{ backgroundColor: "#f0fdf4", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                      <td style={{ ...cellStyle, fontWeight: 700, fontSize: 13, backgroundColor: "#f0fdf4", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>Net Payable (after TDS)</td>
                      <td style={{ ...cellStyle, fontWeight: 800, fontSize: 15, textAlign: "right", color: "#16a34a", backgroundColor: "#f0fdf4", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                        {formatCurrency(invoice.total - (invoice as any).tdsAmount)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* PAYMENT SECTION */}
          {invoice.showBankDetails && (
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, pageBreakInside: "avoid" }}>
              <tbody>
                <tr>
                  {upiValue && (
                    <td style={{ ...cellStyle, width: 120, verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6 }}>Pay using UPI:</div>
                      <QRCodeSVG value={upiValue} size={88} />
                      {profile.upiId && <div style={{ fontSize: 10, color: "#555", marginTop: 4, wordBreak: "break-all" }}>{profile.upiId}</div>}
                    </td>
                  )}
                  <td style={{ ...cellStyle, verticalAlign: "top" }}>
                    <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 6 }}>Bank Details:</div>
                    <table style={{ fontSize: 11, borderCollapse: "collapse" }}>
                      <tbody>
                        {profile.bankName && <tr><td style={{ color: "#666", paddingRight: 8, paddingBottom: 2 }}>Bank:</td><td style={{ fontWeight: 600 }}>{profile.bankName}</td></tr>}
                        {profile.accountNumber && <tr><td style={{ color: "#666", paddingRight: 8, paddingBottom: 2 }}>Account #:</td><td style={{ fontWeight: 600 }}>{profile.accountNumber}</td></tr>}
                        {profile.ifscCode && <tr><td style={{ color: "#666", paddingRight: 8, paddingBottom: 2 }}>IFSC:</td><td style={{ fontWeight: 600 }}>{profile.ifscCode}</td></tr>}
                        {profile.accountHolder && <tr><td style={{ color: "#666", paddingRight: 8 }}>Name:</td><td style={{ fontWeight: 600 }}>{profile.accountHolder}</td></tr>}
                      </tbody>
                    </table>
                  </td>
                  <td style={{ ...cellStyle, width: 130, textAlign: "right", verticalAlign: "bottom" }}>
                    <div style={{ fontSize: 11, color: "#666" }}>For</div>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{profile.shopName}</div>
                    <div style={{ marginTop: 40, borderTop: "1px solid #aaa", paddingTop: 4, fontSize: 10, color: "#666" }}>Authorized Signatory</div>
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* NOTES */}
          <div style={{ pageBreakInside: "avoid" }}>
            {invoice.notes && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}>Notes:</div>
                <div style={{ fontSize: 11, color: "#555", whiteSpace: "pre-line" }}>{invoice.notes}</div>
              </div>
            )}
            {invoice.paymentTerms && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}>Terms and Conditions:</div>
                <div style={{ fontSize: 11, color: "#555", whiteSpace: "pre-line" }}>{invoice.paymentTerms}</div>
              </div>
            )}
            <div style={{ borderTop: "1px dashed #ddd", marginTop: 12, paddingTop: 10, textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>Thank you for your business!</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>We appreciate your trust and look forward to working with you again.</div>
            </div>
            <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 12, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 10, color: "#999" }}>Page 1 / 1</div>
              <div style={{ fontSize: 10, color: "#999", fontStyle: "italic" }}>This is a digitally signed document.</div>
            </div>
            <div style={{ textAlign: "center", marginTop: 6 }}>
              <span style={{ fontSize: 10, color: "#bbb" }}>Made with </span>
              <span style={{ fontSize: 10, color: "#e11d48" }}>❤️</span>
              <span style={{ fontSize: 10, color: "#bbb" }}> by InvoiceFlow</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
