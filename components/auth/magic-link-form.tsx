"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
      <div className="text-center space-y-3">
        <p className="text-green-600 font-medium">Link enviado com sucesso!</p>
        <p className="text-sm text-muted-foreground">
          Verifique seu e-mail <strong>{email}</strong> e clique no link para entrar.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSendLink} className="space-y-4">
      <Input
        type="email"
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Enviando..." : "Entrar com Magic Link"}
      </Button>
    </form>
  );
}
