import { useParams, useLocation } from "wouter";
import { useGetInvoice, useGetBusinessProfile, useDeleteInvoice, useMarkInvoicePaid } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Printer, Share2, Edit, Trash2, CheckCircle, ChevronLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

function numberToWords(amount: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

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
        }
      });
    }
  };

  const handleMarkPaid = () => {
    markPaidMut.mutate({ id: invoiceId }, {
      onSuccess: () => {
        toast({ title: "Invoice marked as paid!" });
        queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}`] });
      }
    });
  };

  if (isLoading || !invoice || !profile) return <div className="p-8">Loading...</div>;

  const taxableAmount = invoice.subtotal - (
    invoice.discountValue > 0
      ? invoice.discountType === "percent"
        ? invoice.subtotal * (invoice.discountValue / 100)
        : invoice.discountValue
      : 0
  );
  const halfTax = invoice.taxPercent / 2;
  const cgstAmount = invoice.taxAmount / 2;
  const sgstAmount = invoice.taxAmount / 2;
  const upiValue = profile.upiId
    ? `upi://pay?pa=${profile.upiId}&pn=${encodeURIComponent(profile.shopName)}&cu=INR`
    : null;

  return (
    <div className="bg-muted/20 min-h-screen pb-20 print:min-h-0 print:pb-0 print:bg-white">
      {/* Action Bar */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b px-3 sm:px-4 py-3 flex items-center justify-between no-print shadow-sm gap-2">
        <Button variant="ghost" className="rounded-xl shrink-0" onClick={() => window.history.back()}>
          <ChevronLeft className="w-5 h-5 sm:mr-1" /><span className="hidden sm:inline">Back</span>
        </Button>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {invoice.status !== "paid" && (
            <Button variant="outline" size="icon" className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 sm:w-auto sm:px-3 sm:gap-2" onClick={handleMarkPaid} disabled={markPaidMut.isPending} title="Mark Paid">
              <CheckCircle className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Mark Paid</span>
            </Button>
          )}
          <Button variant="outline" size="icon" className="rounded-xl sm:w-auto sm:px-3 sm:gap-2" onClick={() => setLocation(`/invoices/${invoiceId}/edit`)} title="Edit">
            <Edit className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Edit</span>
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl sm:w-auto sm:px-3 sm:gap-2" onClick={handlePrint} title="Print PDF">
            <Printer className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Print PDF</span>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" className="rounded-xl shadow-lg shadow-primary/20 sm:w-auto sm:px-3 sm:gap-2" title="Share">
                <Share2 className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Share</span>
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
          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 rounded-xl ml-2" onClick={handleDelete}>
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Printable Invoice */}
      <div className="max-w-[210mm] mx-auto mt-6 print:mt-0 bg-white shadow-2xl print:shadow-none border print:border-0 text-black text-sm" style={{ fontFamily: "'Arial', sans-serif" }}>
        <div className="p-8 print:p-8">

          {/* ── HEADER ── */}
          <div className="flex justify-between items-start mb-1">
            <div className="flex-1">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt="Logo" className="max-h-14 max-w-[160px] object-contain mb-2" />
              ) : (
                <div className="w-12 h-12 bg-indigo-700 rounded flex items-center justify-center text-white font-bold text-xl mb-2">
                  {profile.shopName.charAt(0)}
                </div>
              )}
              <p className="font-bold text-xl text-black leading-tight">{profile.shopName}</p>
              {profile.gstin && <p className="text-xs text-gray-600 mt-0.5">GSTIN {profile.gstin}</p>}
              <p className="text-xs text-gray-600 mt-0.5">{[profile.address, profile.city].filter(Boolean).join(", ")}</p>
              <p className="text-xs text-gray-600">{[profile.state, profile.pincode].filter(Boolean).join(", ")}</p>
              {profile.phone && <p className="text-xs text-gray-600">Mobile {profile.phone}</p>}
              {profile.email && <p className="text-xs text-gray-600">Email {profile.email}</p>}
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-black uppercase tracking-wide">Tax Invoice</p>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">Original for Recipient</p>
              <div className="mt-3 no-print">
                <StatusBadge status={invoice.status} />
              </div>
            </div>
          </div>

          <div className="border-t-2 border-black mt-3 mb-3" />

          {/* ── INVOICE META ── */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
            <div>
              <span className="text-gray-500">Invoice #:</span>
              <span className="font-bold ml-1 text-black">{invoice.invoiceNumber}</span>
            </div>
            <div>
              <span className="text-gray-500">Invoice Date:</span>
              <span className="font-bold ml-1 text-black">{formatDate(invoice.invoiceDate)}</span>
            </div>
            {invoice.dueDate && (
              <div>
                <span className="text-gray-500">Due Date:</span>
                <span className="font-bold ml-1 text-black">{formatDate(invoice.dueDate)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-300 mb-3" />

          {/* ── BILL TO ── */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Bill To:</p>
              <p className="font-bold text-black text-sm">{invoice.customerName}</p>
              {invoice.customerGstin && <p className="text-xs font-semibold text-gray-800">GSTIN: {invoice.customerGstin}</p>}
              {invoice.customerPhone && <p className="text-xs text-gray-600">Ph: {invoice.customerPhone}</p>}
              {invoice.customerAddress && <p className="text-xs text-gray-600 mt-0.5">{invoice.customerAddress}</p>}
              {(invoice.customerCity || invoice.customerState) && (
                <p className="text-xs text-gray-600">{[invoice.customerCity, invoice.customerState].filter(Boolean).join(", ")}</p>
              )}
              {invoice.customerEmail && <p className="text-xs text-gray-600">{invoice.customerEmail}</p>}
            </div>
          </div>

          {/* ── ITEMS TABLE ── */}
          <table className="w-full text-xs border-collapse mb-0">
            <thead>
              <tr style={{ backgroundColor: "#1e293b", color: "#fff" }}>
                <th className="py-2 px-3 text-left font-semibold w-8">#</th>
                <th className="py-2 px-3 text-left font-semibold">Description</th>
                <th className="py-2 px-3 text-right font-semibold w-16">Qty</th>
                <th className="py-2 px-3 text-right font-semibold w-24">Rate</th>
                <th className="py-2 px-3 text-right font-semibold w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td className="py-2.5 px-3 text-gray-500 align-top">{i + 1}</td>
                  <td className="py-2.5 px-3 align-top">
                    <p className="font-semibold text-black">{item.name}</p>
                    {item.description && <p className="text-gray-500 mt-0.5 text-xs">{item.description}</p>}
                  </td>
                  <td className="py-2.5 px-3 text-right align-top text-gray-700">{item.quantity} {item.unit}</td>
                  <td className="py-2.5 px-3 text-right align-top text-gray-700">{formatCurrency(item.rate)}</td>
                  <td className="py-2.5 px-3 text-right align-top font-medium text-black">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── SUMMARY ROW ── */}
          <div className="border border-gray-300 border-t-0 flex justify-between items-center px-3 py-2 text-xs text-gray-600 mb-0">
            <span>Total Items / Qty : {invoice.items.length} / {invoice.items.reduce((s, it) => s + it.quantity, 0).toFixed(3)}</span>
            <span className="italic text-gray-500 text-center flex-1 mx-4 hidden sm:block">
              Total amount (in words): <strong className="text-black not-italic">{numberToWords(invoice.total)}</strong>
            </span>
          </div>

          {/* Amount in words (mobile) */}
          <div className="border border-gray-300 border-t-0 px-3 py-2 text-xs text-gray-600 sm:hidden">
            <span className="italic">Total (in words): </span>
            <strong className="text-black not-italic">{numberToWords(invoice.total)}</strong>
          </div>

          {/* ── TOTALS ── */}
          <div className="flex justify-end mb-4">
            <div className="w-64">
              <div className="border border-gray-300 border-t-0">
                <div className="flex justify-between px-3 py-1.5 border-b border-gray-200 text-xs">
                  <span className="text-gray-600">Taxable Amount</span>
                  <span className="font-medium text-black">{formatCurrency(taxableAmount)}</span>
                </div>
                {invoice.discountValue > 0 && (
                  <div className="flex justify-between px-3 py-1.5 border-b border-gray-200 text-xs">
                    <span className="text-gray-600">
                      Discount {invoice.discountType === "percent" ? `(${invoice.discountValue}%)` : ""}
                    </span>
                    <span className="font-medium text-emerald-700">
                      -{formatCurrency(invoice.discountType === "percent"
                        ? invoice.subtotal * (invoice.discountValue / 100)
                        : invoice.discountValue)}
                    </span>
                  </div>
                )}
                {invoice.taxPercent > 0 && (
                  <>
                    <div className="flex justify-between px-3 py-1.5 border-b border-gray-200 text-xs">
                      <span className="text-gray-600">CGST {halfTax}%</span>
                      <span className="font-medium text-black">{formatCurrency(cgstAmount)}</span>
                    </div>
                    <div className="flex justify-between px-3 py-1.5 border-b border-gray-200 text-xs">
                      <span className="text-gray-600">SGST {halfTax}%</span>
                      <span className="font-medium text-black">{formatCurrency(sgstAmount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between px-3 py-2.5 items-center" style={{ backgroundColor: "#1e293b", color: "#fff" }}>
                  <span className="font-bold text-sm">Total</span>
                  <span className="font-black text-base">{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── PAYMENT SECTION ── */}
          {invoice.showBankDetails && (
            <div className="border border-gray-300 rounded-sm mb-4" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
              <div className="flex gap-0 divide-x divide-gray-300">
                {upiValue && (
                  <div className="p-3 flex flex-col items-center gap-1 w-28 shrink-0">
                    <p className="text-xs font-bold text-black mb-1">Pay using UPI:</p>
                    <QRCodeSVG value={upiValue} size={80} />
                    {profile.upiId && <p className="text-xs text-gray-600 text-center break-all mt-1">{profile.upiId}</p>}
                  </div>
                )}
                <div className="p-3 flex-1">
                  <p className="text-xs font-bold text-black mb-2">Bank Details:</p>
                  <div className="space-y-0.5 text-xs">
                    {profile.bankName && (
                      <p><span className="text-gray-500 w-20 inline-block">Bank:</span><span className="font-semibold text-black">{profile.bankName}</span></p>
                    )}
                    {profile.accountNumber && (
                      <p><span className="text-gray-500 w-20 inline-block">Account #:</span><span className="font-semibold text-black">{profile.accountNumber}</span></p>
                    )}
                    {profile.ifscCode && (
                      <p><span className="text-gray-500 w-20 inline-block">IFSC:</span><span className="font-semibold text-black">{profile.ifscCode}</span></p>
                    )}
                    {profile.accountHolder && (
                      <p><span className="text-gray-500 w-20 inline-block">Name:</span><span className="font-semibold text-black">{profile.accountHolder}</span></p>
                    )}
                  </div>
                </div>
                <div className="p-3 flex flex-col items-end justify-between w-36 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">For</p>
                    <p className="text-xs font-bold text-black">{profile.shopName}</p>
                  </div>
                  <div className="text-right mt-8">
                    <div className="border-t border-gray-400 pt-1 w-24 ml-auto">
                      <p className="text-xs text-gray-500">Authorized Signatory</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── NOTES & TERMS ── */}
          <div style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
            {invoice.notes && (
              <div className="mb-3">
                <p className="text-xs font-bold text-black mb-0.5">Notes:</p>
                <p className="text-xs text-gray-600 whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}
            {invoice.paymentTerms && (
              <div className="mb-3">
                <p className="text-xs font-bold text-black mb-0.5">Terms and Conditions:</p>
                <p className="text-xs text-gray-600 whitespace-pre-line">{invoice.paymentTerms}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center">
              <p className="text-xs text-gray-400">Page 1 / 1</p>
              <p className="text-xs text-gray-400">This is a digitally signed document.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
