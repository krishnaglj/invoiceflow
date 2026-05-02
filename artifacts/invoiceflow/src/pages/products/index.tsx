import { useState } from "react";
import { useListProducts, useCreateProduct, useDeleteProduct } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Trash2, PackageSearch } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const GST_RATES = [0, 5, 12, 18, 28];

const productSchema = z.object({
  name: z.string().min(2, "Required"),
  description: z.string().optional(),
  defaultRate: z.coerce.number().min(0),
  unit: z.string().default("pcs"),
  hsnCode: z.string().optional(),
  taxRate: z.coerce.number().default(0),
});

export default function Products() {
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useListProducts({ search: search || undefined });
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMut = useCreateProduct();
  const deleteMut = useDeleteProduct();

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { unit: "pcs", defaultRate: 0, taxRate: 0 },
  });

  const onSubmit = (data: z.infer<typeof productSchema>) => {
    createMut.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Product added" });
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        setIsOpen(false);
        form.reset({ unit: "pcs", defaultRate: 0, taxRate: 0 });
      },
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this item from library?")) {
      deleteMut.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/products"] }),
      });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Products & Services</h1>
          <p className="text-muted-foreground mt-1">Items you frequently invoice for.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20 hover-elevate">
              <Plus className="w-5 h-5 mr-2" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Add to Library</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input {...form.register("name")} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input {...form.register("description")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Rate (₹) *</Label>
                  <Input type="number" step="0.01" {...form.register("defaultRate")} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input {...form.register("unit")} placeholder="pcs, hr, kg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>HSN / SAC Code</Label>
                  <Input {...form.register("hsnCode")} placeholder="e.g. 9954" />
                </div>
                <div className="space-y-2">
                  <Label>GST Rate (%)</Label>
                  <Controller
                    control={form.control}
                    name="taxRate"
                    render={({ field }) => (
                      <Select value={String(field.value)} onValueChange={(v) => field.onChange(parseFloat(v))}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GST_RATES.map((r) => (
                            <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full mt-4" disabled={createMut.isPending}>Save Item</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          className="pl-9 h-11 rounded-xl bg-card border-border/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products?.map((p) => (
          <Card key={p.id} className="rounded-2xl border-border/50 shadow-sm hover-elevate group">
            <CardContent className="p-5 flex flex-col h-full">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{p.name}</h3>
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  onClick={() => handleDelete(p.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {p.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{p.description}</p>
              )}
              <div className="mt-auto pt-3 space-y-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase bg-muted/50 px-2 py-1 rounded-md">{p.unit}</span>
                    {p.hsnCode && (
                      <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">HSN: {p.hsnCode}</span>
                    )}
                  </div>
                  <span className="text-xl font-display font-bold text-primary">{formatCurrency(p.defaultRate)}</span>
                </div>
                {p.taxRate > 0 && (
                  <div className="flex justify-end">
                    <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30">GST {p.taxRate}%</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {products?.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
              <PackageSearch className="w-8 h-8 text-primary/40" />
            </div>
            <p className="font-medium text-lg text-foreground">Library empty</p>
            <p>Add products to quickly build invoices.</p>
          </div>
        )}
      </div>
    </div>
  );
}
