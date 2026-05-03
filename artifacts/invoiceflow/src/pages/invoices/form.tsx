import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useGetInvoice, useCreateInvoice, useUpdateInvoice,
  useGetNextInvoiceNumber, useListCustomers, useGetBusinessProfile, useListProducts,
  useCreateCustomer,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Send, UserPlus } from "lucide-react";
import { CustomerSearch } from "@/components/customer-search";
import { QuickAddCustomerDialog } from "@/components/quick-add-customer-dialog";
import { QuickAddProductDialog } from "@/components/quick-add-product-dialog";
import { useToast } from "@/hooks/use-toast";
import { useInvoiceCalculations } from "@/hooks/use-invoice-calc";
import { formatCurrency } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra",
  "Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim",
  "Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

const GST_RATES = [0, 5, 12, 18, 28];

const itemSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  hsnCode: z.string().optional(),
  quantity: z.coerce.number().min(0.01),
  unit: z.string().default("pcs"),
  rate: z.coerce.number().min(0),
  taxRate: z.coerce.number().default(0),
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
  placeOfSupply: z.string().optional(),
  supplyType: z.enum(["intra", "inter"]).default("intra"),
  items: z.array(itemSchema).min(1, "Add at least one item"),
  discountType: z.enum(["percent", "flat"]).default("flat"),
  discountValue: z.coerce.number().default(0),
  taxPercent: z.coerce.number().default(0),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  showBankDetails: z.boolean().default(true),
  status: z.enum(["draft", "sent", "paid", "overdue", "partial"]).default("draft"),
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
  const saveCustomerMut = useCreateCustomer();

  const [quickCustomer, setQuickCustomer] = useState<{ open: boolean; name: string }>({ open: false, name: "" });
  const [quickProduct, setQuickProduct] = useState<{ open: boolean; itemIndex: number }>({ open: false, itemIndex: 0 });

  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceDate: new Date().toISOString().split("T")[0],
      items: [{ name: "", quantity: 1, unit: "pcs", rate: 0, taxRate: 0 }],
      discountType: "flat",
      discountValue: 0,
      taxPercent: 0,
      showBankDetails: true,
      supplyType: "intra",
      status: "draft",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  const watchItems = form.watch("items");
  const watchDiscountType = form.watch("discountType");
  const watchDiscountValue = form.watch("discountValue");
  const watchTax = form.watch("taxPercent");
  const watchSupplyType = form.watch("supplyType");

  const calc = useInvoiceCalculations(
    watchItems.map((i) => ({ quantity: i.quantity || 0, rate: i.rate || 0 })),
    watchDiscountType as any,
    watchDiscountValue || 0,
    watchTax || 0,
  );

  useEffect(() => {
    if (isEditing && existingInvoice) {
      const sanitize = (v: unknown) => (v === null ? undefined : v);
      form.reset({
        customerId: existingInvoice.customerId ?? undefined,
        customerName: existingInvoice.customerName ?? "",
        customerEmail: sanitize(existingInvoice.customerEmail) as string | undefined,
        customerPhone: sanitize(existingInvoice.customerPhone) as string | undefined,
        customerAddress: sanitize(existingInvoice.customerAddress) as string | undefined,
        customerGstin: sanitize(existingInvoice.customerGstin) as string | undefined,
        invoiceNumber: existingInvoice.invoiceNumber,
        invoiceDate: existingInvoice.invoiceDate.split("T")[0],
        dueDate: existingInvoice.dueDate ? existingInvoice.dueDate.split("T")[0] : undefined,
        placeOfSupply: sanitize(existingInvoice.placeOfSupply) as string | undefined,
        supplyType: (existingInvoice.supplyType as "intra" | "inter") ?? "intra",
        discountType: (existingInvoice.discountType as "percent" | "flat") ?? "flat",
        discountValue: existingInvoice.discountValue ?? 0,
        taxPercent: existingInvoice.taxPercent ?? 0,
        notes: sanitize(existingInvoice.notes) as string | undefined,
        paymentTerms: sanitize(existingInvoice.paymentTerms) as string | undefined,
        showBankDetails: existingInvoice.showBankDetails ?? true,
        status: (existingInvoice.status as any) ?? "draft",
        items: (existingInvoice.items ?? []).map((item) => ({
          name: item.name,
          description: sanitize(item.description) as string | undefined,
          hsnCode: sanitize(item.hsnCode) as string | undefined,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          taxRate: item.taxRate ?? 0,
        })),
      });
    } else if (!isEditing && nextNum && profile) {
      form.setValue("invoiceNumber", nextNum.invoiceNumber);
      form.setValue("taxPercent", profile.defaultTaxPercent);
      form.setValue("notes", profile.defaultNotes || "");
      form.setValue("paymentTerms", profile.defaultPaymentTerms || "");
    }
  }, [isEditing, existingInvoice, nextNum, profile]);

  const handleSaveAsCustomer = () => {
    const name = form.getValues("customerName").trim();
    if (!name) return;
    saveCustomerMut.mutate(
      { data: {
        name,
        phone: form.getValues("customerPhone") || "",
        email: form.getValues("customerEmail") || undefined,
        gstin: form.getValues("customerGstin") || undefined,
        address: form.getValues("customerAddress") || undefined,
      }},
      {
        onSuccess: (c) => {
          form.setValue("customerId", c.id);
          queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
          toast({ title: "Customer saved!", description: `${c.name} added to your customers.` });
        },
        onError: () => {
          toast({ title: "Failed to save customer", variant: "destructive" });
        },
      }
    );
  };

  const handleCustomerSelect = (custId: string) => {
    const c = customers?.find((c) => c.id.toString() === custId);
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
    const p = products?.find((p) => p.id.toString() === prodId);
    if (p) {
      form.setValue(`items.${index}.name`, p.name);
      form.setValue(`items.${index}.description`, p.description || "");
      form.setValue(`items.${index}.rate`, p.defaultRate);
      form.setValue(`items.${index}.unit`, p.unit);
      if (p.hsnCode) form.setValue(`items.${index}.hsnCode`, p.hsnCode);
      if (p.taxRate) form.setValue(`items.${index}.taxRate`, p.taxRate);
    }
  };

  const onSubmit = (data: z.infer<typeof invoiceSchema>, action: "draft" | "sent") => {
    const payload = {
      ...data,
      status: action as any,
      items: data.items.map((item) => ({
        ...item,
        amount: item.quantity * item.rate,
        taxRate: item.taxRate ?? 0,
      })),
    };

    const mut = isEditing ? updateMut.mutate : createMut.mutate;
    const args = isEditing ? { id: invoiceId, data: payload } : { data: payload };

    (mut as any)(args, {
      onSuccess: (res: any) => {
        toast({ title: `Invoice ${isEditing ? "updated" : "created"}!` });
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
        setLocation(`/invoices/${res.id}`);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.data?.error || "Failed to save", variant: "destructive" });
      },
    });
  };

  const cgst = calc.taxAmount / 2;
  const sgst = calc.taxAmount / 2;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold">{isEditing ? "Edit Invoice" : "New Invoice"}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl bg-card flex-1 sm:flex-none" onClick={form.handleSubmit((d) => onSubmit(d, "draft"))} disabled={createMut.isPending || updateMut.isPending}>
            <Save className="w-4 h-4 mr-1.5" /> Draft
          </Button>
          <Button className="rounded-xl shadow-lg shadow-primary/20 flex-1 sm:flex-none" onClick={form.handleSubmit((d) => onSubmit(d, "sent"))} disabled={createMut.isPending || updateMut.isPending}>
            <Send className="w-4 h-4 mr-1.5" /> Save & Send
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── MAIN COLUMN ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* CUSTOMER + INVOICE META */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Bill To */}
                <div className="space-y-4 border p-4 rounded-xl bg-muted/20">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Bill To</h3>
                  <div className="space-y-3">
                    <CustomerSearch
                      customers={customers ?? []}
                      selectedId={form.watch("customerId")}
                      onSelect={handleCustomerSelect}
                      onCreateNew={(name) => setQuickCustomer({ open: true, name })}
                      onClear={() => {
                        form.setValue("customerId", undefined);
                        form.setValue("customerName", "");
                        form.setValue("customerPhone", "");
                        form.setValue("customerEmail", "");
                        form.setValue("customerAddress", "");
                        form.setValue("customerGstin", "");
                      }}
                    />
                    <Input {...form.register("customerName")} placeholder="Customer Name *" className="bg-background font-medium" />
                    <Input {...form.register("customerPhone")} placeholder="Phone" className="bg-background" />
                    <Input {...form.register("customerGstin")} placeholder="GSTIN (optional)" className="bg-background text-sm" />
                    <Textarea {...form.register("customerAddress")} placeholder="Address" className="bg-background resize-none h-16" />
                    {!form.watch("customerId") && form.watch("customerName")?.trim().length >= 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl border-primary/40 text-primary hover:bg-primary/5"
                        onClick={handleSaveAsCustomer}
                        disabled={saveCustomerMut.isPending}
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-2" />
                        {saveCustomerMut.isPending ? "Saving..." : "Save as Customer"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="space-y-4 border p-4 rounded-xl bg-muted/20">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Invoice Details</h3>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Invoice No.</Label>
                      <Input {...form.register("invoiceNumber")} className="bg-background font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Date</Label>
                        <Input type="date" {...form.register("invoiceDate")} className="bg-background" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Due Date</Label>
                        <Input type="date" {...form.register("dueDate")} className="bg-background" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Place of Supply</Label>
                      <select className="w-full border rounded-xl px-3 py-2 text-sm bg-background" {...form.register("placeOfSupply")}>
                        <option value="">Select state</option>
                        {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Supply Type</Label>
                      <select className="w-full border rounded-xl px-3 py-2 text-sm bg-background" {...form.register("supplyType")}>
                        <option value="intra">Intra-state (CGST+SGST)</option>
                        <option value="inter">Inter-state (IGST)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LINE ITEMS */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 space-y-3 group">
                    <Select onValueChange={(v) => {
                      if (v === "__new__") { setQuickProduct({ open: true, itemIndex: index }); }
                      else { handleProductSelect(index, v); }
                    }}>
                      <SelectTrigger className="h-9 text-xs bg-muted/30">
                        <SelectValue placeholder="Pick from product library or add new..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(products ?? []).map((p) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                        <SelectItem value="__new__" className="text-primary font-medium">
                          + Add new product to library
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2 items-center">
                      <Input {...form.register(`items.${index}.name`)} placeholder="Item name *" className="flex-1 font-medium" />
                      <Button variant="ghost" size="icon" type="button" onClick={() => remove(index)} className="shrink-0 text-muted-foreground hover:text-destructive h-9 w-9">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <Input {...form.register(`items.${index}.description`)} placeholder="Optional" className="text-sm h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">HSN / SAC Code</Label>
                        <Input {...form.register(`items.${index}.hsnCode`)} placeholder="e.g. 9954" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">GST Rate</Label>
                        <select className="w-full border rounded-xl px-3 h-9 text-sm bg-background" {...form.register(`items.${index}.taxRate`)}>
                          {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Qty</Label>
                        <Input type="number" step="0.01" inputMode="decimal" {...form.register(`items.${index}.quantity`)} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Unit</Label>
                        <Input {...form.register(`items.${index}.unit`)} placeholder="pcs" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Rate (₹)</Label>
                        <Input type="number" step="0.01" inputMode="decimal" {...form.register(`items.${index}.rate`)} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Amount</Label>
                        <div className="h-9 flex items-center rounded-xl border bg-muted/30 px-3 font-semibold text-primary text-sm">
                          {formatCurrency((watchItems[index]?.quantity || 0) * (watchItems[index]?.rate || 0))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t bg-muted/10">
                <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", quantity: 1, unit: "pcs", rate: 0, taxRate: 0 })} className="rounded-xl border-dashed border-2 hover:border-primary">
                  <Plus className="w-4 h-4 mr-2" /> Add Line Item
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── SIDEBAR SUMMARY ── */}
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
                    <span>−{formatCurrency(calc.discountAmount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <Label className="shrink-0 text-muted-foreground">Tax %</Label>
                  <Input type="number" step="0.1" {...form.register("taxPercent")} className="w-24 h-9 text-right" />
                </div>

                {calc.taxAmount > 0 && (
                  watchSupplyType === "inter" ? (
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>IGST ({watchTax}%)</span>
                      <span>{formatCurrency(calc.taxAmount)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>CGST ({(watchTax || 0) / 2}%)</span>
                        <span>{formatCurrency(cgst)}</span>
                      </div>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>SGST ({(watchTax || 0) / 2}%)</span>
                        <span>{formatCurrency(sgst)}</span>
                      </div>
                    </>
                  )
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

      {/* Quick-add dialogs */}
      <QuickAddCustomerDialog
        open={quickCustomer.open}
        initialName={quickCustomer.name}
        onOpenChange={(open) => setQuickCustomer((s) => ({ ...s, open }))}
        onCreated={(customer) => {
          form.setValue("customerId", customer.id);
          form.setValue("customerName", customer.name);
          form.setValue("customerPhone", customer.phone ?? "");
          form.setValue("customerEmail", customer.email ?? "");
          form.setValue("customerGstin", customer.gstin ?? "");
          form.setValue("customerAddress", customer.address ?? "");
        }}
      />

      <QuickAddProductDialog
        open={quickProduct.open}
        onOpenChange={(open) => setQuickProduct((s) => ({ ...s, open }))}
        onCreated={(product) => {
          const i = quickProduct.itemIndex;
          form.setValue(`items.${i}.name`, product.name);
          form.setValue(`items.${i}.rate`, product.defaultRate);
          form.setValue(`items.${i}.unit`, product.unit);
          if (product.hsnCode) form.setValue(`items.${i}.hsnCode`, product.hsnCode);
          if (product.taxRate) form.setValue(`items.${i}.taxRate`, product.taxRate);
          if (product.description) form.setValue(`items.${i}.description`, product.description);
        }}
      />
    </div>
  );
}
