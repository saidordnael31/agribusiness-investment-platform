"use client";

import { useState, useEffect } from "react";
import { NewPasswordForm } from "../../components/auth/new-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function NewPasswordPage() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
    }
  }, []);

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative password-reset-page"
    >
      {/* Overlay escuro para melhor contraste */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      <div className="w-full max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Formulário */}
          <div className="space-y-6">
            <Card className="bg-[#D9D9D9] border-0" style={{ borderRadius: '15px', width: '450px' }}>
              <CardHeader className="text-center">
                <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-[35px] leading-[28px]">Alterar Senha</CardTitle>
                <CardDescription className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-lg">Digite sua nova senha</CardDescription>
              </CardHeader>
              <CardContent>
                <NewPasswordForm />
              </CardContent>
            </Card>

            {!user && (
              <p className="text-center text-sm text-white/80">
                Lembrou da senha?{" "}
                <Link href="/login" className="text-[#00BC6E] hover:underline font-semibold">
                  Voltar ao login
                </Link>
              </p>
            )}
          </div>

          {/* Imagem */}
          <div className="flex justify-center lg:justify-end" style={{ marginRight: '40px' }}>
            <img 
              src="/images/right.png" 
              alt="Ilustração de interação com tablet" 
              style={{ width: '500px' }}
              className="max-w-full h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
