import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface UpdateMonthlyReturnBody {
  return_amount: number;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateReturnRate(returnAmount: number, investmentAmount: number): number {
  if (investmentAmount <= 0) return 0;
  return Number((returnAmount / investmentAmount).toFixed(4));
}

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 },
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.user_type !== "admin") {
    return {
      error: NextResponse.json(
        { success: false, error: "Acesso negado. Apenas administradores." },
        { status: 403 },
      ),
    };
  }

  return { user };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await assertAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = (await request.json()) as UpdateMonthlyReturnBody;
    const returnAmount = Number(body.return_amount);

    if (!Number.isFinite(returnAmount) || returnAmount < 0) {
      return NextResponse.json(
        { success: false, error: "Informe um valor de retorno válido (zero ou maior)." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { data: monthlyReturn, error: monthlyReturnError } = await admin
      .from("monthly_returns")
      .select(
        "id, investment_id, investment_amount, return_amount, period_start, period_end, paid_at",
      )
      .eq("id", id)
      .single();

    if (monthlyReturnError || !monthlyReturn) {
      return NextResponse.json(
        { success: false, error: "Rendimento mensal não encontrado" },
        { status: 404 },
      );
    }

    const { data: commission, error: commissionLookupError } = await admin
      .from("commissions")
      .select("id, investment_amount, period_start, period_end, status, paid_at")
      .eq("investment_id", monthlyReturn.investment_id)
      .lte("period_start", monthlyReturn.period_start)
      .gte("period_end", monthlyReturn.period_end)
      .maybeSingle();

    if (commissionLookupError) {
      throw commissionLookupError;
    }

    const investmentAmount = Number(monthlyReturn.investment_amount);
    const normalizedAmount = roundCurrency(returnAmount);
    const returnRate = calculateReturnRate(normalizedAmount, investmentAmount);

    const { data: updatedReturn, error: updateReturnError } = await admin
      .from("monthly_returns")
      .update({
        return_amount: normalizedAmount,
        return_rate: returnRate,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateReturnError) {
      throw updateReturnError;
    }

    if (!commission) {
      return NextResponse.json({
        success: true,
        data: {
          monthly_return: updatedReturn,
          commission: null,
        },
      });
    }

    const { data: blockReturns, error: blockReturnsError } = await admin
      .from("monthly_returns")
      .select("return_amount")
      .eq("investment_id", monthlyReturn.investment_id)
      .gte("period_start", commission.period_start)
      .lte("period_end", commission.period_end);

    if (blockReturnsError) {
      throw blockReturnsError;
    }

    const commissionAmount = roundCurrency(
      (blockReturns || []).reduce(
        (sum, row) => sum + Number(row.return_amount),
        0,
      ),
    );
    const commissionInvestmentAmount = Number(commission.investment_amount);
    const monthRate = calculateReturnRate(
      commissionAmount,
      commissionInvestmentAmount,
    );

    const { data: updatedCommission, error: updateCommissionError } = await admin
      .from("commissions")
      .update({
        commission_amount: commissionAmount,
        month_rate: monthRate,
      })
      .eq("id", commission.id)
      .select()
      .single();

    if (updateCommissionError) {
      throw updateCommissionError;
    }

    return NextResponse.json({
      success: true,
      data: {
        monthly_return: updatedReturn,
        commission: updatedCommission,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao atualizar rendimento mensal:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Erro ao atualizar rendimento mensal";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
