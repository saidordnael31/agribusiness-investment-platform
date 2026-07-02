-- scripts/075_create_monthly_returns_and_refactor_commissions.sql
-- Rendimentos mensais acumulados (cron dia 20) e comissões de pagamento ao investidor

-- ---------------------------------------------------------------------------
-- monthly_returns: um registro por período mensal de rendimento
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.monthly_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  investment_amount DECIMAL(15,2) NOT NULL,
  investment_rate DECIMAL(5,4) NOT NULL,
  return_amount DECIMAL(15,2) NOT NULL,
  return_rate DECIMAL(5,4) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  commission_type TEXT NOT NULL CHECK (
    commission_type IN ('Mensal', 'Semestral', 'Anual', 'Bienal', 'Trienal')
  ),
  current_return_period INTEGER NOT NULL CHECK (current_return_period > 0),
  to_be_pay_at DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_returns_investment_period
  ON public.monthly_returns(investment_id, current_return_period);

CREATE INDEX IF NOT EXISTS idx_monthly_returns_investor_id
  ON public.monthly_returns(investor_id);

CREATE INDEX IF NOT EXISTS idx_monthly_returns_investment_id
  ON public.monthly_returns(investment_id);

CREATE INDEX IF NOT EXISTS idx_monthly_returns_paid_at
  ON public.monthly_returns(paid_at)
  WHERE paid_at IS NULL;

COMMENT ON TABLE public.monthly_returns IS 'Rendimento mensal gerado pelo cron (fechamento dia 20)';
COMMENT ON COLUMN public.monthly_returns.commission_type IS 'Liquidez do investimento (profitability_liquidity)';
COMMENT ON COLUMN public.monthly_returns.current_return_period IS 'Número do período mensal desde o primeiro corte';
COMMENT ON COLUMN public.monthly_returns.paid_at IS 'Preenchido manualmente quando o rendimento for pago';

ALTER TABLE public.monthly_returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monthly_returns_select_own" ON public.monthly_returns;
CREATE POLICY "monthly_returns_select_own"
  ON public.monthly_returns
  FOR SELECT
  USING (auth.uid() = investor_id);

DROP POLICY IF EXISTS "monthly_returns_select_admin" ON public.monthly_returns;
CREATE POLICY "monthly_returns_select_admin"
  ON public.monthly_returns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- commissions: pagamento ao investidor (agrupa monthly_returns não pagos)
-- Substitui estrutura anterior (comissões de distribuidor)
-- ATENÇÃO: DROP TABLE apaga dados existentes em commissions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "commissions_select_own" ON public.commissions;
DROP POLICY IF EXISTS "commissions_select_admin" ON public.commissions;

DROP TABLE IF EXISTS public.commissions;

CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  investment_amount DECIMAL(15,2) NOT NULL,
  commission_type TEXT NOT NULL CHECK (
    commission_type IN ('Mensal', 'Semestral', 'Anual', 'Bienal', 'Trienal')
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'paid', 'late')
  ),
  paid_at TIMESTAMP WITH TIME ZONE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  commission_amount DECIMAL(15,2) NOT NULL,
  investment_rate DECIMAL(5,4) NOT NULL,
  month_rate DECIMAL(5,4) NOT NULL,
  to_be_pay_at DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commissions_investment_period_end
  ON public.commissions(investment_id, period_end);

CREATE INDEX IF NOT EXISTS idx_commissions_investor_id
  ON public.commissions(investor_id);

CREATE INDEX IF NOT EXISTS idx_commissions_status
  ON public.commissions(status);

COMMENT ON TABLE public.commissions IS 'Comissão de pagamento ao investidor (agrupa monthly_returns por liquidez)';
COMMENT ON COLUMN public.commissions.commission_amount IS 'Soma dos return_amount dos monthly_returns não pagos do bloco';
COMMENT ON COLUMN public.commissions.status IS 'Atualizado manualmente: pending, paid, late';
COMMENT ON COLUMN public.commissions.paid_at IS 'Data do pagamento efetivo (manual)';
COMMENT ON COLUMN public.commissions.month_rate IS 'Taxa efetiva do período: commission_amount / investment_amount';

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commissions_select_own" ON public.commissions;
CREATE POLICY "commissions_select_own"
  ON public.commissions
  FOR SELECT
  USING (auth.uid() = investor_id);

DROP POLICY IF EXISTS "commissions_select_admin" ON public.commissions;
CREATE POLICY "commissions_select_admin"
  ON public.commissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );
