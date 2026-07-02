import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface PayCommissionBody {
  paid_at: string;
}

function toPaidAtTimestamp(dateOnly: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("Data de pagamento inválida");
  }

  const paidAt = new Date(year, month - 1, day, 12, 0, 0, 0);
  return paidAt.toISOString();
}

export async function PATCH(
  request: Request,
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

    const body = (await request.json()) as PayCommissionBody;
    if (!body.paid_at?.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return NextResponse.json(
        { success: false, error: "Informe a data de pagamento (AAAA-MM-DD)." },
        { status: 400 },
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

    if (commission.status === "paid" || commission.paid_at) {
      return NextResponse.json(
        { success: false, error: "Esta comissão já está marcada como paga." },
        { status: 400 },
      );
    }

    const paidAtIso = toPaidAtTimestamp(body.paid_at);

    const { data: updatedCommission, error: updateError } = await admin
      .from("commissions")
      .update({
        status: "paid",
        paid_at: paidAtIso,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    const { error: returnsUpdateError } = await admin
      .from("monthly_returns")
      .update({ paid_at: paidAtIso })
      .eq("investment_id", commission.investment_id)
      .gte("period_start", commission.period_start)
      .lte("period_end", commission.period_end)
      .is("paid_at", null);

    if (returnsUpdateError) {
      console.error("Erro ao atualizar monthly_returns:", returnsUpdateError);
    }

    return NextResponse.json({
      success: true,
      data: updatedCommission,
    });
  } catch (error: unknown) {
    console.error("Erro ao marcar comissão como paga:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao marcar comissão como paga";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
