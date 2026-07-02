import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.user_type !== "admin") {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Apenas administradores." },
        { status: 403 },
      );
    }

    const admin = createAdminClient();

    const { data: commission, error: commissionError } = await admin
      .from("commissions")
      .select(
        "id, investment_id, period_start, period_end, status, paid_at",
      )
      .eq("id", id)
      .single();

    if (commissionError || !commission) {
      return NextResponse.json(
        { success: false, error: "Comissão não encontrada" },
        { status: 404 },
      );
    }

    if (commission.status !== "paid" && !commission.paid_at) {
      return NextResponse.json(
        { success: false, error: "Esta comissão não está marcada como paga." },
        { status: 400 },
      );
    }

    const { data: updatedCommission, error: updateError } = await admin
      .from("commissions")
      .update({
        status: "pending",
        paid_at: null,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    const { error: returnsUpdateError } = await admin
      .from("monthly_returns")
      .update({ paid_at: null })
      .eq("investment_id", commission.investment_id)
      .gte("period_start", commission.period_start)
      .lte("period_end", commission.period_end);

    if (returnsUpdateError) {
      console.error("Erro ao limpar paid_at dos monthly_returns:", returnsUpdateError);
    }

    return NextResponse.json({
      success: true,
      data: updatedCommission,
    });
  } catch (error: unknown) {
    console.error("Erro ao retirar pagamento da comissão:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao retirar pagamento da comissão";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
