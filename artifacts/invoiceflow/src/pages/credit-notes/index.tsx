import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListCreditNotes, useDeleteCreditNote } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileX, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function CreditNotesList() {
  const { data: creditNotes = [], isLoading } = useListCreditNotes();
  const deleteMut = useDeleteCreditNote();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleDelete = (id: number) => {
    if (!confirm("Delete this credit note?")) return;
    deleteMut.mutate(id, {
      onSuccess: () => {
        toast({ title: "Credit note deleted" });
        queryClient.invalidateQueries({ queryKey: ["/api/credit-notes"] });
      },
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Credit Notes</h1>
          <p className="text-muted-foreground mt-1">Issue credits and refunds against invoices.</p>
        </div>
        <Button className="rounded-xl shadow-lg shadow-primary/20" onClick={() => setLocation("/credit-notes/new")}>
          <Plus className="w-5 h-5 mr-2" /> New Credit Note
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading...</div>
      ) : creditNotes.length === 0 ? (
        <div className="py-20 flex flex-col items-center text-center border border-dashed rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
            <FileX className="w-8 h-8 text-purple-400" />
          </div>
          <p className="font-semibold text-lg">No credit notes yet</p>
          <p className="text-muted-foreground text-sm mt-1 mb-4">Issue a credit note from any invoice or create one manually.</p>
          <Button variant="outline" className="rounded-xl" onClick={() => setLocation("/invoices")}>
            Go to Invoices
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {creditNotes.map((cn) => (
            <Card key={cn.id} className="rounded-2xl border-border/50 shadow-sm hover:border-purple-300 transition-colors group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link href={`/credit-notes/${cn.id}`} className="font-bold text-lg font-display hover:text-purple-600 transition-colors">
                      {cn.creditNoteNumber}
                    </Link>
                    {cn.invoiceId && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Against Invoice #{cn.invoiceId}
                      </p>
                    )}
                  </div>
                  <Badge className={`rounded-lg text-xs border-0 ${cn.status === "issued" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {cn.status}
                  </Badge>
                </div>

                {cn.customerName && (
                  <p className="text-sm font-medium text-foreground/80 mb-1">{cn.customerName}</p>
                )}
                {cn.reason && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{cn.reason}</p>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground">{formatDate(cn.date)}</p>
                    <p className="text-xl font-black text-purple-600">{formatCurrency(cn.total)}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(cn.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
