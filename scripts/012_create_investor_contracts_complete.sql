-- Script completo para criar a tabela investor_contracts e suas políticas
-- Execute este script no Supabase SQL Editor

-- 1. Criar a tabela investor_contracts
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

-- 2. Habilitar RLS na tabela
ALTER TABLE public.investor_contracts ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "investor_contracts_select_own" ON public.investor_contracts;
DROP POLICY IF EXISTS "investor_contracts_insert_admin" ON public.investor_contracts;
DROP POLICY IF EXISTS "investor_contracts_update_admin" ON public.investor_contracts;
DROP POLICY IF EXISTS "investor_contracts_delete_admin" ON public.investor_contracts;

-- 4. Criar políticas RLS
-- Investidores podem ver seus próprios contratos
CREATE POLICY "investor_contracts_select_own" ON public.investor_contracts 
  FOR SELECT USING (auth.uid() = investor_id);

-- Admins podem ver todos os contratos
CREATE POLICY "investor_contracts_select_admin" ON public.investor_contracts 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

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

-- 5. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_investor_contracts_investor_id ON public.investor_contracts(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_contracts_uploaded_by ON public.investor_contracts(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_investor_contracts_status ON public.investor_contracts(status);
CREATE INDEX IF NOT EXISTS idx_investor_contracts_created_at ON public.investor_contracts(created_at);

-- 6. Verificar se a tabela foi criada
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'investor_contracts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Verificar se as políticas foram criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'investor_contracts';
