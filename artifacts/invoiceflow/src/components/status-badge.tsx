import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "draft" | "sent" | "paid" | "overdue";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const styles = {
    draft: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
    sent: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
    paid: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
    overdue: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  };

  const labels = {
    draft: "Draft",
    sent: "Pending",
    paid: "Paid",
    overdue: "Overdue",
  };

  return (
    <Badge variant="outline" className={cn("px-2.5 py-0.5 font-medium border uppercase tracking-wider text-[10px]", styles[status], className)}>
      {labels[status]}
    </Badge>
  );
}
