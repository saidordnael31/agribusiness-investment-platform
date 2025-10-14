-- Criar tabela para contratos dos investidores
CREATE TABLE IF NOT EXISTS public.investor_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela investor_contracts
ALTER TABLE public.investor_contracts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para investor_contracts
-- Investidores podem ver seus próprios contratos
CREATE POLICY "investor_contracts_select_own" ON public.investor_contracts 
  FOR SELECT USING (auth.uid() = investor_id);

-- Apenas admins podem inserir contratos
CREATE POLICY "investor_contracts_insert_admin" ON public.investor_contracts 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Apenas admins podem atualizar contratos
CREATE POLICY "investor_contracts_update_admin" ON public.investor_contracts 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Apenas admins podem deletar contratos
CREATE POLICY "investor_contracts_delete_admin" ON public.investor_contracts 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_investor_contracts_investor_id ON public.investor_contracts(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_contracts_uploaded_by ON public.investor_contracts(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_investor_contracts_status ON public.investor_contracts(status);
