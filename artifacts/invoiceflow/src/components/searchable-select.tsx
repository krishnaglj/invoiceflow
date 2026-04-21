import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchableSelectProps {
  options: string[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowClear?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found",
  allowClear = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = query.trim() === ""
    ? options
    : options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal h-10 px-3",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate text-sm">{value || placeholder}</span>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {allowClear && value && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onChange(""); }}
                onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onChange(""))}
                className="rounded-full hover:bg-muted p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-40" />
          </div>
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
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
            className="h-10"
          />
          <CommandList className="max-h-56">
            {filtered.length === 0 && (
              <CommandEmpty>
                <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
              </CommandEmpty>
            )}
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onChange(option);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex items-center justify-between px-3 py-2.5 cursor-pointer rounded-lg mx-1 text-sm"
                  >
                    <span>{option}</span>
                    {value === option && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
