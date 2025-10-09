import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  console.log('Magic link callback received:', { code: !!code, origin, next })

  if (code) {
    try {
      const supabase = await createClient()
      
      // Trocar o código pela sessão
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log('Exchange result:', { error: error?.message, hasUser: !!data?.user })
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(`${origin}/login?error=exchange_error`)
      }

      if (data?.user) {
        // Buscar dados do perfil do usuário
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        console.log('Profile lookup:', { profileError: profileError?.message, hasProfile: !!profile })

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          return NextResponse.redirect(`${origin}/login?error=profile_error`)
        }

        if (profile) {
          // Preparar dados do usuário
          const userData = {
            id: data.user.id,
            email: data.user.email,
            name: profile.full_name || data.user.email?.split('@')[0],
            user_type: profile.user_type,
            is_active: profile.is_active,
          }

          console.log('User data prepared:', userData)

          // Determinar página de redirecionamento
          let redirectPath = '/login'
          
          if (profile.user_type === 'admin') {
            redirectPath = '/admin'
          } else if (['distributor', 'assessor', 'gestor', 'escritorio'].includes(profile.user_type)) {
            redirectPath = '/distributor'
          } else if (profile.user_type === 'investor') {
            redirectPath = '/investor'
          }

          console.log('Redirecting to:', redirectPath)

          // Criar página de redirecionamento com script
          const html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Login realizado com sucesso!</title>
                <style>
                  body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                  }
                  .container {
                    text-align: center;
                    background: rgba(255, 255, 255, 0.1);
                    padding: 40px;
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                  }
                  .spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-top: 4px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                  }
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                  h1 { margin: 0 0 10px 0; font-size: 24px; }
                  p { margin: 0; opacity: 0.9; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>✅ Login realizado com sucesso!</h1>
                  <p>Redirecionando para sua área...</p>
                  <div class="spinner"></div>
                </div>
                <script>
                  try {
                    const userData = ${JSON.stringify(userData)};
                    console.log('Saving user data:', userData);
                    localStorage.setItem('user', JSON.stringify(userData));
                    console.log('User data saved to localStorage');
                    
                    // Aguardar um pouco antes de redirecionar
                    setTimeout(() => {
                      console.log('Redirecting to:', '${redirectPath}');
                      window.location.href = '${redirectPath}';
                    }, 1500);
                  } catch (error) {
                    console.error('Error saving user data:', error);
                    // Fallback: redirecionar mesmo com erro
                    setTimeout(() => {
                      window.location.href = '${redirectPath}';
                    }, 2000);
                  }
                </script>
              </body>
            </html>
          `

          return new NextResponse(html, {
            headers: {
              'Content-Type': 'text/html',
            },
          })
        }
      }
    } catch (error) {
      console.error('Unexpected error in callback:', error)
      return NextResponse.redirect(`${origin}/login?error=unexpected_error`)
    }
  }

  // Se chegou até aqui, houve erro no processo
  console.log('No code provided or other error')
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
