import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { adminTokens } from "./tokens";

interface AdminFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  selectValue?: string;
  onSelectChange?: (value: string) => void;
  selectPlaceholder?: string;
  selectDisabled?: boolean;
  selectOptions?: { value: string; label: string }[];
  className?: string;
}

export function AdminFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  selectValue,
  onSelectChange,
  selectPlaceholder = "Filtrar",
  selectDisabled = false,
  selectOptions = [],
  className,
}: AdminFilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7C74]" />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className={cn(adminTokens.input, "pl-11")}
        />
      </div>

      {selectOptions.length > 0 && onSelectChange && (
        <Select
          value={selectValue}
          onValueChange={onSelectChange}
          disabled={selectDisabled}
        >
          <SelectTrigger
            className={cn(
              adminTokens.input,
              "w-full sm:w-[220px]",
              selectDisabled && "opacity-60",
            )}
          >
            <SelectValue placeholder={selectPlaceholder} />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-white/[0.08] bg-[#161F1B] text-[#F3F5F4]">
            {selectOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
