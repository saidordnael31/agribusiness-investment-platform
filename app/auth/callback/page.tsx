"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        router.replace("/login?error=invalid_link");
        return;
      }
      console.log("Usuário autenticado:", data);
      const userInfo = data.session?.user.identities?.[0].identity_data;
      const userData = {
        id: data.session?.user.id,
        email: userInfo?.email,
        name: userInfo?.full_name,
        user_type: userInfo?.user_type,
        office_id: userInfo?.office_id || null,
        role: userInfo?.role || null,
        rescue_type: userInfo?.rescue_type || null,  
      };

      console.log("[v0] Saving user data:", userData);
      localStorage.setItem("user", JSON.stringify(userData));

      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo à plataforma Akintec, ${userInfo?.full_name || userInfo?.email}!`,
      });

      let redirectPath = "/investor";
      if (userInfo?.user_type === "distributor") {
        redirectPath = "/distributor";
      } else if (userInfo?.user_type === "admin") {
        redirectPath = "/admin";
      }

      try {
        router.push(redirectPath);
        // Fallback caso router.push não funcione
        setTimeout(() => {
          console.log("[v0] Router fallback - using window.location");
          window.location.href = redirectPath;
        }, 100);
      } catch (error) {
        console.log("[v0] Router error, using window.location:", error);
        window.location.href = redirectPath;
      }
    });
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-3">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
      <p className="text-sm text-muted-foreground">Entrando automaticamente...</p>
    </div>
  );
}
