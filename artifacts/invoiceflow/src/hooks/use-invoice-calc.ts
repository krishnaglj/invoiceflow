import { useMemo } from "react";

export interface CalcItem {
  quantity: number;
  rate: number;
}

export function useInvoiceCalculations(
  items: CalcItem[],
  discountType: "percent" | "flat" = "flat",
  discountValue: number = 0,
  taxPercent: number = 0
) {
  return useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    
    let discountAmount = 0;
    if (discountType === "percent") {
      discountAmount = subtotal * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }
    
    const postDiscount = Math.max(0, subtotal - discountAmount);
    const taxAmount = postDiscount * (taxPercent / 100);
    const total = postDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total
    };
  }, [items, discountType, discountValue, taxPercent]);
}
