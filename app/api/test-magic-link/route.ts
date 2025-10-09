import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    console.log("Testando configuração do Supabase...")
    
    // Verificar variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log("Supabase URL:", supabaseUrl ? "✅ Configurado" : "❌ Não configurado")
    console.log("Supabase Key:", supabaseKey ? "✅ Configurado" : "❌ Não configurado")
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: "Variáveis de ambiente do Supabase não configuradas",
        details: {
          url: !!supabaseUrl,
          key: !!supabaseKey
        }
      })
    }

    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Testar conexão
    const { data, error } = await supabase.from("profiles").select("count").limit(1)
    
    if (error) {
      console.error("Erro ao testar conexão:", error)
      return NextResponse.json({
        success: false,
        error: "Erro ao conectar com Supabase",
        details: error.message
      })
    }

    return NextResponse.json({
      success: true,
      message: "Supabase configurado corretamente",
      details: {
        url: supabaseUrl,
        key: supabaseKey ? "Configurado" : "Não configurado",
        connection: "OK"
      }
    })

  } catch (error: any) {
    console.error("Erro no teste:", error)
    return NextResponse.json({
      success: false,
      error: "Erro interno",
      details: error.message
    })
  }
}
