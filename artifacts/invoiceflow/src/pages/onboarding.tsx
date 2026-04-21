import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateBusinessProfile } from "@workspace/api-client-react";
import { INDIAN_STATES, generateInvoicePrefix } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Building2, MapPin, Building, ChevronRight, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  shopName: z.string().min(2, "Shop name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstin: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  accountHolder: z.string().optional(),
  invoicePrefix: z.string().default("INV-"),
  defaultTaxPercent: z.coerce.number().default(0)
});

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const createProfile = useCreateBusinessProfile();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { invoicePrefix: "INV-", defaultTaxPercent: 0 }
  });

  const prefixEdited = useRef(false);
  const shopName = form.watch("shopName");
  useEffect(() => {
    if (!prefixEdited.current && shopName && shopName.length >= 2) {
      form.setValue("invoicePrefix", generateInvoicePrefix(shopName), { shouldDirty: false });
    }
  }, [shopName, form]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    createProfile.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Profile created!", description: "Welcome to InvoiceFlow" });
        setLocation("/dashboard");
      },
      onError: (err) => {
        toast({ title: "Error", description: err.data?.error || "Something went wrong", variant: "destructive" });
      }
    });
  };

  const STEPS = [
    { id: 1, title: "Basic Info", icon: Building2 },
    { id: 2, title: "Location & Tax", icon: MapPin },
    { id: 3, title: "Bank Details", icon: Building },
  ];

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl mb-8 flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/25">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12" />
            <path d="M6 8h12" />
            <path d="M6 13l8.5 8" />
            <path d="M6 13h3a4 4 0 0 0 0-5H6" />
          </svg>
        </div>
        <h1 className="text-3xl font-display font-bold text-center">Set up your business</h1>
        <p className="text-muted-foreground mt-2 text-center">Let's configure your profile to generate your first invoice.</p>
        
        <div className="flex items-center justify-center w-full mt-10 gap-2 sm:gap-4">
          {STEPS.map((s) => (
            <div key={s.id} className="flex flex-col items-center w-24 sm:w-32 relative">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-colors ${
                step > s.id ? "bg-primary text-primary-foreground" : 
                step === s.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : 
                "bg-card border text-muted-foreground"
              }`}>
                {step > s.id ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs font-semibold mt-3 text-center ${step === s.id ? "text-foreground" : "text-muted-foreground"}`}>
                {s.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Card className="w-full max-w-2xl p-6 sm:p-8 rounded-3xl shadow-xl shadow-black/5">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Business / Shop Name *</Label>
                  <Input {...form.register("shopName")} placeholder="e.g. Acme Corp" className="h-12" />
                  {form.formState.errors.shopName && <p className="text-sm text-destructive">{form.formState.errors.shopName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Owner Name *</Label>
                  <Input {...form.register("ownerName")} placeholder="Your name" className="h-12" />
                  {form.formState.errors.ownerName && <p className="text-sm text-destructive">{form.formState.errors.ownerName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input {...form.register("email")} type="email" placeholder="contact@acme.com" className="h-12" />
                  {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input {...form.register("phone")} placeholder="9876543210" className="h-12" />
                  {form.formState.errors.phone && <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input {...form.register("address")} placeholder="123 Main St" className="h-12" />
              </div>
              <div className="grid sm:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input {...form.register("city")} placeholder="Mumbai" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select onValueChange={(v) => form.setValue("state", v)} defaultValue={form.getValues("state")}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input {...form.register("pincode")} placeholder="400001" className="h-12" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>GSTIN (Optional)</Label>
                <Input {...form.register("gstin")} placeholder="27XXXXX1234X1ZX" className="h-12 font-mono uppercase" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input {...form.register("bankName")} placeholder="HDFC Bank" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Account Holder Name</Label>
                  <Input {...form.register("accountHolder")} placeholder="Acme Corp" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input {...form.register("accountNumber")} placeholder="000111222333" className="h-12 font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input {...form.register("ifscCode")} placeholder="HDFC0001234" className="h-12 font-mono uppercase" />
                </div>
              </div>
              <hr className="my-4" />
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Invoice Prefix</Label>
                  <Input
                    {...form.register("invoicePrefix", {
                      onChange: () => { prefixEdited.current = true; }
                    })}
                    className="h-12 font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your invoices will look like: <span className="font-mono font-semibold text-foreground">{form.watch("invoicePrefix") || "INV-"}001</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Default Tax %</Label>
                  <Input {...form.register("defaultTaxPercent")} type="number" step="0.1" className="h-12" />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t mt-8">
            <Button type="button" variant="ghost" className="h-12 px-6" onClick={() => setStep(step - 1)} disabled={step === 1}>
              Back
            </Button>
            <div className="flex gap-3">
              {step < 3 && (
                <Button type="button" variant="secondary" className="h-12 px-6" onClick={() => setStep(step + 1)}>
                  Skip
                </Button>
              )}
              <Button type="submit" className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20 hover-elevate" disabled={createProfile.isPending}>
                {step === 3 ? (createProfile.isPending ? "Saving..." : "Complete Setup") : (
                  <>Next Step <ChevronRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
