"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function AuthCallbackPage() {
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const supabase = createClient()
        
        // Detectar se é dispositivo móvel
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        console.log("Dispositivo móvel detectado:", isMobile)
        
        // Verificar se já existe uma sessão ativa
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error("Erro ao verificar sessão:", sessionError)
        }

        if (sessionData?.session) {
          console.log("Sessão já ativa encontrada")
          await redirectUser(sessionData.session.user.id)
          return
        }

        // Verificar se há parâmetros de código na URL
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get("code")
        const type = urlParams.get("type")
        
        console.log("Parâmetros da URL:", { code, type })
        console.log("URL completa:", window.location.href)

        if (code && type === "magiclink") {
          // Tentar trocar o código por uma sessão
          console.log("Tentando trocar código por sessão...")
          
          // Para mobile, tentar múltiplas vezes se necessário
          let attempts = 0
          const maxAttempts = isMobile ? 3 : 1
          
          while (attempts < maxAttempts) {
            try {
              const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href)
              
              if (error) {
                console.error(`Tentativa ${attempts + 1} - Erro ao trocar código por sessão:`, error)
                
                if (attempts === maxAttempts - 1) {
                  toast({
                    title: "Erro na autenticação",
                    description: "Não foi possível completar o login. Tente novamente.",
                    variant: "destructive"
                  })
                  router.push("/login")
                  return
                }
                
                // Aguardar antes da próxima tentativa
                await new Promise(resolve => setTimeout(resolve, 1000))
                attempts++
                continue
              }

              if (data?.user) {
                console.log("Autenticação bem-sucedida:", data.user.id)
                await redirectUser(data.user.id)
                return
              } else {
                console.log("Nenhum usuário encontrado após autenticação")
                router.push("/login")
                return
              }
            } catch (error) {
              console.error(`Tentativa ${attempts + 1} - Erro inesperado:`, error)
              if (attempts === maxAttempts - 1) {
                throw error
              }
              await new Promise(resolve => setTimeout(resolve, 1000))
              attempts++
            }
          }
        } else {
          console.log("Nenhum código de autenticação encontrado na URL")
          router.push("/login")
        }
      } catch (error) {
        console.error("Erro inesperado na autenticação:", error)
        toast({
          title: "Erro inesperado",
          description: "Ocorreu um erro inesperado. Tente novamente.",
          variant: "destructive"
        })
        router.push("/login")
      }
    }

    // Aguardar um pouco para garantir que a página carregou completamente
    setTimeout(handleAuth, 100)
  }, [router, toast])

  const redirectUser = async (userId: string) => {
    try {
      const supabase = createClient()
      
      // Buscar perfil do usuário
      console.log("Buscando perfil para usuário:", userId)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (profileError) {
        console.error("Erro ao buscar perfil:", profileError)
        toast({
          title: "Erro ao carregar perfil",
          description: "Não foi possível carregar seu perfil. Tente fazer login novamente.",
          variant: "destructive"
        })
        router.push("/login")
        return
      }

      if (!profile) {
        console.log("Perfil não encontrado para o usuário:", userId)
        toast({
          title: "Perfil não encontrado",
          description: "Seu perfil não foi encontrado. Entre em contato com o suporte.",
          variant: "destructive"
        })
        router.push("/login")
        return
      }

      console.log("Perfil encontrado:", profile)

      // Salvar dados do usuário no localStorage (mesmo formato do login normal)
      const userData = {
        id: userId,
        email: profile.email,
        name: profile.full_name, // Usar full_name para consistência
        user_type: profile.user_type,
        office_id: profile.office_id || null,
        role: profile.role || null,
        cpf_cnpj: profile.cnpj || null,
        rescue_type: profile.rescue_type || null,
      }

      console.log("Salvando dados do usuário no localStorage:", userData)
      
      try {
        localStorage.setItem("user", JSON.stringify(userData))
        
        // Verificar se foi salvo corretamente
        const savedUser = localStorage.getItem("user")
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser)
          console.log("Dados salvos no localStorage:", parsedUser)
          
          // Verificar se os dados essenciais estão presentes
          if (!parsedUser.id || !parsedUser.email || !parsedUser.user_type) {
            console.error("Dados essenciais faltando no localStorage:", parsedUser)
            throw new Error("Dados essenciais não foram salvos corretamente")
          }
          
          // Disparar evento customizado para notificar outros componentes
          window.dispatchEvent(new CustomEvent("localStorageChange", {
            detail: { key: "user", value: parsedUser }
          }))
          
          console.log("Evento localStorageChange disparado")
        } else {
          throw new Error("Falha ao salvar no localStorage")
        }
      } catch (error) {
        console.error("Erro ao salvar no localStorage:", error)
        toast({
          title: "Erro ao salvar dados",
          description: "Não foi possível salvar os dados de login. Tente novamente.",
          variant: "destructive"
        })
        router.push("/login")
        return
      }

      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo à plataforma, ${profile.full_name}!`,
      })

      // Redirecionar baseado no tipo de usuário (mesma lógica do login)
      let redirectPath = "/investor"

      if (profile.user_type === "distributor") {
        redirectPath = "/distributor"
      } else if (profile.user_type === "admin") {
        redirectPath = "/admin"
      }

      console.log("Tipo de usuário:", profile.user_type)
      console.log("Redirecionando para:", redirectPath)
      
      // Aguardar um pouco para garantir que o localStorage foi salvo
      setTimeout(() => {
        // Para mobile, usar window.location.href para forçar redirecionamento
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        
        if (isMobile) {
          console.log("Redirecionando via window.location.href para mobile")
          window.location.href = redirectPath
        } else {
          console.log("Redirecionando via router.push para desktop")
          router.push(redirectPath)
        }
      }, 100)
    } catch (error) {
      console.error("Erro ao redirecionar usuário:", error)
      toast({
        title: "Erro no redirecionamento",
        description: "Ocorreu um erro ao redirecionar. Tente novamente.",
        variant: "destructive"
      })
      router.push("/login")
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <div>
          <h2 className="text-lg font-semibold">Entrando automaticamente...</h2>
          <p className="text-muted-foreground">Aguarde enquanto processamos seu login.</p>
        </div>
      </div>
    </div>
  )
}
