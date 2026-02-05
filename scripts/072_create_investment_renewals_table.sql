-- scripts/072_create_investment_renewals_table.sql
-- Criar tabela de histórico de renovações de investimentos

-- Tabela para registrar histórico de renovações
CREATE TABLE IF NOT EXISTS public.investment_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados do ciclo anterior (antes da renovação)
  previous_payment_date TIMESTAMP WITH TIME ZONE,
  previous_commitment_period INTEGER,
  previous_profitability_liquidity TEXT,
  previous_monthly_return_rate DECIMAL(5,4),
  previous_expiry_date DATE,
  
  -- Dados do novo ciclo (após renovação)
  new_payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  new_commitment_period INTEGER,
  new_profitability_liquidity TEXT,
  new_monthly_return_rate DECIMAL(5,4),
  new_expiry_date DATE,
  
  -- Tipo de renovação
  renewal_type TEXT NOT NULL CHECK (renewal_type IN ('renew', 'renew_with_new_rules', 'suggest_increase')),
  
  -- Dados adicionais
  additional_amount DECIMAL(15,2), -- Para renovação com aumento
  additional_investment_id UUID REFERENCES public.investments(id), -- ID do novo investimento criado
  
  -- Metadados
  renewed_by UUID REFERENCES auth.users(id), -- Usuário que fez a renovação
  notes TEXT, -- Observações sobre a renovação
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_investment_renewals_investment_id ON public.investment_renewals(investment_id);
CREATE INDEX IF NOT EXISTS idx_investment_renewals_user_id ON public.investment_renewals(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_renewals_created_at ON public.investment_renewals(created_at DESC);

-- Comentários para documentação
COMMENT ON TABLE public.investment_renewals IS 'Histórico de todas as renovações de investimentos';
COMMENT ON COLUMN public.investment_renewals.renewal_type IS 'Tipo de renovação: renew (simples), renew_with_new_rules (com novas regras), suggest_increase (com aumento)';
COMMENT ON COLUMN public.investment_renewals.additional_investment_id IS 'ID do novo investimento criado quando renewal_type = suggest_increase';

-- Habilitar RLS
ALTER TABLE public.investment_renewals ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para investment_renewals
CREATE POLICY "investment_renewals_select_own" 
  ON public.investment_renewals 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Admin pode ver todas as renovações
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

