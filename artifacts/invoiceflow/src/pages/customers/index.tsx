import { useState } from "react";
import { Link } from "wouter";
import { useListCustomers, useCreateCustomer } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Mail, Phone, Building2, Pencil, Download } from "lucide-react";

function downloadCSV(rows: (string | number | undefined | null)[][], filename: string) {
  const content = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
import { EditCustomerDialog } from "@/components/edit-customer-dialog";
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
  const [editingCustomer, setEditingCustomer] = useState<{ id: number; name: string; phone: string; email?: string | null; businessName?: string | null; address?: string | null; city?: string | null; state?: string | null; gstin?: string | null } | null>(null);
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
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline" className="rounded-xl h-10 px-3"
            onClick={() => {
              const rows: (string | number | undefined | null)[][] = [
                ["Name", "Business", "Phone", "Email", "GSTIN", "City", "State"],
                ...(customers ?? []).map((c) => [
                  c.name, c.businessName, c.phone, c.email, c.gstin, c.city, c.state,
                ]),
              ];
              downloadCSV(rows, `customers-${new Date().toISOString().split("T")[0]}.csv`);
            }}
          >
            <Download className="w-4 h-4 sm:mr-2 shrink-0" /><span className="hidden sm:inline">Export CSV</span>
          </Button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20 hover-elevate h-10 px-3 sm:px-4">
              <Plus className="w-5 h-5 mr-1.5 shrink-0" /><span className="hidden sm:inline">Add </span>Customer
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

      {editingCustomer && (
        <EditCustomerDialog
          customer={editingCustomer}
          open={!!editingCustomer}
          onOpenChange={(open) => { if (!open) setEditingCustomer(null); }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers?.map((c) => (
          <Card key={c.id} className="rounded-2xl hover:border-primary/50 transition-colors border-border/50 group overflow-hidden hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Link href={`/customers/${c.id}`} className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary font-bold text-lg group-hover:scale-110 transition-transform shrink-0">
                  {c.name.charAt(0)}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/customers/${c.id}`} className="block">
                    <h3 className="font-bold text-lg truncate hover:text-primary transition-colors">{c.name}</h3>
                    {c.businessName && <p className="text-sm text-muted-foreground truncate flex items-center gap-1 mt-0.5"><Building2 className="w-3 h-3" /> {c.businessName}</p>}
                  </Link>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8 rounded-lg text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.preventDefault(); setEditingCustomer(c); }}
                  title="Edit customer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2 text-foreground/80"><Phone className="w-4 h-4" /> {c.phone}</p>
                {c.email && <p className="flex items-center gap-2 truncate"><Mail className="w-4 h-4 shrink-0" /> {c.email}</p>}
              </div>
            </CardContent>
          </Card>
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
