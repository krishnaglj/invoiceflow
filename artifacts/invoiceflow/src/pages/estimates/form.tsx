import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useGetEstimate, useCreateEstimate, useUpdateEstimate,
  useGetNextEstimateNumber, useListCustomers, useGetBusinessProfile, useListProducts,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { CustomerSearch } from "@/components/customer-search";
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

const itemSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  hsnCode: z.string().optional(),
  quantity: z.coerce.number().min(0.01),
  unit: z.string().default("pcs"),
  rate: z.coerce.number().min(0),
  taxRate: z.coerce.number().default(0),
});

const estimateSchema = z.object({
  customerId: z.coerce.number().optional(),
  customerName: z.string().min(2, "Customer name is required"),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerGstin: z.string().optional(),
  estimateNumber: z.string().min(1),
  estimateDate: z.string(),
  validUntil: z.string().optional(),
  placeOfSupply: z.string().optional(),
  supplyType: z.enum(["intra", "inter"]).default("intra"),
  items: z.array(itemSchema).min(1, "Add at least one item"),
  discountType: z.enum(["percent", "flat"]).default("flat"),
  discountValue: z.coerce.number().default(0),
  taxPercent: z.coerce.number().default(0),
  notes: z.string().optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected", "converted"]).default("draft"),
});

const GST_RATES = [0, 5, 12, 18, 28];

export default function EstimateForm() {
  const { id } = useParams();
  const isEditing = !!id;
  const estimateId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useGetBusinessProfile();
  const { data: customers } = useListCustomers();
  const { data: products } = useListProducts();
  const { data: nextNum } = useGetNextEstimateNumber({ query: { enabled: !isEditing } });
  const { data: existing } = useGetEstimate(estimateId, { query: { enabled: isEditing } });

  const createMut = useCreateEstimate();
  const updateMut = useUpdateEstimate();

  const form = useForm<z.infer<typeof estimateSchema>>({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      estimateDate: new Date().toISOString().split("T")[0],
      items: [{ name: "", quantity: 1, unit: "pcs", rate: 0, taxRate: 0 }],
      discountType: "flat",
      discountValue: 0,
      taxPercent: 0,
      supplyType: "intra",
      status: "draft",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  const watchItems = form.watch("items");
  const watchDiscountType = form.watch("discountType");
  const watchDiscountValue = form.watch("discountValue");
  const watchTax = form.watch("taxPercent");

  const calc = useInvoiceCalculations(
    watchItems.map((i) => ({ quantity: i.quantity || 0, rate: i.rate || 0 })),
    watchDiscountType as any,
    watchDiscountValue || 0,
    watchTax || 0
  );

  useEffect(() => {
    if (!isEditing && nextNum) {
      form.setValue("estimateNumber", nextNum.estimateNumber);
    }
  }, [nextNum, isEditing]);

  useEffect(() => {
    if (isEditing && existing) {
      form.reset({
        customerId: existing.customerId ?? undefined,
        customerName: existing.customerName ?? "",
        customerEmail: existing.customerEmail ?? undefined,
        customerPhone: existing.customerPhone ?? undefined,
        customerAddress: existing.customerAddress ?? undefined,
        customerGstin: existing.customerGstin ?? undefined,
        estimateNumber: existing.estimateNumber,
        estimateDate: existing.estimateDate,
        validUntil: existing.validUntil ?? undefined,
        placeOfSupply: existing.placeOfSupply ?? undefined,
        supplyType: existing.supplyType as "intra" | "inter",
        items: existing.items.map((item) => ({
          name: item.name,
          description: item.description ?? undefined,
          hsnCode: item.hsnCode ?? undefined,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          taxRate: item.taxRate,
        })),
        discountType: existing.discountType as "percent" | "flat",
        discountValue: existing.discountValue,
        taxPercent: existing.taxPercent,
        notes: existing.notes ?? undefined,
        status: existing.status as any,
      });
    }
  }, [existing, isEditing]);

  const handleProductSelect = (productId: number, index: number) => {
    const product = products?.find((p) => p.id === productId);
    if (!product) return;
    form.setValue(`items.${index}.name`, product.name);
    form.setValue(`items.${index}.rate`, product.defaultRate);
    form.setValue(`items.${index}.unit`, product.unit);
    if (product.hsnCode) form.setValue(`items.${index}.hsnCode`, product.hsnCode);
    if (product.taxRate) form.setValue(`items.${index}.taxRate`, product.taxRate);
  };

  const onSubmit = (values: z.infer<typeof estimateSchema>, asDraft = false) => {
    const data = {
      ...values,
      status: asDraft ? "draft" as const : values.status,
      items: values.items.map((item) => ({
        ...item,
        amount: item.quantity * item.rate,
        taxRate: item.taxRate ?? 0,
      })),
    };

    if (isEditing) {
      updateMut.mutate({ id: estimateId, data }, {
        onSuccess: () => {
          toast({ title: "Estimate updated" });
          queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
          setLocation(`/estimates/${estimateId}`);
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    } else {
      createMut.mutate({ data }, {
        onSuccess: (est) => {
          toast({ title: "Estimate created" });
          queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
          setLocation(`/estimates/${est.id}`);
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{isEditing ? "Edit Estimate" : "New Estimate"}</h1>
          <p className="text-muted-foreground mt-1">Create a quotation to share with clients.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => form.handleSubmit((v) => onSubmit(v, true))()} disabled={isPending}>
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </Button>
          <Button className="rounded-xl shadow-lg shadow-primary/20" onClick={() => { form.setValue("status", "sent"); form.handleSubmit((v) => onSubmit(v))(); }} disabled={isPending}>
            <Send className="w-4 h-4 mr-2" /> Save & Send
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* CUSTOMER */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-base">Customer Details</h3>
              <CustomerSearch
                customers={customers ?? []}
                value={form.watch("customerId")}
                onSelect={(c) => {
                  form.setValue("customerId", c.id);
                  form.setValue("customerName", c.name);
                  form.setValue("customerEmail", c.email ?? "");
                  form.setValue("customerPhone", c.phone);
                  form.setValue("customerAddress", c.address ?? "");
                  form.setValue("customerGstin", c.gstin ?? "");
                }}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Customer Name *</Label>
                  <Input {...form.register("customerName")} />
                  {form.formState.errors.customerName && <p className="text-destructive text-xs">{form.formState.errors.customerName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input {...form.register("customerPhone")} />
                </div>
                <div className="space-y-2">
                  <Label>GSTIN</Label>
                  <Input {...form.register("customerGstin")} placeholder="22AAAAA0000A1Z5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ITEMS */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-base">Line Items</h3>
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-xl space-y-3 bg-muted/20">
                  <div className="flex gap-2">
                    {products && products.length > 0 && (
                      <select
                        className="text-xs border rounded-lg px-2 py-1 bg-background text-muted-foreground flex-1"
                        onChange={(e) => handleProductSelect(parseInt(e.target.value), index)}
                        defaultValue=""
                      >
                        <option value="">Quick select product...</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    )}
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => remove(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Item Name *</Label>
                      <Input {...form.register(`items.${index}.name`)} placeholder="Product / Service" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">HSN / SAC Code</Label>
                      <Input {...form.register(`items.${index}.hsnCode`)} placeholder="e.g. 9954" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit</Label>
                      <Input {...form.register(`items.${index}.unit`)} placeholder="pcs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input type="number" step="0.01" {...form.register(`items.${index}.quantity`)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Rate (₹)</Label>
                      <Input type="number" step="0.01" {...form.register(`items.${index}.rate`)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">GST Rate (%)</Label>
                      <select className="w-full border rounded-xl px-3 py-2 text-sm bg-background" {...form.register(`items.${index}.taxRate`)}>
                        {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Amount</Label>
                      <Input readOnly value={formatCurrency((watchItems[index]?.quantity || 0) * (watchItems[index]?.rate || 0))} className="bg-muted/50" />
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" className="w-full rounded-xl border-dashed" onClick={() => append({ name: "", quantity: 1, unit: "pcs", rate: 0, taxRate: 0 })}>
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* ESTIMATE DETAILS */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-base">Estimate Details</h3>
              <div className="space-y-2">
                <Label>Estimate Number</Label>
                <Input {...form.register("estimateNumber")} />
              </div>
              <div className="space-y-2">
                <Label>Estimate Date</Label>
                <Input type="date" {...form.register("estimateDate")} />
              </div>
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Input type="date" {...form.register("validUntil")} />
              </div>
              <div className="space-y-2">
                <Label>Place of Supply</Label>
                <select className="w-full border rounded-xl px-3 py-2 text-sm bg-background" {...form.register("placeOfSupply")}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Supply Type</Label>
                <select className="w-full border rounded-xl px-3 py-2 text-sm bg-background" {...form.register("supplyType")}>
                  <option value="intra">Intra-state (CGST + SGST)</option>
                  <option value="inter">Inter-state (IGST)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* TOTALS */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold text-base">Summary</h3>
              <div className="space-y-2">
                <Label>Discount</Label>
                <div className="flex gap-2">
                  <select className="border rounded-xl px-3 text-sm bg-background" {...form.register("discountType")}>
                    <option value="flat">₹</option>
                    <option value="percent">%</option>
                  </select>
                  <Input type="number" step="0.01" {...form.register("discountValue")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tax (%)</Label>
                <Input type="number" step="0.01" {...form.register("taxPercent")} />
              </div>
              <div className="divide-y divide-border/50 text-sm space-y-1 pt-2">
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(calc.subtotal)}</span>
                </div>
                {(watchDiscountValue ?? 0) > 0 && (
                  <div className="flex justify-between py-1.5 text-destructive">
                    <span>Discount</span>
                    <span>−{formatCurrency(calc.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(calc.taxAmount)}</span>
                </div>
                <div className="flex justify-between py-2 font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(calc.total)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea {...form.register("notes")} rows={3} className="rounded-xl text-sm" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
