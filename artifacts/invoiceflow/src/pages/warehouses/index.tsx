import { useState } from "react";
import { useListWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Warehouse, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type WForm = { name: string; location: string; isDefault: boolean };

export default function WarehousesPage() {
  const { toast } = useToast();
  const { data: warehouses = [], isLoading, refetch } = useListWarehouses();
  const createMutation = useCreateWarehouse({ mutation: { onSuccess: () => { refetch(); setOpen(false); toast({ title: "Warehouse created" }); }, onError: () => toast({ title: "Error", variant: "destructive" }) } });
  const updateMutation = useUpdateWarehouse({ mutation: { onSuccess: () => { refetch(); setEditItem(null); toast({ title: "Warehouse updated" }); }, onError: () => toast({ title: "Error", variant: "destructive" }) } });
  const deleteMutation = useDeleteWarehouse({ mutation: { onSuccess: () => { refetch(); setDeleteId(null); toast({ title: "Warehouse deleted" }); }, onError: () => toast({ title: "Error", variant: "destructive" }) } });

  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<{ id: number } & WForm | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<WForm>({ name: "", location: "", isDefault: false });

  const openCreate = () => { setForm({ name: "", location: "", isDefault: warehouses.length === 0 }); setOpen(true); };
  const openEdit = (w: typeof warehouses[0]) => { setEditItem({ id: w.id, name: w.name, location: w.location ?? "", isDefault: w.isDefault }); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    createMutation.mutate(form);
  };

  const handleUpdate = () => {
    if (!editItem || !editItem.name.trim()) return;
    updateMutation.mutate({ id: editItem.id, data: { name: editItem.name, location: editItem.location, isDefault: editItem.isDefault } });
  };

  const handleSetDefault = (id: number) => {
    updateMutation.mutate({ id, data: { isDefault: true } }, { onSuccess: () => { refetch(); toast({ title: "Default warehouse updated" }); } });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Warehouses</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage stock locations</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Warehouse</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : warehouses.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card">
          <Warehouse className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="font-semibold text-lg mb-1">No warehouses yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Create at least one warehouse to track stock locations</p>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Warehouse</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {warehouses.map((w) => (
            <div key={w.id} className="flex items-center justify-between p-4 border rounded-xl bg-card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Warehouse className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{w.name}</span>
                    {w.isDefault && <Badge variant="secondary" className="text-xs"><Star className="w-3 h-3 mr-1" />Default</Badge>}
                  </div>
                  {w.location && <p className="text-sm text-muted-foreground">{w.location}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                {!w.isDefault && (
                  <Button variant="ghost" size="sm" onClick={() => handleSetDefault(w.id)} className="text-xs">Set Default</Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => openEdit(w)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(w.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Warehouse</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Warehouse" />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Mumbai, Maharashtra" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
              <span className="text-sm">Set as default warehouse</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Warehouse</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={editItem.name} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input value={editItem.location} onChange={(e) => setEditItem({ ...editItem, location: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editItem.isDefault} onChange={(e) => setEditItem({ ...editItem, isDefault: e.target.checked })} />
                <span className="text-sm">Set as default warehouse</span>
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete warehouse?</AlertDialogTitle><AlertDialogDescription>This will remove the warehouse. Existing stock records will not be deleted.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
