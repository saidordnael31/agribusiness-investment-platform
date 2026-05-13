"use client";

import { ReactNode, useState, useEffect } from "react";
import { WealthBottomNav } from "./wealth-bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  ShieldCheck,
  FileText,
  Lock,
  LogOut,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserData {
  name: string;
  suitabilityProfile?: "conservador" | "moderado" | "arrojado" | "qualificado";
}

const profileColors = {
  conservador: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  moderado: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  arrojado: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  qualificado: "bg-[#00BC6E]/20 text-[#00BC6E] border-[#00BC6E]/30",
};

const profileLabels = {
  conservador: "Conservador",
  moderado: "Moderado",
  arrojado: "Arrojado",
  qualificado: "Qualificado",
};

interface WealthLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export function WealthLayout({
  children,
  showBottomNav = true,
}: WealthLayoutProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const parsed = JSON.parse(userStr);
        setUser({
          name: parsed.name || parsed.email?.split("@")[0] || "Investidor",
          suitabilityProfile: parsed.suitability_profile || "moderado",
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const profile = user?.suitabilityProfile ?? "moderado";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#003F28] via-[#003562] to-[#01223F]">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 border-b border-white/10">
          {/* Logo */}
          <Link href="/investor" className="flex flex-col leading-none">
            <span className="text-white font-bold text-lg tracking-tight">
              Agrinvest
            </span>
            <span className="text-white/40 text-[10px] tracking-widest uppercase">
              by Akin S.A.
            </span>
          </Link>

          {/* Right side */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/10 h-10 px-3 rounded-xl"
              >
                {/* Avatar */}
                <div className="h-7 w-7 rounded-full bg-[#00BC6E]/30 border border-[#00BC6E]/40 flex items-center justify-center">
                  <User className="h-4 w-4 text-[#00BC6E]" />
                </div>

                <div className="hidden sm:flex flex-col items-start leading-none">
                  <span className="text-sm font-medium text-white">
                    {user?.name?.split(" ")[0] ?? "Investidor"}
                  </span>
                  <Badge
                    className={`mt-0.5 text-[9px] px-1.5 py-0 h-4 font-medium border ${profileColors[profile]}`}
                  >
                    {profileLabels[profile]}
                  </Badge>
                </div>

                <ChevronDown className="h-4 w-4 text-white/40 hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-52 bg-[#01223F]/95 backdrop-blur-xl border-white/10 text-white"
            >
              {/* Mobile: show name + badge inside menu */}
              <div className="sm:hidden px-3 py-2 border-b border-white/10 mb-1">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <Badge
                  className={`mt-1 text-[9px] px-1.5 py-0 h-4 font-medium border ${profileColors[profile]}`}
                >
                  {profileLabels[profile]}
                </Badge>
              </div>

              <DropdownMenuItem asChild>
                <Link
                  href="/investor/profile"
                  className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:text-white focus:bg-white/10"
                >
                  <User className="h-4 w-4" />
                  Perfil
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/investor/suitability"
                  className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:text-white focus:bg-white/10"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Suitability
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/investor/documents"
                  className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:text-white focus:bg-white/10"
                >
                  <FileText className="h-4 w-4" />
                  Documentos
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/investor/security"
                  className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:text-white focus:bg-white/10"
                >
                  <Lock className="h-4 w-4" />
                  Seguranca
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-white/10" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 cursor-pointer text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="relative pb-28 md:pb-10">{children}</main>

      {/* Bottom navigation for mobile */}
      {showBottomNav && <WealthBottomNav />}
    </div>
  );
}
