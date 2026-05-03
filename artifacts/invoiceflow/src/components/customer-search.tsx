import { useState } from "react";
import { Check, ChevronsUpDown, Phone, Mail, Building2, UserX, UserPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  businessName?: string | null;
}

interface CustomerSearchProps {
  customers: Customer[];
  selectedId?: number | null;
  onSelect: (customerId: string) => void;
  onClear?: () => void;
  onCreateNew?: (name: string) => void;
}

export function CustomerSearch({ customers, selectedId, onSelect, onClear, onCreateNew }: CustomerSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = customers.find(c => c.id === selectedId);

  const filtered = query.trim() === ""
    ? customers
    : customers.filter(c => {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.businessName && c.businessName.toLowerCase().includes(q))
        );
      });

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-background font-normal h-10 px-3 rounded-lg"
        >
          {selected ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {selected.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 text-left">
                <span className="text-sm font-medium truncate block">{selected.name}</span>
                {selected.phone && (
                  <span className="text-xs text-muted-foreground truncate block">{selected.phone}</span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">Search existing customer...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 rounded-xl border shadow-lg"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Name, phone or email..."
            value={query}
            onValueChange={setQuery}
            className="h-11"
          />
          <CommandList className="max-h-64">
            {filtered.length === 0 && (
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <UserX className="w-8 h-8 opacity-40" />
                  <p className="text-sm">No customers found</p>
                </div>
              </CommandEmpty>
            )}

            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map(customer => (
                  <CommandItem
                    key={customer.id}
                    value={customer.id.toString()}
                    onSelect={(value) => {
                      onSelect(value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg mx-1"
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                      selectedId === customer.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    )}>
                      {customer.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{customer.name}</span>
                        {customer.businessName && (
                          <span className="text-xs text-muted-foreground truncate hidden sm:block">
                            · {customer.businessName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {customer.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" /> {customer.phone}
                          </span>
                        )}
                        {customer.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <Mail className="w-3 h-3" /> {customer.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {selectedId === customer.id && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {onCreateNew && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => { onCreateNew(query); setOpen(false); setQuery(""); }}
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer text-primary rounded-lg mx-1 font-medium"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="text-sm">
                      {query.trim() ? `Create "${query.trim()}"` : "Create new customer"}
                    </span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}

            {selected && onClear && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => { onClear(); setOpen(false); setQuery(""); }}
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer text-muted-foreground hover:text-destructive rounded-lg mx-1"
                  >
                    <UserX className="w-4 h-4" />
                    <span className="text-sm">Clear selection</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
