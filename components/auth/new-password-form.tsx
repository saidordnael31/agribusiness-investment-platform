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
    // Verificar se o usuário está autenticado via Supabase
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Erro ao verificar sessão:", error);
        toast({
          title: "Erro de autenticação",
          description: "Erro ao verificar sua sessão. Tente novamente.",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }

      if (!session) {
        toast({
          title: "Link inválido",
          description: "Link inválido ou expirado. Redirecionando para o login.",
          variant: "destructive",
        });
        router.push("/login");
        return;
      }

      console.log("Usuário autenticado para reset de senha:", session.user.email);
    };

    checkSession();
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
    <form onSubmit={handleUpdatePassword} className="space-y-4 flex flex-col items-center">
      <div className="space-y-2 w-full">
        <Label htmlFor="newPassword" className="text-[#003F28] font-ibm-plex-sans font-normal text-lg">Nova Senha</Label>
        <Input
          id="newPassword"
          type="password"
          placeholder="Digite sua nova senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={6}
          className="bg-white border-gray-300 text-[#003F28] font-ibm-plex-sans font-normal text-lg"
          style={{ width: '400px' }}
        />
        <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm">
          Mínimo de 6 caracteres
        </p>
      </div>
      
      <div className="space-y-2 w-full">
        <Label htmlFor="confirmPassword" className="text-[#003F28] font-ibm-plex-sans font-normal text-lg">Confirmar Nova Senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirme sua nova senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          className="bg-white border-gray-300 text-[#003F28] font-ibm-plex-sans font-normal text-lg"
          style={{ width: '400px' }}
        />
      </div>
      
      <Button 
        type="submit" 
        className="text-white font-inter font-semibold text-xl leading-7" 
        disabled={isLoading}
        style={{ 
          backgroundColor: '#012544',
          borderRadius: '11px',
          width: '400px',
          letterSpacing: '0%',
          verticalAlign: 'middle'
        }}
      >
        {isLoading ? "Atualizando..." : "Atualizar Senha"}
      </Button>
    </form>
  );
}
