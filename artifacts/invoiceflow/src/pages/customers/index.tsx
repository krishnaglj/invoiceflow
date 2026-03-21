import { useState } from "react";
import { Link } from "wouter";
import { useListCustomers, useCreateCustomer } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Mail, Phone, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";

const customerSchema = z.object({
  name: z.string().min(2, "Name required"),
  phone: z.string().min(10, "Phone required"),
  email: z.string().optional(),
  businessName: z.string().optional(),
});

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useListCustomers({ search: search || undefined });
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMut = useCreateCustomer();

  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema)
  });

  const onSubmit = (data: z.infer<typeof customerSchema>) => {
    createMut.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Customer added" });
        queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
        setIsOpen(false);
        form.reset();
      }
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage your client directory.</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20 hover-elevate">
              <Plus className="w-5 h-5 mr-2" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Contact Name *</Label>
                <Input {...form.register("name")} />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input {...form.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" {...form.register("email")} />
              </div>
              <div className="space-y-2">
                <Label>Business Name (Optional)</Label>
                <Input {...form.register("businessName")} />
              </div>
              <Button type="submit" className="w-full mt-4" disabled={createMut.isPending}>Save Customer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search by name, phone or company..." 
          className="pl-9 h-11 rounded-xl bg-card border-border/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers?.map((c) => (
          <Link key={c.id} href={`/customers/${c.id}`}>
            <Card className="rounded-2xl hover:border-primary/50 transition-colors cursor-pointer hover-elevate overflow-hidden border-border/50 group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary font-bold text-lg group-hover:scale-110 transition-transform">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{c.name}</h3>
                    {c.businessName && <p className="text-sm text-muted-foreground truncate flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" /> {c.businessName}</p>}
                  </div>
                </div>
                
                <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {c.phone}</p>
                  {c.email && <p className="flex items-center gap-2 truncate"><Mail className="w-4 h-4 shrink-0" /> {c.email}</p>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {customers?.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-2xl">
            No customers found.
          </div>
        )}
      </div>
    </div>
  );
}
