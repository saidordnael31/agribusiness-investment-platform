"use client";

import { ReactNode } from "react";
import Image from "next/image";

interface DistributorLayoutProps {
  children: ReactNode;
}

export function DistributorLayout({ children }: DistributorLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#003F28] via-[#003562] to-[#01223F]">
      <main className="relative">
        {children}
      </main>
    </div>
  );
}


