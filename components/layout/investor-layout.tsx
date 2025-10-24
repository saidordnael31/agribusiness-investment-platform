"use client";

import { ReactNode } from "react";

interface InvestorLayoutProps {
  children: ReactNode;
}

export function InvestorLayout({ children }: InvestorLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#003F28] via-[#003562] to-[#01223F]">
      <main className="relative">
        {children}
      </main>
    </div>
  );
}
