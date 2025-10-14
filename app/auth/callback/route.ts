import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/newPassword'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Redirecionar para a página de nova senha após autenticação bem-sucedida
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Se houver erro ou não houver código, redirecionar para login
  return NextResponse.redirect(`${origin}/login?error=invalid_token`)
}
