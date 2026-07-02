import { cn } from "@/lib/utils";
import { adminTokens } from "./tokens";

export function AdminShell({
  children,
  className,
  nav,
}: {
  children: React.ReactNode;
  className?: string;
  nav?: React.ReactNode;
}) {
  return (
    <div className={cn(adminTokens.page, "relative isolate")}>
      <div className={adminTokens.ambient} aria-hidden />
      <div
        className="pointer-events-none fixed bottom-0 left-1/2 h-[480px] w-[900px] -translate-x-1/2 translate-y-1/3 rounded-full bg-emerald-500/[0.04] blur-[120px]"
        aria-hidden
      />
      {nav}
      <div className={cn(adminTokens.shell, className)}>{children}</div>
    </div>
  );
}

/** Área de conteúdo abaixo do hero */
export function AdminWorkspace({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "-mx-3 mt-0 rounded-t-2xl border-t border-white/[0.06] bg-[#111A17] px-3 pt-5 sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
