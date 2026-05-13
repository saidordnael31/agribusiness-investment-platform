"use client";

import { ReactNode } from "react";
import { WealthBottomNav } from "./wealth-bottom-nav";

interface WealthLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export function WealthLayout({ children, showBottomNav = true }: WealthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#003F28] via-[#003562] to-[#01223F]">
      {/* Main content */}
      <main className="relative pb-24 md:pb-0">
        {children}
      </main>
      
      {/* Bottom navigation for mobile */}
      {showBottomNav && <WealthBottomNav />}
    </div>
  );
}
