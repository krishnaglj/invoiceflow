import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUpdateCustomer } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDIAN_STATES } from "@/lib/utils";
import { Save } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Phone is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  businessName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  gstin: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  businessName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  gstin?: string | null;
}

interface EditCustomerDialogProps {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCustomerDialog({ customer, open, onOpenChange }: EditCustomerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMut = useUpdateCustomer();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || "",
        businessName: customer.businessName || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        gstin: customer.gstin || "",
      });
    }
  }, [open, customer, form]);

  const onSubmit = (data: FormData) => {
    updateMut.mutate(
      { id: customer.id, data },
      {
        onSuccess: () => {
          toast({ title: "Customer updated" });
          queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
          queryClient.invalidateQueries({ queryKey: [`/api/customers/${customer.id}`] });
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "Failed to update", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold">Edit Customer</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Contact Name <span className="text-destructive">*</span></Label>
              <Input {...form.register("name")} className="h-10" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Phone <span className="text-destructive">*</span></Label>
              <Input {...form.register("phone")} className="h-10" />
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...form.register("email")} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Business Name</Label>
              <Input {...form.register("businessName")} className="h-10" />
            </div>
          </div>

          <div className="pt-1 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Address</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Street</Label>
                <Input {...form.register("address")} className="h-10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input {...form.register("city")} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Select
                    onValueChange={(v) => form.setValue("state", v)}
                    value={form.watch("state") || ""}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>GSTIN</Label>
            <Input {...form.register("gstin")} className="h-10 font-mono uppercase" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl shadow-md shadow-primary/20"
              disabled={updateMut.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMut.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
