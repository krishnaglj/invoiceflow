import { useState } from "react";
import { useParams } from "wouter";
import { useGetCustomer } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { EditCustomerDialog } from "@/components/edit-customer-dialog";
import { Phone, Mail, Building, MapPin, ReceiptText, ArrowUpRight, Clock, Pencil, FileText } from "lucide-react";
import { Link } from "wouter";

export default function CustomerDetail() {
  const { id } = useParams();
  const { data: customer, isLoading } = useGetCustomer(parseInt(id || "0", 10), { query: { enabled: !!id } });
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading || !customer) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl font-display">
            {customer.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">{customer.name}</h1>
            {customer.businessName && <p className="text-muted-foreground flex items-center gap-1"><Building className="w-4 h-4" /> {customer.businessName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/customers/${id}/statement`}>
            <Button variant="outline" className="rounded-xl">
              <FileText className="w-4 h-4 mr-2" /> Statement
            </Button>
          </Link>
          <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(true)}>
            <Pencil className="w-4 h-4 mr-2" /> Edit
          </Button>
        </div>
      </div>

      <EditCustomerDialog customer={customer} open={editOpen} onOpenChange={setEditOpen} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="font-display text-lg">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0"><Phone className="w-4 h-4 text-muted-foreground" /></div>
              <span className="font-medium">{customer.phone}</span>
            </div>
            {customer.email && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0"><Mail className="w-4 h-4 text-muted-foreground" /></div>
                <span className="font-medium truncate">{customer.email}</span>
              </div>
            )}
            {(customer.address || customer.city || customer.state) && (
              <div className="flex items-start gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-muted-foreground" /></div>
                <span className="font-medium mt-1 leading-relaxed">
                  {[customer.address, customer.city, customer.state].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            {customer.gstin && (
              <div className="pt-2 border-t mt-4">
                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">GSTIN</span>
                <span className="font-mono font-medium">{customer.gstin}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-6">
              <ReceiptText className="w-6 h-6 text-primary mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
              <h3 className="text-2xl font-bold font-display">{customer.totalInvoices}</h3>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-6">
              <ArrowUpRight className="w-6 h-6 text-emerald-500 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Total Billed</p>
              <h3 className="text-2xl font-bold font-display">{formatCurrency(customer.totalBilled)}</h3>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/50 shadow-sm bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30">
            <CardContent className="p-6">
              <Clock className="w-6 h-6 text-amber-500 mb-3" />
              <p className="text-sm font-medium text-amber-700/70 dark:text-amber-500/70">Outstanding</p>
              <h3 className="text-2xl font-bold font-display text-amber-700 dark:text-amber-500">{formatCurrency(customer.outstanding)}</h3>
            </CardContent>
          </Card>

          <Card className="sm:col-span-3 rounded-2xl border-border/50 shadow-sm mt-2">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="font-display text-lg">Invoice History</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="p-4 font-medium">Invoice No</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium text-right">Amount</th>
                    <th className="p-4 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {customer.invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4"><Link href={`/invoices/${inv.id}`} className="text-primary font-medium hover:underline">{inv.invoiceNumber}</Link></td>
                      <td className="p-4 text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                      <td className="p-4 font-bold text-right">{formatCurrency(inv.total)}</td>
                      <td className="p-4 text-right"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                  {customer.invoices.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No invoices yet.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
