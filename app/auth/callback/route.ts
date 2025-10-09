import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Buscar dados do perfil do usuário
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          // Salvar dados do usuário no localStorage via cookie
          const userData = {
            id: user.id,
            email: user.email,
            name: profile.full_name || user.email?.split('@')[0],
            user_type: profile.user_type,
            is_active: profile.is_active,
          }

          // Redirecionar para a página apropriada baseada no tipo de usuário
          let redirectPath = '/login'
          
          if (profile.user_type === 'admin') {
            redirectPath = '/admin'
          } else if (profile.user_type === 'distributor' || profile.user_type === 'assessor' || 
                     profile.user_type === 'gestor' || profile.user_type === 'escritorio') {
            redirectPath = '/distributor'
          } else if (profile.user_type === 'investor') {
            redirectPath = '/investor'
          }

          // Criar resposta com redirecionamento e script para salvar no localStorage
          const response = NextResponse.redirect(`${origin}${redirectPath}`)
          
          // Adicionar script para salvar dados no localStorage
          const script = `
            <script>
              const userData = ${JSON.stringify(userData)};
              localStorage.setItem('user', JSON.stringify(userData));
              window.location.href = '${redirectPath}';
            </script>
          `
          
          return new NextResponse(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Redirecionando...</title>
              </head>
              <body>
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif;">
                  <div style="text-align: center;">
                    <h2>Login realizado com sucesso!</h2>
                    <p>Redirecionando para sua área...</p>
                    <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto;"></div>
                  </div>
                </div>
                <style>
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                </style>
                ${script}
              </body>
            </html>
          `, {
            headers: {
              'Content-Type': 'text/html',
            },
          })
        }
      }
    }
  }

  // Se chegou até aqui, houve erro no processo
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
