-- scripts/073_add_renewal_fields_to_investments.sql
-- Adicionar campos para rastrear renovações na tabela investments

-- Adicionar campos para rastrear renovações
ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS renewal_count INTEGER DEFAULT 0;

ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS last_renewal_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS original_investment_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS current_cycle_start_date TIMESTAMP WITH TIME ZONE;

-- Comentários para documentação
COMMENT ON COLUMN public.investments.renewal_count IS 'Número de vezes que este investimento foi renovado';
COMMENT ON COLUMN public.investments.last_renewal_date IS 'Data da última renovação';
COMMENT ON COLUMN public.investments.original_investment_date IS 'Data original de criação do investimento (não muda com renovações)';
COMMENT ON COLUMN public.investments.current_cycle_start_date IS 'Data de início do ciclo atual (atualizada a cada renovação)';

-- Atualizar investimentos existentes para preencher campos iniciais
UPDATE public.investments
SET 
  original_investment_date = COALESCE(payment_date, created_at),
  current_cycle_start_date = COALESCE(payment_date, created_at),
  renewal_count = 0
WHERE original_investment_date IS NULL;

