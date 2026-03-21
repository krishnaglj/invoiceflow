import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetInvoice, useCreateInvoice, useUpdateInvoice, useGetNextInvoiceNumber, useListCustomers, useGetBusinessProfile, useListProducts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Send, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useInvoiceCalculations } from "@/hooks/use-invoice-calc";
import { formatCurrency } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const itemSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0.01),
  unit: z.string().default("pcs"),
  rate: z.coerce.number().min(0),
});

const invoiceSchema = z.object({
  customerId: z.coerce.number().optional(),
  customerName: z.string().min(2, "Customer name is required"),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerGstin: z.string().optional(),
  
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string(),
  dueDate: z.string().optional(),
  
  items: z.array(itemSchema).min(1, "Add at least one item"),
  
  discountType: z.enum(["percent", "flat"]).default("flat"),
  discountValue: z.coerce.number().default(0),
  taxPercent: z.coerce.number().default(0),
  
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  showBankDetails: z.boolean().default(true),
  status: z.enum(["draft", "sent", "paid", "overdue"]).default("draft"),
});

export default function InvoiceForm() {
  const { id } = useParams();
  const isEditing = !!id;
  const invoiceId = parseInt(id || "0", 10);
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useGetBusinessProfile();
  const { data: customers } = useListCustomers();
  const { data: products } = useListProducts();
  const { data: nextNum } = useGetNextInvoiceNumber({ query: { enabled: !isEditing } });
  const { data: existingInvoice } = useGetInvoice(invoiceId, { query: { enabled: isEditing } });

  const createMut = useCreateInvoice();
  const updateMut = useUpdateInvoice();

  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceDate: new Date().toISOString().split('T')[0],
      items: [{ name: "", quantity: 1, unit: "pcs", rate: 0 }],
      discountType: "flat",
      discountValue: 0,
      taxPercent: 0,
      showBankDetails: true,
      status: "draft"
    }
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  
  const watchItems = form.watch("items");
  const watchDiscountType = form.watch("discountType");
  const watchDiscountValue = form.watch("discountValue");
  const watchTax = form.watch("taxPercent");

  const calc = useInvoiceCalculations(
    watchItems.map(i => ({ quantity: i.quantity || 0, rate: i.rate || 0 })),
    watchDiscountType as any,
    watchDiscountValue || 0,
    watchTax || 0
  );

  useEffect(() => {
    if (isEditing && existingInvoice) {
      // Strip null values → undefined so Zod optional() fields pass validation
      const sanitize = (v: unknown) => (v === null ? undefined : v);
      form.reset({
        customerId: existingInvoice.customerId ?? undefined,
        customerName: existingInvoice.customerName ?? "",
        customerEmail: sanitize(existingInvoice.customerEmail) as string | undefined,
        customerPhone: sanitize(existingInvoice.customerPhone) as string | undefined,
        customerAddress: sanitize(existingInvoice.customerAddress) as string | undefined,
        customerGstin: sanitize(existingInvoice.customerGstin) as string | undefined,
        invoiceNumber: existingInvoice.invoiceNumber,
        invoiceDate: existingInvoice.invoiceDate.split('T')[0],
        dueDate: existingInvoice.dueDate ? existingInvoice.dueDate.split('T')[0] : undefined,
        discountType: (existingInvoice.discountType as "percent" | "flat") ?? "flat",
        discountValue: existingInvoice.discountValue ?? 0,
        taxPercent: existingInvoice.taxPercent ?? 0,
        notes: sanitize(existingInvoice.notes) as string | undefined,
        paymentTerms: sanitize(existingInvoice.paymentTerms) as string | undefined,
        showBankDetails: existingInvoice.showBankDetails ?? true,
        status: (existingInvoice.status as "draft" | "sent" | "paid" | "overdue") ?? "draft",
        items: (existingInvoice.items ?? []).map(item => ({
          name: item.name,
          description: sanitize(item.description) as string | undefined,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
        })),
      });
    } else if (!isEditing && nextNum && profile) {
      form.setValue("invoiceNumber", nextNum.invoiceNumber);
      form.setValue("taxPercent", profile.defaultTaxPercent);
      form.setValue("notes", profile.defaultNotes || "");
      form.setValue("paymentTerms", profile.defaultPaymentTerms || "");
    }
  }, [isEditing, existingInvoice, nextNum, profile, form]);

  const handleCustomerSelect = (custId: string) => {
    const c = customers?.find(c => c.id.toString() === custId);
    if (c) {
      form.setValue("customerId", c.id);
      form.setValue("customerName", c.name);
      form.setValue("customerEmail", c.email || "");
      form.setValue("customerPhone", c.phone || "");
      form.setValue("customerAddress", [c.address, c.city, c.state].filter(Boolean).join(", "));
      form.setValue("customerGstin", c.gstin || "");
    }
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const p = products?.find(p => p.id.toString() === prodId);
    if (p) {
      form.setValue(`items.${index}.name`, p.name);
      form.setValue(`items.${index}.description`, p.description || "");
      form.setValue(`items.${index}.rate`, p.defaultRate);
      form.setValue(`items.${index}.unit`, p.unit);
    }
  };

  const onSubmit = (data: z.infer<typeof invoiceSchema>, action: "draft" | "sent") => {
    const payload = {
      ...data,
      status: action as "draft" | "sent",
      items: data.items.map(item => ({
        ...item,
        amount: item.quantity * item.rate
      }))
    };

    const mut = isEditing ? updateMut.mutate : createMut.mutate;
    const args = isEditing ? { id: invoiceId, data: payload } : { data: payload };

    (mut as any)(args, {
      onSuccess: (res: any) => {
        toast({ title: `Invoice ${isEditing ? 'updated' : 'created'}!` });
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
        setLocation(`/invoices/${res.id}`);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.data?.error || "Failed to save", variant: "destructive" });
      }
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">{isEditing ? "Edit Invoice" : "New Invoice"}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl bg-card" onClick={form.handleSubmit((d) => onSubmit(d, "draft"))} disabled={createMut.isPending || updateMut.isPending}>
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </Button>
          <Button className="rounded-xl shadow-lg shadow-primary/20" onClick={form.handleSubmit((d) => onSubmit(d, "sent"))} disabled={createMut.isPending || updateMut.isPending}>
            <Send className="w-4 h-4 mr-2" /> Save & Mark Sent
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4 border p-4 rounded-xl bg-muted/20">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Bill To</h3>
                  <div className="space-y-3">
                    {customers && customers.length > 0 && (
                      <Select onValueChange={handleCustomerSelect}>
                        <SelectTrigger className="bg-background"><SelectValue placeholder="Select existing customer..." /></SelectTrigger>
                        <SelectContent>
                          {customers.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    <Input {...form.register("customerName")} placeholder="Customer Name *" className="bg-background font-medium" />
                    <Input {...form.register("customerPhone")} placeholder="Phone" className="bg-background" />
                    <Textarea {...form.register("customerAddress")} placeholder="Address" className="bg-background resize-none h-20" />
                  </div>
                </div>

                <div className="space-y-4 border p-4 rounded-xl bg-muted/20">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Invoice Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Label className="w-24 shrink-0 text-xs">Invoice No.</Label>
                      <Input {...form.register("invoiceNumber")} className="bg-background font-mono" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-24 shrink-0 text-xs">Date</Label>
                      <Input type="date" {...form.register("invoiceDate")} className="bg-background" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-24 shrink-0 text-xs">Due Date</Label>
                      <Input type="date" {...form.register("dueDate")} className="bg-background" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-4 text-left font-medium w-[40%]">Item</th>
                    <th className="p-4 text-left font-medium w-[15%]">Qty</th>
                    <th className="p-4 text-left font-medium w-[20%]">Rate (₹)</th>
                    <th className="p-4 text-right font-medium w-[20%]">Amount</th>
                    <th className="p-4 text-center font-medium w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {fields.map((field, index) => (
                    <tr key={field.id} className="group hover:bg-muted/10">
                      <td className="p-4 space-y-2">
                        {products && products.length > 0 && (
                          <Select onValueChange={(v) => handleProductSelect(index, v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick from library..." /></SelectTrigger>
                            <SelectContent>
                              {products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        <Input {...form.register(`items.${index}.name`)} placeholder="Item name" className="font-medium" />
                        <Input {...form.register(`items.${index}.description`)} placeholder="Description (optional)" className="text-xs text-muted-foreground h-8" />
                      </td>
                      <td className="p-4 align-top pt-12">
                        <div className="flex items-center gap-1">
                          <Input type="number" step="0.01" {...form.register(`items.${index}.quantity`)} className="w-16 px-2" />
                          <Input {...form.register(`items.${index}.unit`)} className="w-14 px-2 text-xs" placeholder="Unit" />
                        </div>
                      </td>
                      <td className="p-4 align-top pt-12">
                        <Input type="number" step="0.01" {...form.register(`items.${index}.rate`)} className="px-2" />
                      </td>
                      <td className="p-4 align-top pt-14 text-right font-medium">
                        {formatCurrency((watchItems[index]?.quantity || 0) * (watchItems[index]?.rate || 0))}
                      </td>
                      <td className="p-4 align-top pt-12 text-center">
                        <Button variant="ghost" size="icon" type="button" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive h-10 w-10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 border-t bg-muted/10">
                <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", quantity: 1, unit: "pcs", rate: 0 })} className="rounded-xl border-dashed border-2 hover:border-primary">
                  <Plus className="w-4 h-4 mr-2" /> Add Line Item
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-border/50 shadow-sm sticky top-24">
            <CardContent className="p-6">
              <h3 className="font-display font-bold text-lg mb-4">Summary</h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(calc.subtotal)}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Select onValueChange={(v) => form.setValue("discountType", v as any)} value={watchDiscountType}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat Discount</SelectItem>
                      <SelectItem value="percent">% Discount</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" {...form.register("discountValue")} className="h-9 text-right" />
                </div>
                
                {calc.discountAmount > 0 && (
                  <div className="flex justify-between items-center text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>-{formatCurrency(calc.discountAmount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <Label className="shrink-0 text-muted-foreground">Tax %</Label>
                  <Input type="number" step="0.1" {...form.register("taxPercent")} className="w-24 h-9 text-right" />
                </div>

                {calc.taxAmount > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Tax</span>
                    <span>{formatCurrency(calc.taxAmount)}</span>
                  </div>
                )}

                <div className="pt-4 border-t flex justify-between items-center">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-black text-2xl text-primary">{formatCurrency(calc.total)}</span>
                </div>
              </div>

              <hr className="my-6" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea {...form.register("notes")} placeholder="Thanks for your business!" className="text-xs resize-none" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Textarea {...form.register("paymentTerms")} placeholder="Net 30" className="text-xs resize-none" />
                </div>
                <div className="flex items-center justify-between py-2">
                  <Label>Include Bank Details</Label>
                  <Switch checked={form.watch("showBankDetails")} onCheckedChange={(c) => form.setValue("showBankDetails", c)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
