import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile/advisor
 * Retorna o perfil do assessor (parent) do usuário logado.
 * Usa service role no servidor para contornar RLS.
 * Aceita sessão por cookie ou por header Authorization: Bearer <access_token> (útil logo após login).
 */
export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null;

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (token) {
      const supabaseAnon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: { user } } = await supabaseAnon.auth.getUser(token);
      userId = user?.id ?? null;
    }

    if (!userId) {
      const supabase = await createServerClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: "Usuário não autenticado" },
          { status: 401 }
        );
      }
      userId = user.id;
    }

    const admin = createAdminClient();
    const { data: myProfile } = await admin
      .from("profiles")
      .select("parent_id")
      .eq("id", userId)
      .maybeSingle();

    if (!myProfile?.parent_id) {
      return NextResponse.json(
        { success: true, advisor: null },
        { status: 200 }
      );
    }

    const { data: advisorProfile, error: advisorError } = await admin
      .from("profiles")
      .select("id, full_name, email, role, user_type")
      .eq("id", myProfile.parent_id)
      .maybeSingle();

    if (advisorError) {
      return NextResponse.json(
        { success: false, error: advisorError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      advisor: advisorProfile
        ? {
            assessor_id: advisorProfile.id,
            assessor_nome: advisorProfile.full_name,
            assessor_email: advisorProfile.email,
            assessor_role: advisorProfile.role,
            assessor_tipo: advisorProfile.user_type,
          }
        : null,
    });
  } catch (e) {
    console.error("[api/profile/advisor]", e);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar assessor" },
      { status: 500 }
    );
  }
}

