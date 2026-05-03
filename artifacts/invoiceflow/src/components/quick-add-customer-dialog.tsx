import { useState } from "react";
import { useCreateCustomer, useListCustomers } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  initialName?: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (customer: { id: number; name: string; phone?: string; email?: string; gstin?: string; address?: string }) => void;
}

export function QuickAddCustomerDialog({ open, initialName = "", onOpenChange, onCreated }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMut = useCreateCustomer();

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");

  const reset = () => { setName(initialName); setPhone(""); setEmail(""); setGstin(""); setAddress(""); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast({ title: "Customer name is required", variant: "destructive" }); return; }
    createMut.mutate(
      { data: { name: name.trim(), phone: phone.trim() || "", email: email.trim() || undefined, gstin: gstin.trim() || undefined, address: address.trim() || undefined } },
      {
        onSuccess: (customer) => {
          toast({ title: `${customer.name} added` });
          queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
          onCreated({ id: customer.id, name: customer.name, phone: customer.phone || undefined, email: customer.email || undefined, gstin: customer.gstin || undefined, address: customer.address || undefined });
          onOpenChange(false);
          reset();
        },
        onError: () => toast({ title: "Failed to add customer", variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name or business name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" inputMode="tel" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>GSTIN</Label>
            <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="e.g. 27AABCU9603R1ZX" className="uppercase" />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, State" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1" disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Customer
            </Button>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); reset(); }}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
