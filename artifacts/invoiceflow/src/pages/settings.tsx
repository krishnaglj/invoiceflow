import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetBusinessProfile, useUpdateBusinessProfile } from "@workspace/api-client-react";
import { INDIAN_STATES } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Save } from "lucide-react";

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
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  accountHolder: z.string().optional(),
  invoicePrefix: z.string(),
  defaultTaxPercent: z.coerce.number(),
  defaultNotes: z.string().optional(),
  defaultPaymentTerms: z.string().optional(),
});

export default function Settings() {
  const { data: profile, isLoading } = useGetBusinessProfile();
  const updateMut = useUpdateBusinessProfile();
  const { toast } = useToast();

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
        bankName: profile.bankName || "",
        accountNumber: profile.accountNumber || "",
        ifscCode: profile.ifscCode || "",
        accountHolder: profile.accountHolder || "",
        defaultNotes: profile.defaultNotes || "",
        defaultPaymentTerms: profile.defaultPaymentTerms || "",
      });
    }
  }, [profile, form]);

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
          <TabsList className="h-12 bg-card border rounded-xl mb-6 p-1">
            <TabsTrigger value="general" className="h-10 rounded-lg px-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Business Profile</TabsTrigger>
            <TabsTrigger value="bank" className="h-10 rounded-lg px-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Bank Details</TabsTrigger>
            <TabsTrigger value="invoice" className="h-10 rounded-lg px-6 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Invoice Defaults</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Details that appear on your invoices.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                  <div className="space-y-2"><Label>City</Label><Input {...form.register("city")} /></div>
                  <div className="space-y-2"><Label>State</Label>
                    <Select onValueChange={(v) => form.setValue("state", v)} value={form.watch("state")}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
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
                  <div className="space-y-2"><Label>Invoice Number Prefix</Label><Input {...form.register("invoicePrefix")} className="font-mono"/></div>
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
