"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { NewPasswordForm } from "../../components/auth/new-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export function NewPasswordPageClient() {
  const [user, setUser] = useState<any>(null);
  const searchParams = useSearchParams();
  const isFirstTime = searchParams.get("force") === "true";

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
    }
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative password-reset-page"
    >
      {/* Overlay escuro para melhor contraste */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Formulário centralizado */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        <Card
          className="bg-[#D9D9D9] border-0 w-full"
          style={{ borderRadius: "15px" }}
        >
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-xl sm:text-2xl lg:text-3xl leading-tight">
              {isFirstTime ? "Definir Senha" : "Alterar Senha"}
            </CardTitle>
            <CardDescription className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm sm:text-base">
              {isFirstTime
                ? "Você precisa criar uma senha pessoal para continuar"
                : "Digite sua nova senha"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <NewPasswordForm />
          </CardContent>
        </Card>

        {!user && !isFirstTime && (
          <p className="text-center text-sm text-white/80 mt-4">
            Lembrou da senha?{" "}
            <Link
              href="/login"
              className="text-[#00BC6E] hover:underline font-semibold"
            >
              Voltar ao login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
