import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetCustomerStatement } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { ChevronLeft, Printer } from "lucide-react";
import { Link } from "wouter";

const HEADER_BG = "#1e293b";
const HEADER_COLOR = "#ffffff";
const BORDER = "1px solid #e2e8f0";
const cellStyle: React.CSSProperties = { border: BORDER, padding: "8px 12px", fontSize: 12, verticalAlign: "middle" };
const thStyle: React.CSSProperties = { ...cellStyle, backgroundColor: HEADER_BG, color: HEADER_COLOR, fontWeight: 600, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };

export default function CustomerStatement() {
  const { id } = useParams();
  const customerId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();

  const today = new Date().toISOString().split("T")[0];
  const startOfYear = `${new Date().getFullYear()}-04-01`;

  const [from, setFrom] = useState(startOfYear);
  const [to, setTo] = useState(today);
  const [applied, setApplied] = useState({ from: startOfYear, to: today });

  const { data: statement, isLoading } = useGetCustomerStatement(
    customerId,
    { from: applied.from, to: applied.to },
    { query: { enabled: !!customerId } }
  );

  return (
    <div className="bg-muted/20 min-h-screen pb-20 print:min-h-0 print:pb-0 print:bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          html, body { height: auto !important; overflow: visible !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ACTION BAR */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between no-print shadow-sm gap-3 flex-wrap">
        <Button variant="ghost" className="rounded-xl" onClick={() => setLocation(`/customers/${customerId}`)}>
          <ChevronLeft className="w-5 h-5 mr-1" /> Back
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground shrink-0">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 text-sm w-36 rounded-lg" />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground shrink-0">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-sm w-36 rounded-lg" />
          </div>
          <Button size="sm" variant="outline" className="rounded-xl h-8" onClick={() => setApplied({ from, to })}>
            Apply
          </Button>
          <Button size="sm" className="rounded-xl h-8" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">Loading statement...</div>
      ) : !statement ? null : (
        <div className="max-w-[210mm] mx-auto mt-6 print:mt-0 bg-white shadow-2xl print:shadow-none border print:border-0" style={{ fontFamily: "Arial, sans-serif", color: "#000" }}>
          <div className="p-8 print:p-8">
            {/* HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20 }}>Account Statement</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                  Period: {applied.from ? formatDate(applied.from) : "All"} — {applied.to ? formatDate(applied.to) : "Now"}
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{statement.customer.name}</div>
                {statement.customer.gstin && <div style={{ color: "#555" }}>GSTIN: {statement.customer.gstin}</div>}
                {statement.customer.phone && <div style={{ color: "#555" }}>{statement.customer.phone}</div>}
                {statement.customer.email && <div style={{ color: "#555" }}>{statement.customer.email}</div>}
                {(statement.customer.city || statement.customer.state) && (
                  <div style={{ color: "#555" }}>{[statement.customer.city, statement.customer.state].filter(Boolean).join(", ")}</div>
                )}
              </div>
            </div>

            <div style={{ borderTop: "2.5px solid #1e293b", margin: "10px 0 16px" }} />

            {/* SUMMARY CARDS */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Invoiced", value: statement.summary.totalInvoiced, color: "#1e293b" },
                { label: "Total Paid", value: statement.summary.totalPaid, color: "#16a34a" },
                { label: "Outstanding", value: statement.summary.totalOutstanding, color: statement.summary.totalOutstanding > 0 ? "#dc2626" : "#16a34a" },
              ].map((s) => (
                <div key={s.label} style={{ flex: 1, border: BORDER, borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color, marginTop: 2, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                    {formatCurrency(s.value)}
                  </div>
                </div>
              ))}
            </div>

            {/* INVOICE TABLE */}
            {statement.invoices.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: "#888", fontSize: 13 }}>
                No invoices found in this date range.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, textAlign: "left" }}>Invoice #</th>
                    <th style={{ ...thStyle, textAlign: "left" }}>Date</th>
                    <th style={{ ...thStyle, textAlign: "left" }}>Due Date</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Invoice Amount</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Paid</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.invoices.map((inv, i) => (
                    <>
                      <tr key={inv.id} style={i % 2 !== 0 ? { backgroundColor: "#f8fafc", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } : {}}>
                        <td style={{ ...cellStyle, fontWeight: 600 }}>
                          <Link href={`/invoices/${inv.id}`} className="text-primary hover:underline no-print">{inv.invoiceNumber}</Link>
                          <span className="hidden print:inline">{inv.invoiceNumber}</span>
                        </td>
                        <td style={{ ...cellStyle, color: "#555" }}>{formatDate(inv.date)}</td>
                        <td style={{ ...cellStyle, color: "#555" }}>{inv.dueDate ? formatDate(inv.dueDate) : "—"}</td>
                        <td style={{ ...cellStyle, textAlign: "right", fontWeight: 600 }}>{formatCurrency(inv.total)}</td>
                        <td style={{ ...cellStyle, textAlign: "right", color: "#16a34a", fontWeight: 600 }}>
                          {inv.paidAmount > 0 ? formatCurrency(inv.paidAmount) : "—"}
                        </td>
                        <td style={{ ...cellStyle, textAlign: "right", fontWeight: 700, color: inv.outstanding > 0 ? "#dc2626" : "#16a34a" }}>
                          {inv.outstanding > 0 ? formatCurrency(inv.outstanding) : "Paid ✓"}
                        </td>
                      </tr>
                      {inv.payments.length > 0 && inv.payments.map((p, pi) => (
                        <tr key={`${inv.id}-p${pi}`} style={{ backgroundColor: "#f0fdf4", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                          <td style={{ ...cellStyle, fontSize: 10, color: "#888", paddingLeft: 24 }} colSpan={3}>
                            ↳ Payment received · {formatDate(p.date)} · {p.method.replace("_", " ").toUpperCase()}
                          </td>
                          <td colSpan={2} />
                          <td style={{ ...cellStyle, textAlign: "right", fontSize: 11, color: "#16a34a", fontWeight: 600 }}>
                            {formatCurrency(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: HEADER_BG, color: HEADER_COLOR, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                    <td style={{ ...cellStyle, border: `1px solid ${HEADER_BG}`, backgroundColor: HEADER_BG, color: HEADER_COLOR, fontWeight: 700, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} colSpan={3}>
                      Total
                    </td>
                    <td style={{ ...cellStyle, border: `1px solid ${HEADER_BG}`, backgroundColor: HEADER_BG, color: HEADER_COLOR, textAlign: "right", fontWeight: 700, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                      {formatCurrency(statement.summary.totalInvoiced)}
                    </td>
                    <td style={{ ...cellStyle, border: `1px solid ${HEADER_BG}`, backgroundColor: HEADER_BG, color: HEADER_COLOR, textAlign: "right", fontWeight: 700, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                      {formatCurrency(statement.summary.totalPaid)}
                    </td>
                    <td style={{ ...cellStyle, border: `1px solid ${HEADER_BG}`, backgroundColor: HEADER_BG, color: HEADER_COLOR, textAlign: "right", fontWeight: 700, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                      {formatCurrency(statement.summary.totalOutstanding)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}

            <div style={{ borderTop: "1px solid #ddd", marginTop: 24, paddingTop: 8, fontSize: 10, color: "#aaa", textAlign: "center" }}>
              This is a computer-generated statement. For queries, contact {statement.customer.email || statement.customer.phone || "the business"}.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
