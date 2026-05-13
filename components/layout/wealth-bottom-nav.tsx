"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  PlusCircle,
  Briefcase,
  ArrowDownCircle,
  MoreHorizontal,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: "Rentabilidade",
    href: "/investor",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    label: "Investir",
    href: "/investor/products",
    icon: <PlusCircle className="h-5 w-5" />,
  },
  {
    label: "Carteira",
    href: "/investor/portfolio",
    icon: <Briefcase className="h-5 w-5" />,
  },
  {
    label: "Resgatar",
    href: "/withdraw",
    icon: <ArrowDownCircle className="h-5 w-5" />,
  },
  {
    label: "Mais",
    href: "/investor/more",
    icon: <MoreHorizontal className="h-5 w-5" />,
  },
];

export function WealthBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/investor") {
      return pathname === "/investor" || pathname === "/investor/performance";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-[#01223F]/95 backdrop-blur-xl border-t border-white/10" />
      
      {/* Navigation items */}
      <div className="relative flex items-center justify-around px-2 py-2 safe-area-pb">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] py-1.5 px-2 rounded-xl transition-all duration-200",
                active
                  ? "text-[#00BC6E]"
                  : "text-white/60 hover:text-white/80"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200",
                  active
                    ? "bg-[#00BC6E]/20 scale-110"
                    : "bg-transparent"
                )}
              >
                {item.icon}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-0.5 font-medium transition-all duration-200",
                  active ? "opacity-100" : "opacity-70"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
