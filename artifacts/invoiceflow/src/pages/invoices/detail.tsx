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

const HEADER_BG = "#1e293b";
const HEADER_COLOR = "#ffffff";
const BORDER = "1px solid #cbd5e1";
const ALT_ROW = "#f8fafc";

const cellStyle: React.CSSProperties = {
  border: BORDER,
  padding: "7px 10px",
  verticalAlign: "top",
  fontSize: 12,
};
const thStyle: React.CSSProperties = {
  ...cellStyle,
  backgroundColor: HEADER_BG,
  color: HEADER_COLOR,
  fontWeight: 600,
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
};

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

  const discountAmount = invoice.discountValue > 0
    ? invoice.discountType === "percent"
      ? invoice.subtotal * (invoice.discountValue / 100)
      : invoice.discountValue
    : 0;
  const taxableAmount = invoice.subtotal - discountAmount;
  const halfTax = invoice.taxPercent / 2;
  const cgstAmount = invoice.taxAmount / 2;
  const sgstAmount = invoice.taxAmount / 2;
  const upiValue = profile.upiId
    ? `upi://pay?pa=${profile.upiId}&pn=${encodeURIComponent(profile.shopName)}&cu=INR`
    : null;
  const totalQty = invoice.items.reduce((s, it) => s + it.quantity, 0);

  return (
    <div className="bg-muted/20 min-h-screen pb-20 print:min-h-0 print:pb-0 print:bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          html, body { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── ACTION BAR (no print) ── */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b px-3 sm:px-4 py-3 flex items-center justify-between no-print shadow-sm gap-2">
        <Button variant="ghost" className="rounded-xl shrink-0" onClick={() => window.history.back()}>
          <ChevronLeft className="w-5 h-5 sm:mr-1" /><span className="hidden sm:inline">Back</span>
        </Button>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {invoice.status !== "paid" && (
            <Button variant="outline" size="icon" className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 sm:w-auto sm:px-3 sm:gap-2" onClick={handleMarkPaid} disabled={markPaidMut.isPending}>
              <CheckCircle className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Mark Paid</span>
            </Button>
          )}
          <Button variant="outline" size="icon" className="rounded-xl sm:w-auto sm:px-3 sm:gap-2" onClick={() => setLocation(`/invoices/${invoiceId}/edit`)}>
            <Edit className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Edit</span>
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl sm:w-auto sm:px-3 sm:gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Print PDF</span>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" className="rounded-xl shadow-lg shadow-primary/20 sm:w-auto sm:px-3 sm:gap-2">
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

      {/* ── PRINTABLE INVOICE ── */}
      <div
        className="max-w-[210mm] mx-auto mt-6 print:mt-0 bg-white shadow-2xl print:shadow-none border print:border-0"
        style={{ fontFamily: "Arial, sans-serif", color: "#000" }}
      >
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

          {/* INVOICE META */}
          <div style={{ display: "flex", gap: 24, fontSize: 12, marginBottom: 8 }}>
            <div><span style={{ color: "#666" }}>Invoice #:</span> <strong>{invoice.invoiceNumber}</strong></div>
            <div><span style={{ color: "#666" }}>Invoice Date:</span> <strong>{formatDate(invoice.invoiceDate)}</strong></div>
            {invoice.dueDate && <div><span style={{ color: "#666" }}>Due Date:</span> <strong>{formatDate(invoice.dueDate)}</strong></div>}
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
                <th style={{ ...thStyle, textAlign: "right", width: 70 }}>Qty</th>
                <th style={{ ...thStyle, textAlign: "right", width: 90 }}>Rate</th>
                <th style={{ ...thStyle, textAlign: "right", width: 100 }}>Amount</th>
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
                  <td style={{ ...cellStyle, textAlign: "right" }}>{item.quantity} {item.unit}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{formatCurrency(item.rate)}</td>
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
                  Total Items / Qty : {invoice.items.length} / {totalQty.toFixed(3)}
                </td>
                <td style={{ ...cellStyle, borderTop: "none", fontSize: 11, fontStyle: "italic", color: "#555" }}>
                  Total amount (in words): <strong style={{ color: "#000", fontStyle: "normal" }}>{numberToWords(invoice.total)}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          {/* TOTALS */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 0, marginBottom: 16 }}>
            <table style={{ borderCollapse: "collapse", minWidth: 240 }}>
              <tbody>
                <tr>
                  <td style={{ ...cellStyle, borderTop: "none", color: "#555" }}>Taxable Amount</td>
                  <td style={{ ...cellStyle, borderTop: "none", textAlign: "right", fontWeight: 600 }}>{formatCurrency(taxableAmount)}</td>
                </tr>
                {discountAmount > 0 && (
                  <tr>
                    <td style={{ ...cellStyle, color: "#555" }}>
                      Discount {invoice.discountType === "percent" ? `(${invoice.discountValue}%)` : ""}
                    </td>
                    <td style={{ ...cellStyle, textAlign: "right", color: "#16a34a", fontWeight: 600 }}>
                      -{formatCurrency(discountAmount)}
                    </td>
                  </tr>
                )}
                {invoice.taxPercent > 0 && (
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
                <tr style={{ backgroundColor: HEADER_BG, color: HEADER_COLOR, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                  <td style={{ ...cellStyle, fontWeight: 700, fontSize: 14, border: "1px solid #1e293b", backgroundColor: HEADER_BG, color: HEADER_COLOR, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>Total</td>
                  <td style={{ ...cellStyle, fontWeight: 800, fontSize: 16, textAlign: "right", border: "1px solid #1e293b", backgroundColor: HEADER_BG, color: HEADER_COLOR, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>{formatCurrency(invoice.total)}</td>
                </tr>
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
                    <div style={{ marginTop: 40, borderTop: "1px solid #aaa", paddingTop: 4, fontSize: 10, color: "#666" }}>
                      Authorized Signatory
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* NOTES & TERMS */}
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

            {/* THANK YOU */}
            <div style={{ borderTop: "1px dashed #ddd", marginTop: 12, paddingTop: 10, textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>Thank you for your business!</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>We appreciate your trust and look forward to working with you again.</div>
            </div>

            {/* PAGE FOOTER */}
            <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 12, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 10, color: "#999" }}>Page 1 / 1</div>
              <div style={{ fontSize: 10, color: "#999", fontStyle: "italic" }}>This is a digitally signed document.</div>
            </div>

            {/* WATERMARK */}
            <div style={{ textAlign: "center", marginTop: 6 }}>
              <span style={{ fontSize: 10, color: "#bbb" }}>Made with </span>
              <span style={{ fontSize: 10, color: "#e11d48" }}>❤️</span>
              <span style={{ fontSize: 10, color: "#bbb" }}> by EntireSteps</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
