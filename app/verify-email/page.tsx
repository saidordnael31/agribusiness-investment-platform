"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const userId = searchParams.get("userId");

  if (!email || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-xl sm:text-2xl lg:text-3xl leading-tight">
              Dados Inválidos
            </CardTitle>
            <CardDescription className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm sm:text-base">
              Email ou ID do usuário não encontrados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className="w-full">
              <Button className="w-full">
                Ir para Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 relative password-reset-page"
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Overlay escuro para melhor contraste */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Formulário centralizado */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        <Card className="bg-[#D9D9D9] border-0 w-full" style={{ borderRadius: '15px' }}>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-xl sm:text-2xl lg:text-3xl leading-tight">
              Confirmar Email
            </CardTitle>
            <CardDescription className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm sm:text-base">
              Digite o código enviado para seu email
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <VerifyEmailForm email={email} userId={userId} />
          </CardContent>
        </Card>

        <p className="text-center text-sm text-white/80 mt-4">
          Já confirmou?{" "}
          <Link href="/login" className="text-[#00BC6E] hover:underline font-semibold">
            Fazer Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

