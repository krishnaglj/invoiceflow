import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetVendor, useCreateVendor, useUpdateVendor } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  businessName: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  gstin: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function VendorForm() {
  const params = useParams<{ id: string }>();
  const vendorId = params.id ? parseInt(params.id, 10) : undefined;
  const isEdit = !!vendorId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: vendor } = useGetVendor(vendorId!, { query: { enabled: isEdit } });
  const createMutation = useCreateVendor({
    mutation: {
      onSuccess: () => { toast({ title: "Vendor created" }); setLocation("/vendors"); },
      onError: () => toast({ title: "Failed to create vendor", variant: "destructive" }),
    },
  });
  const updateMutation = useUpdateVendor({
    mutation: {
      onSuccess: () => { toast({ title: "Vendor updated" }); setLocation("/vendors"); },
      onError: () => toast({ title: "Failed to update vendor", variant: "destructive" }),
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", businessName: "", email: "", phone: "", address: "", city: "", state: "", gstin: "", notes: "" },
  });

  useEffect(() => {
    if (vendor) reset({ name: vendor.name, businessName: vendor.businessName ?? "", email: vendor.email ?? "", phone: vendor.phone ?? "", address: vendor.address ?? "", city: vendor.city ?? "", state: vendor.state ?? "", gstin: vendor.gstin ?? "", notes: vendor.notes ?? "" });
  }, [vendor, reset]);

  const onSubmit = (data: FormData) => {
    const clean = { ...data, email: data.email || undefined };
    if (isEdit) updateMutation.mutate({ id: vendorId!, data: clean });
    else createMutation.mutate(clean);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={() => setLocation("/vendors")}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Vendors
      </Button>
      <h1 className="text-2xl font-bold mb-6">{isEdit ? "Edit Vendor" : "New Vendor"}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Vendor Name *</Label>
            <Input {...register("name")} placeholder="e.g. Ravi Traders" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Business / Company Name</Label>
            <Input {...register("businessName")} placeholder="Ravi Traders Pvt Ltd" />
          </div>
          <div className="space-y-1.5">
            <Label>GSTIN</Label>
            <Input {...register("gstin")} placeholder="22AAAAA0000A1Z5" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input {...register("phone")} placeholder="+91 98765 43210" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input {...register("email")} type="email" placeholder="vendor@example.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Address</Label>
            <Input {...register("address")} placeholder="Street address" />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input {...register("city")} placeholder="Mumbai" />
          </div>
          <div className="space-y-1.5">
            <Label>State</Label>
            <Input {...register("state")} placeholder="Maharashtra" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Notes</Label>
            <Textarea {...register("notes")} placeholder="Payment terms, contact notes..." rows={3} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Update Vendor" : "Create Vendor"}
          </Button>
          <Button type="button" variant="outline" onClick={() => setLocation("/vendors")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
