"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("[v0] Iniciando processo de reset de senha para:", email);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.log("[v0] Supabase não configurado");
        toast({
          title: "Erro no reset de senha",
          description: "Serviço temporariamente indisponível. Tente novamente mais tarde.",
          variant: "destructive",
        });
        return;
      }

      const supabase = createClient();

      // Enviar email de reset de senha
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/newPassword`,
      });

      if (error) {
        console.log("[v0] Erro no reset de senha:", error);
        
        let errorMessage = "Erro ao enviar email de reset. Tente novamente.";
        
        if (error.message.includes("Invalid email")) {
          errorMessage = "Email inválido. Verifique o endereço digitado.";
        } else if (error.message.includes("Too many requests")) {
          errorMessage = "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
        }

        toast({
          title: "Erro no reset de senha",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      console.log("[v0] Email de reset enviado com sucesso");
      setIsEmailSent(true);

      toast({
        title: "Email enviado com sucesso!",
        description: "Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.",
      });

    } catch (error: any) {
      console.error("[v0] Erro no reset de senha:", error);
      toast({
        title: "Erro no reset de senha",
        description: "Erro inesperado. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="space-y-3 text-center flex flex-col items-center">
        <div className="mx-auto w-16 h-16 bg-[#00A568] rounded-full flex items-center justify-center">
          <Mail className="h-8 w-8 text-white" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-[#003F28] font-urbanist font-bold text-xl sm:text-2xl leading-tight">
            Email enviado com sucesso!
          </h3>
          <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm sm:text-base">
            Enviamos instruções para redefinir sua senha para <strong>{email}</strong>
          </p>
          <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm sm:text-base">
            Verifique sua caixa de entrada e spam. O link expira em 1 hora.
          </p>
        </div>

        <div className="space-y-2 flex flex-col items-center w-full max-w-sm">
          <Button 
            onClick={() => {
              setIsEmailSent(false);
              setEmail("");
            }}
            className="text-white font-inter font-semibold text-lg leading-6 w-full py-2"
            style={{ 
              backgroundColor: '#012544',
              borderRadius: '11px',
              letterSpacing: '0%',
              verticalAlign: 'middle'
            }}
          >
            Enviar para outro email
          </Button>
          
          <Link href="/login" className="w-full">
            <Button 
              className="text-[#003F28] bg-[#D9D9D9] hover:bg-[#D9D9D9]/80 font-inter font-semibold text-lg leading-6 w-full py-2"
              style={{ 
                borderRadius: '11px',
                letterSpacing: '0%',
                verticalAlign: 'middle'
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 flex flex-col items-center">
      <div className="space-y-1 w-full max-w-sm">
        <Label htmlFor="email" className="text-[#003F28] font-ibm-plex-sans font-normal text-base">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="example@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-white border-gray-300 text-[#003F28] font-ibm-plex-sans font-normal text-base w-full"
        />
        <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm">
          Digite o email associado à sua conta
        </p>
      </div>

      <Button 
        type="submit" 
        className="text-white font-inter font-semibold text-lg leading-6 w-full max-w-sm py-2" 
        disabled={isLoading}
        style={{ 
          backgroundColor: '#012544',
          borderRadius: '11px',
          letterSpacing: '0%',
          verticalAlign: 'middle'
        }}
      >
        {isLoading ? "Enviando..." : "Enviar"}
      </Button>
    </form>
  );
}
