import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, X, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim() === ""
    ? options
    : options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        className="p-0 rounded-xl border shadow-lg bg-popover"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col" style={{ maxHeight: "260px" }}>
          <div className="flex items-center gap-2 border-b px-3 py-2 shrink-0">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div
            className="overflow-y-auto overscroll-contain p-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(option);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground text-left",
                    value === option && "bg-accent/50 font-medium"
                  )}
                >
                  <span>{option}</span>
                  {value === option && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
