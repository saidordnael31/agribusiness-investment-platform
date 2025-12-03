"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Mail, CheckCircle } from "lucide-react";
import Link from "next/link";

type Step = "code" | "success";

interface VerifyEmailFormProps {
  email: string;
  userId: string;
}

export function VerifyEmailForm({ email, userId }: VerifyEmailFormProps) {
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const router = useRouter();
  const { toast } = useToast();

  // Contador de 60 segundos para reenvio
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [resendTimer]);

  // Função para reenviar código
  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/verify-email/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, userId }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Código reenviado!",
          description: "Verifique seu email novamente.",
        });
        setResendTimer(60);
        setCode("");
      } else {
        toast({
          title: "Erro ao reenviar código",
          description: data.error || "Erro ao reenviar código. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erro ao reenviar código:", error);
      toast({
        title: "Erro ao reenviar código",
        description: "Erro inesperado. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Verificar código e confirmar email
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    try {
      const response = await fetch("/api/auth/verify-email/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail, code: normalizedCode }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Email confirmado com sucesso!",
          description: "Sua conta foi ativada. Agora você pode fazer login.",
        });
        setStep("success");
        
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        toast({
          title: "Código inválido",
          description: data.error || "O código inserido está incorreto ou expirado.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erro ao verificar código:", error);
      toast({
        title: "Erro ao verificar código",
        description: "Erro inesperado. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Renderizar etapa de código
  if (step === "code") {
    return (
      <div className="space-y-3 flex flex-col items-center">
        <div className="space-y-2 text-center mb-4">
          <div className="mx-auto w-16 h-16 bg-[#00A568] rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-[#003F28] font-urbanist font-bold text-xl sm:text-2xl leading-tight">
            Verificar Email
          </h3>
          <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm sm:text-base">
            Enviamos um código de 6 dígitos para <strong>{email}</strong>
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-3 flex flex-col items-center w-full">
          <div className="space-y-1 w-full max-w-sm">
            <Label htmlFor="code" className="text-[#003F28] font-ibm-plex-sans font-normal text-base">
              Código de Verificação
            </Label>
            <Input
              id="code"
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              maxLength={6}
              className="bg-white border-gray-300 text-[#003F28] font-ibm-plex-sans font-normal text-base w-full text-center text-2xl tracking-widest"
            />
            <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm">
              Digite o código de 6 dígitos recebido por email
            </p>
          </div>

          <Button
            type="submit"
            className="text-white font-inter font-semibold text-lg leading-6 w-full max-w-sm py-2"
            disabled={isLoading || code.length !== 6}
            style={{
              backgroundColor: "#012544",
              borderRadius: "11px",
              letterSpacing: "0%",
              verticalAlign: "middle",
            }}
          >
            {isLoading ? "Verificando..." : "Confirmar Email"}
          </Button>

          <div className="flex flex-col items-center gap-2 w-full max-w-sm">
            {resendTimer > 0 ? (
              <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm">
                Reenviar código em <span className="font-semibold text-[#003F28]">{resendTimer}s</span>
              </p>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={handleResendCode}
                disabled={isLoading}
                className="text-[#00BC6E] hover:text-[#00A568] font-ibm-plex-sans font-normal text-sm"
              >
                {isLoading ? "Enviando..." : "Reenviar código"}
              </Button>
            )}
          </div>
        </form>
      </div>
    );
  }

  // Renderizar etapa de sucesso
  if (step === "success") {
    return (
      <div className="space-y-3 text-center flex flex-col items-center">
        <div className="mx-auto w-16 h-16 bg-[#00A568] rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-white" />
        </div>

        <div className="space-y-2">
          <h3 className="text-[#003F28] font-urbanist font-bold text-xl sm:text-2xl leading-tight">
            Email confirmado com sucesso!
          </h3>
          <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm sm:text-base">
            Sua conta foi ativada. Redirecionando para o login...
          </p>
        </div>

        <Link href="/login" className="w-full max-w-sm">
          <Button
            className="text-white font-inter font-semibold text-lg leading-6 w-full py-2"
            style={{
              backgroundColor: "#012544",
              borderRadius: "11px",
              letterSpacing: "0%",
              verticalAlign: "middle",
            }}
          >
            Ir para Login
          </Button>
        </Link>
      </div>
    );
  }

  return null;
}







