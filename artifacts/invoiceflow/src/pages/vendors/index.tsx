import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListVendors, useDeleteVendor } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Truck, Pencil, Trash2, Building2, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function VendorsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: vendors = [], isLoading, refetch } = useListVendors({ search: search || undefined });
  const deleteMutation = useDeleteVendor({
    mutation: {
      onSuccess: () => { toast({ title: "Vendor deleted" }); refetch(); setDeleteId(null); },
      onError: () => toast({ title: "Failed to delete vendor", variant: "destructive" }),
    },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Vendors</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your suppliers and vendors</p>
        </div>
        <Button onClick={() => setLocation("/vendors/new")}>
          <Plus className="w-4 h-4 mr-2" /> Add Vendor
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search vendors..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading vendors...</div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card">
          <Truck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="font-semibold text-lg mb-1">No vendors yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Add your first supplier to start raising purchase orders</p>
          <Button onClick={() => setLocation("/vendors/new")}><Plus className="w-4 h-4 mr-2" />Add Vendor</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {vendors.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-4 border rounded-xl bg-card hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{v.name}</span>
                    {v.businessName && <span className="text-sm text-muted-foreground">({v.businessName})</span>}
                    {v.gstin && <Badge variant="outline" className="text-xs">{v.gstin}</Badge>}
                  </div>
                  <div className="flex gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                    {v.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{v.phone}</span>}
                    {v.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{v.email}</span>}
                    {v.city && <span>{v.city}{v.state ? `, ${v.state}` : ""}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 ml-2">
                <Button variant="ghost" size="icon" onClick={() => setLocation(`/vendors/${v.id}/edit`)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(v.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vendor?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the vendor. Purchase orders linked to this vendor will not be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
