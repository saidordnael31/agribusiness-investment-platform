import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { adminTokens } from "./tokens";

export function AdminDataTable({
  children,
  className,
  maxHeight = "min(65vh, 560px)",
  embedded = false,
}: {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string | false;
  embedded?: boolean;
}) {
  return (
    <div
      className={cn(
        !embedded && adminTokens.sectionMuted,
        "overflow-hidden",
        className,
      )}
    >
      <div
        className="overflow-x-auto overflow-y-auto"
        style={maxHeight ? { maxHeight } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

export function AdminTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Table className={cn("min-w-full border-collapse text-sm", className)}>
      {children}
    </Table>
  );
}

export function AdminTableHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHeader
      className={cn(
        "sticky top-0 z-10 bg-[#141D19]/95 shadow-[0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </TableHeader>
  );
}

export function AdminTableHead({
  children,
  className,
  align = "left",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <TableHead
      className={cn(
        adminTokens.tableHead,
        "h-8 whitespace-nowrap px-2.5 py-0 font-medium sm:px-3",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

export function AdminTableRow({
  children,
  className,
  onClick,
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}) {
  return (
    <TableRow
      onClick={onClick}
      className={cn(
        adminTokens.tableRow,
        "group border-b",
        interactive && "cursor-pointer",
        className,
      )}
    >
      {children}
    </TableRow>
  );
}

export function AdminTableCell({
  children,
  className,
  align = "left",
  secondary = false,
  colSpan,
  compact = true,
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  secondary?: boolean;
  colSpan?: number;
  compact?: boolean;
}) {
  return (
    <TableCell
      colSpan={colSpan}
      className={cn(
        compact ? "px-2.5 py-2 sm:px-3" : "px-3 py-3",
        "align-middle text-[13px] leading-snug",
        secondary ? "text-[#6B7C74]" : "text-[#A5B3AC]",
        align === "right" && "text-right tabular-nums",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </TableCell>
  );
}

export function AdminTableBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableBody
      className={cn(
        "[&_tr:nth-child(even)]:bg-white/[0.02] [&_tr:nth-child(odd)]:bg-transparent",
        className,
      )}
    >
      {children}
    </TableBody>
  );
}

export function AdminTableEmpty({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <AdminTableRow>
      <AdminTableCell
        colSpan={colSpan}
        className="py-10 text-center text-xs text-[#6B7C74]"
      >
        {message}
      </AdminTableCell>
    </AdminTableRow>
  );
}

export function AdminInvestorCell({
  name,
  email,
}: {
  name: string;
  email?: string;
}) {
  return (
    <div className="min-w-[140px] max-w-[200px]">
      <p className="truncate text-[13px] font-medium text-[#F3F5F4]">{name}</p>
      {email && (
        <p className="truncate text-[11px] text-[#6B7C74]">{email}</p>
      )}
    </div>
  );
}

export function AdminMoney({
  value,
  className,
  emphasis = false,
  title,
  size = "default",
}: {
  value: string;
  className?: string;
  emphasis?: boolean;
  title?: string;
  size?: "default" | "sm";
}) {
  return (
    <span
      title={title}
      className={cn(
        "tabular-nums",
        size === "sm" ? "text-xs" : "text-[13px]",
        emphasis
          ? "font-semibold text-[#F3F5F4]"
          : "text-[#A5B3AC]",
        className,
      )}
    >
      {value}
    </span>
  );
}
