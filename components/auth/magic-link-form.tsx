"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: false,
        },
      });

      if (error) {
        toast({
          title: "Erro ao enviar link",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setSent(true);
      toast({
        title: "Link enviado!",
        description: `Verifique seu e-mail ${email} e clique no link para entrar.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-2 flex flex-col items-center">
        <p className="text-[#00BC6E] font-ibm-plex-sans font-medium text-base">Link enviado com sucesso!</p>
        <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm">
          Verifique seu e-mail <strong>{email}</strong> e clique no link para entrar.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSendLink} className="space-y-3 flex flex-col items-center">
      <div className="space-y-1 w-full max-w-sm">
        <Label htmlFor="email" className="text-[#003F28] font-ibm-plex-sans font-normal text-base">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-white border-gray-300 text-[#003F28] font-ibm-plex-sans font-normal text-base w-full"
        />
        <p className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-sm">
          Digite seu email para receber o link de acesso
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
        {isLoading ? "Enviando..." : "Entrar com Magic Link"}
      </Button>
    </form>
  );
}
