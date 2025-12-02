"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";
import Link from "next/link";

type Step = "email" | "code";

export function LoginWithCodeForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
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

  // Etapa 1: Enviar código por email
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login-with-code/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.debug && !data.debug.emailSent) {
          console.warn("[LOGIN-WITH-CODE] Email não foi enviado, mas código foi gerado");
          toast({
            title: "Código gerado",
            description: "Email pode não ter sido enviado. Verifique o console do servidor ou arquivos em /emails",
            variant: "default",
          });
        } else {
          toast({
            title: "Código enviado!",
            description: "Verifique seu email e insira o código recebido.",
          });
        }
        setStep("code");
        setResendTimer(60); // Iniciar contador de 60 segundos
      } else {
        toast({
          title: "Erro ao enviar código",
          description: data.error || "Erro ao enviar código. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erro ao enviar código:", error);
      toast({
        title: "Erro ao enviar código",
        description: "Erro inesperado. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para reenviar código
  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login-with-code/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
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

  // Etapa 2: Verificar código e fazer login
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    console.log(`[CLIENT] Verificando código de login para: ${normalizedEmail}`);

    try {
      const response = await fetch("/api/auth/login-with-code/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail, code: normalizedCode }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        // Salvar dados do usuário
        const userData = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          user_type: data.user.user_type,
          office_id: data.user.office_id || null,
          role: data.user.role || null,
          rescue_type: data.user.rescue_type || null,
        };

        localStorage.setItem("user", JSON.stringify(userData));

        // Disparar evento para atualizar navbar
        window.dispatchEvent(new Event("userUpdated"));

        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo, ${data.user.name}!`,
        });

        // Redirecionar baseado no tipo de usuário
        let redirectPath = "/investor";
        if (data.user.user_type === "distributor") {
          redirectPath = "/distributor";
        } else if (data.user.user_type === "admin") {
          redirectPath = "/admin";
        }

        // Usar window.location.href para forçar reload completo e atualizar navbar
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 500);
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

  // Renderizar etapa de email
  if (step === "email") {
    return (
      <form onSubmit={handleSendCode} className="space-y-3 flex flex-col items-center">
        <div className="space-y-1 w-full max-w-sm">
          <Label htmlFor="email" className="text-[#003F28] font-ibm-plex-sans font-normal text-base">
            E-mail
          </Label>
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
            Digite o email associado à sua conta para receber um código de verificação
          </p>
        </div>

        <Button
          type="submit"
          className="text-white font-inter font-semibold text-lg leading-6 w-full max-w-sm py-2"
          disabled={isLoading}
          style={{
            backgroundColor: "#012544",
            borderRadius: "11px",
            letterSpacing: "0%",
            verticalAlign: "middle",
          }}
        >
          {isLoading ? "Enviando..." : "Enviar Código"}
        </Button>
      </form>
    );
  }

  // Renderizar etapa de código
  if (step === "code") {
    return (
      <div className="space-y-3 flex flex-col items-center">
        <div className="space-y-2 text-center mb-4">
          <div className="mx-auto w-16 h-16 bg-[#00A568] rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-[#003F28] font-urbanist font-bold text-xl sm:text-2xl leading-tight">
            Verificar Código
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
            {isLoading ? "Entrando..." : "Entrar"}
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

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("email");
                setCode("");
                setResendTimer(0);
              }}
              className="text-[#00BC6E] hover:text-[#00A568] font-ibm-plex-sans font-normal text-sm"
            >
              Voltar para email
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return null;
}

