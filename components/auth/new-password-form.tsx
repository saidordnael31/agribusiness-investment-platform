"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function NewPasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    // Supabase valida o link e autentica o usuário automaticamente
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        toast({
          title: "Link inválido",
          description: "Link inválido ou expirado. Redirecionando para o login.",
          variant: "destructive",
        });
        router.push("/login");
      }
    });
  }, [router, supabase.auth, toast]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        toast({
          title: "Erro ao atualizar senha",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Senha atualizada com sucesso!",
          description: "Sua senha foi alterada. Redirecionando para o login.",
        });
        
        router.push("/investor");
      }
    } catch (error: any) {
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpdatePassword} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="newPassword">Nova Senha</Label>
        <Input
          id="newPassword"
          type="password"
          placeholder="Digite sua nova senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={6}
        />
        <p className="text-xs text-muted-foreground">
          Mínimo de 6 caracteres
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirme sua nova senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Atualizando..." : "Atualizar Senha"}
      </Button>
    </form>
  );
}
