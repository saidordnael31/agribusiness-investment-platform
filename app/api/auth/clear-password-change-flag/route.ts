import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { success: false, error: "ID do usuário é obrigatório" },
        { status: 400 }
      );
    }

    console.log(`[CLEAR-PASSWORD-FLAG] Removendo flag is_pass_temp para usuário: ${userId}`);

    const supabase = createAdminClient();
    
    // Atualizar profile para remover flag
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ is_pass_temp: false })
      .eq("id", userId);

    if (profileError) {
      console.error("Erro ao atualizar profile:", profileError);
      return NextResponse.json(
        { success: false, error: "Erro ao atualizar perfil" },
        { status: 500 }
      );
    }

    console.log(`[CLEAR-PASSWORD-FLAG] ✅ Flag removida com sucesso para usuário: ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Flag removida com sucesso",
    });
  } catch (error: any) {
    console.error("[CLEAR-PASSWORD-FLAG] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao processar solicitação" },
      { status: 500 }
    );
  }
}

