"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  PlusCircle,
  ArrowDownCircle,
  FileText,
  MessageSquare,
  ArrowRightLeft,
  Target,
} from "lucide-react";

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const quickActions: QuickAction[] = [
  {
    label: "Investir",
    description: "Aplicar em produtos",
    href: "/investor/products",
    icon: <PlusCircle className="h-5 w-5" />,
    color: "text-[#00BC6E]",
    bgColor: "bg-[#00BC6E]/20",
  },
  {
    label: "Resgatar",
    description: "Solicitar resgate",
    href: "/withdraw",
    icon: <ArrowDownCircle className="h-5 w-5" />,
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/20",
  },
  {
    label: "Documentos",
    description: "Extratos e informes",
    href: "/investor/documents",
    icon: <FileText className="h-5 w-5" />,
    color: "text-amber-400",
    bgColor: "bg-amber-400/20",
  },
  {
    label: "Suporte",
    description: "Falar com consultor",
    href: "/investor/support",
    icon: <MessageSquare className="h-5 w-5" />,
    color: "text-violet-400",
    bgColor: "bg-violet-400/20",
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {quickActions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group flex flex-col items-center p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
        >
          <div
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full mb-3 transition-transform group-hover:scale-110",
              action.bgColor
            )}
          >
            <span className={action.color}>{action.icon}</span>
          </div>
          <span className="text-sm font-semibold text-white text-center">
            {action.label}
          </span>
          <span className="text-[10px] text-white/50 text-center mt-0.5">
            {action.description}
          </span>
        </Link>
      ))}
    </div>
  );
}
