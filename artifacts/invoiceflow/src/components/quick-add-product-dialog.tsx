import { useState } from "react";
import { useCreateProduct } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const GST_RATES = [0, 5, 12, 18, 28];

interface Props {
  open: boolean;
  initialName?: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (product: { id: number; name: string; defaultRate: number; unit: string; hsnCode?: string; taxRate?: number; description?: string }) => void;
}

export function QuickAddProductDialog({ open, initialName = "", onOpenChange, onCreated }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMut = useCreateProduct();

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState("");
  const [rate, setRate] = useState<number>(0);
  const [unit, setUnit] = useState("pcs");
  const [hsnCode, setHsnCode] = useState("");
  const [taxRate, setTaxRate] = useState<number>(0);

  const reset = () => { setName(initialName); setDescription(""); setRate(0); setUnit("pcs"); setHsnCode(""); setTaxRate(0); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast({ title: "Product name is required", variant: "destructive" }); return; }
    createMut.mutate(
      { data: { name: name.trim(), description: description.trim() || undefined, defaultRate: rate, unit: unit || "pcs", hsnCode: hsnCode.trim() || undefined, taxRate } },
      {
        onSuccess: (product) => {
          toast({ title: `${product.name} added to library` });
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          onCreated({ id: product.id, name: product.name, defaultRate: product.defaultRate, unit: product.unit, hsnCode: product.hsnCode || undefined, taxRate: product.taxRate || 0, description: product.description || undefined });
          onOpenChange(false);
          reset();
        },
        onError: () => toast({ title: "Failed to add product", variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Product / Service</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Web Design, 5kg Rice" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional short description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Default Rate (₹) *</Label>
              <Input type="number" inputMode="decimal" min={0} step="0.01" value={rate} onChange={(e) => setRate(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pcs, hr, kg..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>HSN / SAC Code</Label>
              <Input value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} placeholder="e.g. 9954" />
            </div>
            <div className="space-y-1.5">
              <Label>GST Rate</Label>
              <Select value={String(taxRate)} onValueChange={(v) => setTaxRate(parseFloat(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GST_RATES.map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1" disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add to Library
            </Button>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); reset(); }}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
