"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function MobileCallbackPage() {
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const supabase = createClient()
        
        // Verificar se há parâmetros de código na URL
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get("code")
        const type = urlParams.get("type")
        
        console.log("Mobile Callback - Parâmetros da URL:", { code, type })
        console.log("Mobile Callback - URL completa:", window.location.href)

        if (code && type === "magiclink") {
          // Tentar trocar o código por uma sessão
          console.log("Mobile Callback - Tentando trocar código por sessão...")
          
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href)
          
          if (error) {
            console.error("Mobile Callback - Erro ao trocar código por sessão:", error)
            toast({
              title: "Erro na autenticação",
              description: "Não foi possível completar o login. Tente novamente.",
              variant: "destructive"
            })
            window.location.href = "/login"
            return
          }

          if (data?.user) {
            console.log("Mobile Callback - Autenticação bem-sucedida:", data.user.id)
            await redirectUser(data.user.id)
          } else {
            console.log("Mobile Callback - Nenhum usuário encontrado após autenticação")
            window.location.href = "/login"
          }
        } else {
          console.log("Mobile Callback - Nenhum código de autenticação encontrado na URL")
          window.location.href = "/login"
        }
      } catch (error) {
        console.error("Mobile Callback - Erro inesperado na autenticação:", error)
        toast({
          title: "Erro inesperado",
          description: "Ocorreu um erro inesperado. Tente novamente.",
          variant: "destructive"
        })
        window.location.href = "/login"
      }
    }

    // Aguardar um pouco para garantir que a página carregou completamente
    setTimeout(handleAuth, 500)
  }, [router, toast])

  const redirectUser = async (userId: string) => {
    try {
      const supabase = createClient()
      
      // Buscar perfil do usuário
      console.log("Mobile Callback - Buscando perfil para usuário:", userId)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (profileError) {
        console.error("Mobile Callback - Erro ao buscar perfil:", profileError)
        toast({
          title: "Erro ao carregar perfil",
          description: "Não foi possível carregar seu perfil. Tente fazer login novamente.",
          variant: "destructive"
        })
        window.location.href = "/login"
        return
      }

      if (!profile) {
        console.log("Mobile Callback - Perfil não encontrado para o usuário:", userId)
        toast({
          title: "Perfil não encontrado",
          description: "Seu perfil não foi encontrado. Entre em contato com o suporte.",
          variant: "destructive"
        })
        window.location.href = "/login"
        return
      }

      console.log("Mobile Callback - Perfil encontrado:", profile)

      // Salvar dados do usuário no localStorage
      const userData = {
        id: userId,
        email: profile.email,
        name: profile.full_name,
        user_type: profile.user_type,
        office_id: profile.office_id || null,
        role: profile.role || null,
        cpf_cnpj: profile.cnpj || null,
        rescue_type: profile.rescue_type || null,
      }

      console.log("Mobile Callback - Salvando dados do usuário no localStorage:", userData)
      
      try {
        localStorage.setItem("user", JSON.stringify(userData))
        
        // Verificar se foi salvo corretamente
        const savedUser = localStorage.getItem("user")
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser)
          console.log("Mobile Callback - Dados salvos no localStorage:", parsedUser)
          
          // Verificar se os dados essenciais estão presentes
          if (!parsedUser.id || !parsedUser.email || !parsedUser.user_type) {
            console.error("Mobile Callback - Dados essenciais faltando no localStorage:", parsedUser)
            throw new Error("Dados essenciais não foram salvos corretamente")
          }
          
          // Disparar evento customizado para notificar outros componentes
          window.dispatchEvent(new CustomEvent("localStorageChange", {
            detail: { key: "user", value: parsedUser }
          }))
          
          console.log("Mobile Callback - Evento localStorageChange disparado")
        } else {
          throw new Error("Falha ao salvar no localStorage")
        }
      } catch (error) {
        console.error("Mobile Callback - Erro ao salvar no localStorage:", error)
        toast({
          title: "Erro ao salvar dados",
          description: "Não foi possível salvar os dados de login. Tente novamente.",
          variant: "destructive"
        })
        window.location.href = "/login"
        return
      }

      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo à plataforma, ${profile.full_name}!`,
      })

      // Redirecionar baseado no tipo de usuário
      let redirectPath = "/investor"

      if (profile.user_type === "distributor") {
        redirectPath = "/distributor"
      } else if (profile.user_type === "admin") {
        redirectPath = "/admin"
      }

      console.log("Mobile Callback - Tipo de usuário:", profile.user_type)
      console.log("Mobile Callback - Redirecionando para:", redirectPath)
      
      // Aguardar um pouco para garantir que o localStorage foi salvo
      setTimeout(() => {
        console.log("Mobile Callback - Redirecionando via window.location.href")
        window.location.href = redirectPath
      }, 200)
    } catch (error) {
      console.error("Mobile Callback - Erro ao redirecionar usuário:", error)
      toast({
        title: "Erro no redirecionamento",
        description: "Ocorreu um erro ao redirecionar. Tente novamente.",
        variant: "destructive"
      })
      window.location.href = "/login"
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <div>
          <h2 className="text-lg font-semibold">Processando login móvel...</h2>
          <p className="text-muted-foreground">Aguarde enquanto processamos seu login.</p>
        </div>
      </div>
    </div>
  )
}
