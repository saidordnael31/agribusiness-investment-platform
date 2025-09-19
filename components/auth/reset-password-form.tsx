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
        redirectTo: `${window.location.origin}/resetPasswod?token=`,
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
      <div className="space-y-4 text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <Mail className="h-8 w-8 text-green-600" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            Email enviado com sucesso!
          </h3>
          <p className="text-sm text-muted-foreground">
            Enviamos instruções para redefinir sua senha para <strong>{email}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Verifique sua caixa de entrada e spam. O link expira em 1 hora.
          </p>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={() => {
              setIsEmailSent(false);
              setEmail("");
            }}
            variant="outline" 
            className="w-full"
          >
            Enviar para outro email
          </Button>
          
          <Link href="/login">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Digite o email associado à sua conta
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Enviando..." : "Enviar instruções de reset"}
      </Button>
    </form>
  );
}
