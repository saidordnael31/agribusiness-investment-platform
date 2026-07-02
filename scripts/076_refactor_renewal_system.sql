-- scripts/076_refactor_renewal_system.sql
-- Refatoração do sistema de renovações:
-- - payment_date imutável após definido
-- - original_commitment_period na tabela investments
-- - remove last_renewal_date, original_investment_date, current_cycle_start_date
-- - nova estrutura da tabela investment_renewals

-- 1. Adicionar original_commitment_period
ALTER TABLE public.investments
ADD COLUMN IF NOT EXISTS original_commitment_period INTEGER;

COMMENT ON COLUMN public.investments.original_commitment_period IS
  'Período de compromisso original (não muda com renovações). commitment_period acumula o total.';

-- 2. Backfill para investimentos existentes
-- Investimentos já renovados: original = período unitário, commitment = total acumulado
UPDATE public.investments
SET
  original_commitment_period = commitment_period,
  commitment_period = commitment_period * (renewal_count + 1)
WHERE renewal_count > 0
  AND commitment_period IS NOT NULL;

-- Demais investimentos: original = commitment
UPDATE public.investments
SET original_commitment_period = commitment_period
WHERE original_commitment_period IS NULL
  AND commitment_period IS NOT NULL;

-- 3. Remover colunas obsoletas
ALTER TABLE public.investments
DROP COLUMN IF EXISTS last_renewal_date;

ALTER TABLE public.investments
DROP COLUMN IF EXISTS original_investment_date;

ALTER TABLE public.investments
DROP COLUMN IF EXISTS current_cycle_start_date;

-- 4. Trigger: preencher original_commitment_period na criação
CREATE OR REPLACE FUNCTION public.set_original_commitment_period_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.original_commitment_period IS NULL AND NEW.commitment_period IS NOT NULL THEN
    NEW.original_commitment_period := NEW.commitment_period;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_investments_set_original_commitment_period ON public.investments;

CREATE TRIGGER trg_investments_set_original_commitment_period
  BEFORE INSERT ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_original_commitment_period_on_insert();

-- 5. Trigger: payment_date imutável após definido (permite apenas NULL -> valor)
CREATE OR REPLACE FUNCTION public.prevent_payment_date_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.payment_date IS NOT NULL
     AND NEW.payment_date IS DISTINCT FROM OLD.payment_date THEN
    RAISE EXCEPTION 'payment_date não pode ser alterado após definido';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_investments_prevent_payment_date_change ON public.investments;

CREATE TRIGGER trg_investments_prevent_payment_date_change
  BEFORE UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_payment_date_change();

-- 6. Recriar tabela investment_renewals com nova estrutura
DROP TABLE IF EXISTS public.investment_renewals CASCADE;

CREATE TABLE public.investment_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_renew INTEGER NOT NULL CHECK (current_renew > 0),
  current_renewal_date TIMESTAMP WITH TIME ZONE NOT NULL,
  original_commitment_period INTEGER NOT NULL,
  last_commitment_period INTEGER NOT NULL,
  current_commitment_period INTEGER NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investment_renewals_investment_id
  ON public.investment_renewals(investment_id);

CREATE INDEX IF NOT EXISTS idx_investment_renewals_user_id
  ON public.investment_renewals(user_id);

CREATE INDEX IF NOT EXISTS idx_investment_renewals_created_at
  ON public.investment_renewals(created_at DESC);

COMMENT ON TABLE public.investment_renewals IS 'Histórico de renovações de investimentos';
COMMENT ON COLUMN public.investment_renewals.current_renew IS 'Número sequencial da renovação (1 = primeira, 2 = segunda, etc.)';
COMMENT ON COLUMN public.investment_renewals.payment_date IS 'Data de pagamento original do investimento (imutável)';

ALTER TABLE public.investment_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investment_renewals_select_own"
  ON public.investment_renewals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "investment_renewals_select_admin"
  ON public.investment_renewals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );
