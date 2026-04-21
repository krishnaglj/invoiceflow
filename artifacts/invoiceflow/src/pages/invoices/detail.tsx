import { useParams, useLocation } from "wouter";
import { useGetInvoice, useGetBusinessProfile, useDeleteInvoice, useMarkInvoicePaid } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Printer, Share2, Edit, Trash2, CheckCircle, ChevronLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

  const handlePrint = () => {
    window.print();
  };

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

  return (
    <div className="bg-muted/20 min-h-screen pb-20">
      {/* Top Action Bar (No Print) */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between no-print shadow-sm">
        <Button variant="ghost" className="rounded-xl" onClick={() => window.history.back()}>
          <ChevronLeft className="w-5 h-5 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          {invoice.status !== 'paid' && (
            <Button variant="outline" className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={handleMarkPaid} disabled={markPaidMut.isPending}>
              <CheckCircle className="w-4 h-4 mr-2" /> Mark Paid
            </Button>
          )}
          <Button variant="outline" className="rounded-xl" onClick={() => setLocation(`/invoices/${invoiceId}/edit`)}>
            <Edit className="w-4 h-4 mr-2" /> Edit
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-lg shadow-primary/20">
                <Share2 className="w-4 h-4 mr-2" /> Share
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Share Invoice</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-4">
                <Button variant="outline" className="h-14 justify-start text-lg rounded-xl" asChild>
                  <a href={`whatsapp://send?text=Here is your invoice ${invoice.invoiceNumber}: ${window.location.href}`} target="_blank" rel="noreferrer">
                    <svg className="w-6 h-6 mr-4 text-emerald-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.405-.883-.733-1.48-1.638-1.653-1.935-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
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

      {/* The Printable Invoice Sheet */}
      <div className="max-w-[21cm] mx-auto mt-8 bg-white shadow-2xl sm:rounded-none md:rounded-sm border print-container">
        <div className="p-10 md:p-14 text-black">
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-8 mb-8">
            <div className="max-w-xs">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt="Logo" className="max-h-16 object-contain mb-4" />
              ) : (
                <div className="w-16 h-16 bg-slate-900 rounded flex items-center justify-center text-white font-bold text-2xl mb-4">
                  {profile.shopName.charAt(0)}
                </div>
              )}
              <h1 className="text-2xl font-bold text-slate-900">{profile.shopName}</h1>
              <p className="text-sm text-slate-600 whitespace-pre-line mt-1">{profile.address}, {profile.city}, {profile.state} {profile.pincode}</p>
              <p className="text-sm text-slate-600 mt-1">Phone: {profile.phone}</p>
              <p className="text-sm text-slate-600">Email: {profile.email}</p>
              {profile.gstin && <p className="text-sm text-slate-600 mt-1 font-medium">GSTIN: {profile.gstin}</p>}
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-black text-slate-200 uppercase tracking-widest mb-4">Invoice</h2>
              <div className="inline-block text-left bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-500 font-medium">Invoice No.</p>
                <p className="text-lg font-bold text-slate-900 mb-2">{invoice.invoiceNumber}</p>
                <p className="text-sm text-slate-500 font-medium">Invoice Date</p>
                <p className="text-sm font-bold text-slate-900 mb-2">{formatDate(invoice.invoiceDate)}</p>
                {invoice.dueDate && (
                  <>
                    <p className="text-sm text-slate-500 font-medium">Due Date</p>
                    <p className="text-sm font-bold text-slate-900">{formatDate(invoice.dueDate)}</p>
                  </>
                )}
              </div>
              <div className="mt-4 no-print flex justify-end"><StatusBadge status={invoice.status} /></div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-10">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Bill To:</h3>
            <p className="text-lg font-bold text-slate-900">{invoice.customerName}</p>
            {invoice.customerAddress && <p className="text-sm text-slate-600 mt-1">{invoice.customerAddress}</p>}
            {(invoice.customerCity || invoice.customerState) && <p className="text-sm text-slate-600">{invoice.customerCity}, {invoice.customerState}</p>}
            {invoice.customerPhone && <p className="text-sm text-slate-600 mt-1">Ph: {invoice.customerPhone}</p>}
            {invoice.customerEmail && <p className="text-sm text-slate-600">Email: {invoice.customerEmail}</p>}
            {invoice.customerGstin && <p className="text-sm font-medium text-slate-800 mt-1">GSTIN: {invoice.customerGstin}</p>}
          </div>

          {/* Line Items */}
          <table className="w-full text-left mb-8 text-sm">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-900">
                <th className="py-3 font-bold">Item Description</th>
                <th className="py-3 font-bold text-right w-24">Qty</th>
                <th className="py-3 font-bold text-right w-32">Rate</th>
                <th className="py-3 font-bold text-right w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item, i) => (
                <tr key={i}>
                  <td className="py-4">
                    <p className="font-bold text-slate-900">{item.name}</p>
                    {item.description && <p className="text-xs text-slate-500 mt-1">{item.description}</p>}
                  </td>
                  <td className="py-4 text-right">{item.quantity} {item.unit}</td>
                  <td className="py-4 text-right">{formatCurrency(item.rate)}</td>
                  <td className="py-4 text-right font-medium text-slate-900">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-12">
            <div className="w-72 space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discountValue > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount {invoice.discountType === 'percent' ? `(${invoice.discountValue}%)` : ''}</span>
                  <span>-{formatCurrency(invoice.discountType === 'percent' ? invoice.subtotal * (invoice.discountValue/100) : invoice.discountValue)}</span>
                </div>
              )}
              {invoice.taxPercent > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax ({invoice.taxPercent}%)</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t-2 border-slate-900 pt-3 mt-3">
                <span className="text-lg font-bold text-slate-900">Total</span>
                <span className="text-2xl font-black text-slate-900">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer Info + Thank You — kept together to avoid page break */}
          <div style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
            <div className="grid grid-cols-2 gap-8 text-sm text-slate-600 border-t pt-8">
              <div>
                {invoice.notes && (
                  <div className="mb-6">
                    <h4 className="font-bold text-slate-900 mb-1">Notes:</h4>
                    <p className="whitespace-pre-line">{invoice.notes}</p>
                  </div>
                )}
                {invoice.paymentTerms && (
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Terms & Conditions:</h4>
                    <p className="whitespace-pre-line">{invoice.paymentTerms}</p>
                  </div>
                )}
              </div>

              {invoice.showBankDetails && (
                <div className="bg-slate-50 p-4 rounded-lg self-start">
                  <h4 className="font-bold text-slate-900 mb-3 uppercase tracking-wider text-xs">Bank Details for Payment</h4>
                  <div className="space-y-1">
                    <p><span className="text-slate-500 w-24 inline-block">Bank:</span> <span className="font-medium text-slate-900">{profile.bankName}</span></p>
                    <p><span className="text-slate-500 w-24 inline-block">Account:</span> <span className="font-medium text-slate-900">{profile.accountNumber}</span></p>
                    <p><span className="text-slate-500 w-24 inline-block">IFSC:</span> <span className="font-medium text-slate-900">{profile.ifscCode}</span></p>
                    <p><span className="text-slate-500 w-24 inline-block">Name:</span> <span className="font-medium text-slate-900">{profile.accountHolder}</span></p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-dashed border-slate-200 text-center">
              <p className="text-slate-500 text-sm font-medium tracking-wide">
                Made with <span className="text-rose-500">♥</span> for your business
              </p>
              <p className="text-slate-800 text-base font-semibold mt-1">
                Thank you — we appreciate your trust!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
