import { useParams, useLocation } from "wouter";
import { useGetCreditNote, useGetBusinessProfile } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, ChevronLeft, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";

const HEADER_BG = "#7e22ce";
const HEADER_COLOR = "#ffffff";
const BORDER = "1px solid #e2e8f0";
const ALT_ROW = "#faf5ff";
const cellStyle: React.CSSProperties = { border: BORDER, padding: "7px 10px", verticalAlign: "top", fontSize: 12 };
const thStyle: React.CSSProperties = { ...cellStyle, backgroundColor: HEADER_BG, color: HEADER_COLOR, fontWeight: 600, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };

export default function CreditNoteDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const cnId = parseInt(id || "0", 10);

  const { data: cn, isLoading } = useGetCreditNote(cnId, { query: { enabled: !!cnId } });
  const { data: profile } = useGetBusinessProfile();

  if (isLoading || !cn || !profile) return <div className="p-8 text-center">Loading...</div>;

  const halfTax = cn.taxPercent / 2;
  const cgst = cn.supplyType === "intra" ? cn.taxAmount / 2 : 0;
  const sgst = cn.supplyType === "intra" ? cn.taxAmount / 2 : 0;
  const igst = cn.supplyType === "inter" ? cn.taxAmount : 0;
  const totalQty = cn.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="bg-muted/20 min-h-screen pb-20 print:min-h-0 print:pb-0 print:bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          html, body { height: auto !important; overflow: visible !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between no-print shadow-sm">
        <Button variant="ghost" className="rounded-xl" onClick={() => setLocation("/credit-notes")}>
          <ChevronLeft className="w-5 h-5 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          {cn.invoiceId && (
            <Link href={`/invoices/${cn.invoiceId}`}>
              <Button variant="outline" size="sm" className="rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50">
                <LinkIcon className="w-4 h-4 mr-2" /> View Invoice
              </Button>
            </Link>
          )}
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Badge className={`rounded-lg ${cn.status === "issued" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"} border-0`}>
            {cn.status}
          </Badge>
        </div>
      </div>

      <div className="max-w-[210mm] mx-auto mt-6 print:mt-0 bg-white shadow-2xl print:shadow-none border print:border-0" style={{ fontFamily: "Arial, sans-serif", color: "#000" }}>
        <div className="p-8 print:p-8">
          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div>
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt="Logo" style={{ maxHeight: 52, maxWidth: 160, objectFit: "contain", marginBottom: 6 }} />
              ) : (
                <div style={{ width: 44, height: 44, background: HEADER_BG, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 20, marginBottom: 6, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                  {profile.shopName.charAt(0)}
                </div>
              )}
              <div style={{ fontWeight: 700, fontSize: 18 }}>{profile.shopName}</div>
              {profile.gstin && <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>GSTIN {profile.gstin}</div>}
              <div style={{ fontSize: 11, color: "#555" }}>{[profile.address, profile.city].filter(Boolean).join(", ")}</div>
              <div style={{ fontSize: 11, color: "#555" }}>{[profile.state, profile.pincode].filter(Boolean).join(", ")}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", color: HEADER_BG }}>Credit Note</div>
              <div style={{ fontSize: 10, color: "#888", marginTop: 3, textTransform: "uppercase", letterSpacing: 1 }}>Original for Recipient</div>
            </div>
          </div>

          <div style={{ borderTop: "2.5px solid #7e22ce", margin: "10px 0 8px" }} />

          <div style={{ display: "flex", gap: 24, fontSize: 12, marginBottom: 4 }}>
            <div><span style={{ color: "#666" }}>Credit Note #:</span> <strong>{cn.creditNoteNumber}</strong></div>
            <div><span style={{ color: "#666" }}>Date:</span> <strong>{formatDate(cn.date)}</strong></div>
            {cn.invoiceId && <div><span style={{ color: "#666" }}>Against Invoice:</span> <strong>#{cn.invoiceId}</strong></div>}
          </div>

          {cn.reason && (
            <div style={{ fontSize: 12, color: "#555", marginBottom: 8, padding: "4px 8px", background: "#faf5ff", borderRadius: 4, border: "1px solid #e9d5ff" }}>
              <strong>Reason: </strong>{cn.reason}
            </div>
          )}

          <div style={{ borderTop: "1px solid #ddd", margin: "8px 0" }} />

          {cn.customerName && (
            <div style={{ marginBottom: 14, fontSize: 12 }}>
              <div style={{ color: "#888", marginBottom: 3 }}>Issued To:</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{cn.customerName}</div>
              {cn.customerGstin && <div style={{ fontWeight: 600 }}>GSTIN: {cn.customerGstin}</div>}
              {cn.customerPhone && <div style={{ color: "#444" }}>Ph: {cn.customerPhone}</div>}
              {cn.customerAddress && <div style={{ color: "#444" }}>{cn.customerAddress}</div>}
              {cn.customerEmail && <div style={{ color: "#444" }}>{cn.customerEmail}</div>}
            </div>
          )}

          {/* ITEMS */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "center", width: 28 }}>#</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Description</th>
                <th style={{ ...thStyle, textAlign: "right", width: 60 }}>Qty</th>
                <th style={{ ...thStyle, textAlign: "right", width: 80 }}>Rate</th>
                <th style={{ ...thStyle, textAlign: "right", width: 40 }}>GST%</th>
                <th style={{ ...thStyle, textAlign: "right", width: 90 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {cn.items.map((item, i) => (
                <tr key={i} style={i % 2 !== 0 ? { backgroundColor: ALT_ROW, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } : {}}>
                  <td style={{ ...cellStyle, textAlign: "center", color: "#888" }}>{i + 1}</td>
                  <td style={{ ...cellStyle }}>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    {item.description && <div style={{ color: "#777", fontSize: 11 }}>{item.description}</div>}
                    {item.hsnCode && <div style={{ color: "#999", fontSize: 10 }}>HSN: {item.hsnCode}</div>}
                  </td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{item.quantity} {item.unit}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{formatCurrency(item.rate)}</td>
                  <td style={{ ...cellStyle, textAlign: "right" }}>{item.taxRate}%</td>
                  <td style={{ ...cellStyle, textAlign: "right", fontWeight: 600 }}>{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOTALS */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 0, marginBottom: 16 }}>
            <table style={{ borderCollapse: "collapse", minWidth: 240 }}>
              <tbody>
                <tr>
                  <td style={{ ...cellStyle, borderTop: "none", color: "#555" }}>Subtotal</td>
                  <td style={{ ...cellStyle, borderTop: "none", textAlign: "right", fontWeight: 600 }}>{formatCurrency(cn.subtotal)}</td>
                </tr>
                {cn.taxPercent > 0 && cn.supplyType === "intra" && (
                  <>
                    <tr>
                      <td style={{ ...cellStyle, color: "#555" }}>CGST {halfTax}%</td>
                      <td style={{ ...cellStyle, textAlign: "right", fontWeight: 600 }}>{formatCurrency(cgst)}</td>
                    </tr>
                    <tr>
                      <td style={{ ...cellStyle, color: "#555" }}>SGST {halfTax}%</td>
                      <td style={{ ...cellStyle, textAlign: "right", fontWeight: 600 }}>{formatCurrency(sgst)}</td>
                    </tr>
                  </>
                )}
                {cn.taxPercent > 0 && cn.supplyType === "inter" && (
                  <tr>
                    <td style={{ ...cellStyle, color: "#555" }}>IGST {cn.taxPercent}%</td>
                    <td style={{ ...cellStyle, textAlign: "right", fontWeight: 600 }}>{formatCurrency(igst)}</td>
                  </tr>
                )}
                <tr style={{ backgroundColor: HEADER_BG, color: HEADER_COLOR, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                  <td style={{ ...cellStyle, fontWeight: 700, fontSize: 14, border: `1px solid ${HEADER_BG}`, backgroundColor: HEADER_BG, color: HEADER_COLOR, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                    Credit Amount
                  </td>
                  <td style={{ ...cellStyle, fontWeight: 800, fontSize: 16, textAlign: "right", border: `1px solid ${HEADER_BG}`, backgroundColor: HEADER_BG, color: HEADER_COLOR, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                    {formatCurrency(cn.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {cn.notes && (
            <div style={{ fontSize: 11, color: "#555", borderTop: "1px solid #eee", paddingTop: 8, marginTop: 8 }}>
              <strong>Notes: </strong>{cn.notes}
            </div>
          )}

          <div style={{ borderTop: "1px solid #ddd", marginTop: 24, paddingTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1px solid #555", paddingTop: 4, width: 180, fontSize: 11, color: "#555" }}>
                Authorised Signatory
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{profile.shopName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
