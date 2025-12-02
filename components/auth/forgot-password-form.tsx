"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, CheckCircle, KeyRound } from "lucide-react";
import Link from "next/link";

type Step = "email" | "code" | "new-password" | "success";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      const response = await fetch("/api/auth/forgot-password/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        // Em desenvolvimento, mostrar informações de debug
        if (data.debug && !data.debug.emailSent) {
          console.warn("[FORGOT-PASSWORD] Email não foi enviado, mas código foi gerado");
          console.warn("[FORGOT-PASSWORD] Verifique o console do servidor ou arquivos em /emails");
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
    if (resendTimer > 0) return; // Não permitir reenvio durante o contador
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password/send-code", {
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
        setResendTimer(60); // Reiniciar contador de 60 segundos
        setCode(""); // Limpar código anterior
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

  // Etapa 2: Verificar código
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Normalizar email antes de enviar
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    console.log(`[CLIENT] Verificando código para: ${normalizedEmail}`);
    console.log(`[CLIENT] Código digitado: ${normalizedCode}`);

    try {
      const response = await fetch("/api/auth/forgot-password/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail, code: normalizedCode }),
      });

      const data = await response.json();

      if (data.success && data.verified) {
        toast({
          title: "Código verificado!",
          description: "Agora você pode definir sua nova senha.",
        });
        setStep("new-password");
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

  // Etapa 3: Redefinir senha
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro na confirmação",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code: code.trim(), newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Senha redefinida com sucesso!",
          description: "Sua senha foi alterada. Redirecionando para o login...",
        });
        setStep("success");
        
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        toast({
          title: "Erro ao redefinir senha",
          description: data.error || "Erro ao redefinir senha. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      toast({
        title: "Erro ao redefinir senha",
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
            {isLoading ? "Verificando..." : "Verificar Código"}
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

  // Renderizar etapa de nova senha
  if (step === "new-password") {
    return (
      <div className="space-y-3 flex flex-col items-center">
        <div className="space-y-2 text-center mb-4">
          <div className="mx-auto w-16 h-16 bg-[#00A568] rounded-full flex items-center justify-center">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-[#003F28] font-urbanist font-bold text-xl sm:text-2xl leading-tight">
            Nova Senha
          </h3>
          <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm sm:text-base">
            Digite sua nova senha abaixo
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-3 flex flex-col items-center w-full">
          <div className="space-y-1 w-full max-w-sm">
            <Label htmlFor="newPassword" className="text-[#003F28] font-ibm-plex-sans font-normal text-base">
              Nova Senha
            </Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Digite sua nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="bg-white border-gray-300 text-[#003F28] font-ibm-plex-sans font-normal text-base w-full"
            />
            <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm">
              Mínimo de 6 caracteres
            </p>
          </div>

          <div className="space-y-1 w-full max-w-sm">
            <Label htmlFor="confirmPassword" className="text-[#003F28] font-ibm-plex-sans font-normal text-base">
              Confirmar Nova Senha
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirme sua nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="bg-white border-gray-300 text-[#003F28] font-ibm-plex-sans font-normal text-base w-full"
            />
          </div>

          <Button
            type="submit"
            className="text-white font-inter font-semibold text-lg leading-6 w-full max-w-sm py-2"
            disabled={isLoading || newPassword !== confirmPassword || newPassword.length < 6}
            style={{
              backgroundColor: "#012544",
              borderRadius: "11px",
              letterSpacing: "0%",
              verticalAlign: "middle",
            }}
          >
            {isLoading ? "Redefinindo..." : "Redefinir Senha"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStep("code");
              setNewPassword("");
              setConfirmPassword("");
            }}
            className="text-[#00BC6E] hover:text-[#00A568] font-ibm-plex-sans font-normal text-sm"
          >
            Voltar para código
          </Button>
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
            Senha redefinida com sucesso!
          </h3>
          <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm sm:text-base">
            Sua senha foi alterada. Redirecionando para o login...
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

