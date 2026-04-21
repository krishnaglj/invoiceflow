import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetBusinessProfile, useUpdateBusinessProfile } from "@workspace/api-client-react";
import { INDIAN_STATES, INDIAN_CITIES, generateInvoicePrefix } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/searchable-select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";
import { Save, Upload, X, ImagePlus, RefreshCw } from "lucide-react";

const schema = z.object({
  shopName: z.string().min(2),
  ownerName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstin: z.string().optional(),
  logoUrl: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  accountHolder: z.string().optional(),
  upiId: z.string().optional(),
  invoicePrefix: z.string(),
  defaultTaxPercent: z.coerce.number(),
  defaultNotes: z.string().optional(),
  defaultPaymentTerms: z.string().optional(),
});

export default function Settings() {
  const { data: profile, isLoading } = useGetBusinessProfile();
  const updateMut = useUpdateBusinessProfile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema)
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        ...profile,
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        pincode: profile.pincode || "",
        gstin: profile.gstin || "",
        logoUrl: profile.logoUrl || "",
        bankName: profile.bankName || "",
        accountNumber: profile.accountNumber || "",
        ifscCode: profile.ifscCode || "",
        accountHolder: profile.accountHolder || "",
        upiId: profile.upiId || "",
        defaultNotes: profile.defaultNotes || "",
        defaultPaymentTerms: profile.defaultPaymentTerms || "",
      });
    }
  }, [profile, form]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast({ title: "Image too large", description: "Please use an image under 500 KB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => form.setValue("logoUrl", reader.result as string, { shouldDirty: true });
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: z.infer<typeof schema>) => {
    updateMut.mutate({ data }, {
      onSuccess: () => toast({ title: "Settings saved successfully" }),
      onError: () => toast({ title: "Failed to save", variant: "destructive" })
    });
  };

  if (isLoading) return null;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your business profile and preferences.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="general" className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-6">
            <TabsList className="h-12 bg-card border rounded-xl p-1 w-max min-w-full">
              <TabsTrigger value="general" className="h-10 rounded-lg px-4 md:px-6 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary whitespace-nowrap">Business Profile</TabsTrigger>
              <TabsTrigger value="bank" className="h-10 rounded-lg px-4 md:px-6 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary whitespace-nowrap">Bank Details</TabsTrigger>
              <TabsTrigger value="invoice" className="h-10 rounded-lg px-4 md:px-6 text-sm data-[state=active]:bg-primary/10 data-[state=active]:text-primary whitespace-nowrap">Invoice Defaults</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="general">
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Details that appear on your invoices.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label>Business Logo <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <div className="flex items-center gap-5">
                    {/* Preview */}
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
                      {form.watch("logoUrl") ? (
                        <img src={form.watch("logoUrl")} alt="Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <ImagePlus className="w-6 h-6" />
                          <span className="text-[10px] text-center leading-tight">No logo</span>
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={handleLogoChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-9 gap-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4" />
                        {form.watch("logoUrl") ? "Change Logo" : "Upload Logo"}
                      </Button>
                      {form.watch("logoUrl") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-xl h-9 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => form.setValue("logoUrl", "", { shouldDirty: true })}
                        >
                          <X className="w-4 h-4" /> Remove
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">PNG, JPG, SVG · Max 500 KB</p>
                    </div>
                  </div>
                </div>

                <hr className="border-border/50" />
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2"><Label>Business Name</Label><Input {...form.register("shopName")} /></div>
                  <div className="space-y-2"><Label>Owner Name</Label><Input {...form.register("ownerName")} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input {...form.register("email")} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input {...form.register("phone")} /></div>
                  <div className="space-y-2"><Label>GSTIN</Label><Input {...form.register("gstin")} className="font-mono uppercase"/></div>
                </div>
                <hr className="border-border/50" />
                <h3 className="font-medium">Address</h3>
                <div className="space-y-2"><Label>Street</Label><Input {...form.register("address")} /></div>
                <div className="grid sm:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <SearchableSelect
                      options={INDIAN_CITIES}
                      value={form.watch("city") || ""}
                      onChange={(v) => form.setValue("city", v)}
                      placeholder="Select city"
                      searchPlaceholder="Search city..."
                      allowClear
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <SearchableSelect
                      options={INDIAN_STATES}
                      value={form.watch("state") || ""}
                      onChange={(v) => form.setValue("state", v)}
                      placeholder="Select state"
                      searchPlaceholder="Search state..."
                      allowClear
                    />
                  </div>
                  <div className="space-y-2"><Label>Pincode</Label><Input {...form.register("pincode")} /></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank">
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
                <CardDescription>Where your customers should send payments.</CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-2"><Label>Bank Name</Label><Input {...form.register("bankName")} /></div>
                <div className="space-y-2"><Label>Account Holder</Label><Input {...form.register("accountHolder")} /></div>
                <div className="space-y-2"><Label>Account Number</Label><Input {...form.register("accountNumber")} className="font-mono"/></div>
                <div className="space-y-2"><Label>IFSC Code</Label><Input {...form.register("ifscCode")} className="font-mono uppercase"/></div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>UPI ID</Label>
                  <Input {...form.register("upiId")} placeholder="yourname@upi" className="font-mono" />
                  <p className="text-xs text-muted-foreground">Shown on invoice for UPI/QR payments</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoice">
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle>Invoice Defaults</CardTitle>
                <CardDescription>Default values pre-filled when creating new invoices.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label>Invoice Number Prefix</Label>
                    <div className="flex gap-2">
                      <Input {...form.register("invoicePrefix")} className="font-mono" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 rounded-xl"
                        title="Regenerate from business name"
                        onClick={() => {
                          const name = form.getValues("shopName");
                          if (name) form.setValue("invoicePrefix", generateInvoicePrefix(name), { shouldDirty: true });
                        }}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Preview: <span className="font-mono font-semibold text-foreground">{form.watch("invoicePrefix") || "INV-"}001</span>
                      <span className="ml-2 text-[10px] text-muted-foreground/70">· Includes financial year for easy tracking</span>
                    </p>
                  </div>
                  <div className="space-y-2"><Label>Default Tax %</Label><Input type="number" step="0.1" {...form.register("defaultTaxPercent")} /></div>
                </div>
                <div className="space-y-2"><Label>Default Notes</Label><Input {...form.register("defaultNotes")} /></div>
                <div className="space-y-2"><Label>Default Terms & Conditions</Label><Input {...form.register("defaultPaymentTerms")} /></div>
              </CardContent>
            </Card>
          </TabsContent>

          <div className="mt-6 flex justify-end">
            <Button type="submit" className="rounded-xl shadow-lg shadow-primary/20 h-12 px-8" disabled={updateMut.isPending}>
              <Save className="w-5 h-5 mr-2" /> Save Changes
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  );
}
