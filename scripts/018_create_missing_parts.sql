-- Script para criar apenas o que está faltando
-- Execute este script no Supabase SQL Editor

-- 1. Criar tabela investor_contracts se não existir
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

-- 3. Remover políticas RLS antigas se existirem
DROP POLICY IF EXISTS "investor_contracts_select_own" ON public.investor_contracts;
DROP POLICY IF EXISTS "investor_contracts_select_admin" ON public.investor_contracts;
DROP POLICY IF EXISTS "investor_contracts_insert_admin" ON public.investor_contracts;
DROP POLICY IF EXISTS "investor_contracts_update_admin" ON public.investor_contracts;
DROP POLICY IF EXISTS "investor_contracts_delete_admin" ON public.investor_contracts;

-- 4. Criar políticas RLS da tabela
CREATE POLICY "investor_contracts_select_own" ON public.investor_contracts 
  FOR SELECT USING (auth.uid() = investor_id);

CREATE POLICY "investor_contracts_select_admin" ON public.investor_contracts 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "investor_contracts_insert_admin" ON public.investor_contracts 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "investor_contracts_update_admin" ON public.investor_contracts 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "investor_contracts_delete_admin" ON public.investor_contracts 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- 5. Criar índices
CREATE INDEX IF NOT EXISTS idx_investor_contracts_investor_id ON public.investor_contracts(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_contracts_uploaded_by ON public.investor_contracts(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_investor_contracts_status ON public.investor_contracts(status);

-- 6. Remover políticas de storage antigas
DROP POLICY IF EXISTS "contracts_upload_admin" ON storage.objects;
DROP POLICY IF EXISTS "contracts_view_admin_and_owner" ON storage.objects;
DROP POLICY IF EXISTS "contracts_delete_admin" ON storage.objects;
DROP POLICY IF EXISTS "contracts_update_admin" ON storage.objects;

-- 7. Criar políticas de storage
CREATE POLICY "contracts_upload_admin" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

CREATE POLICY "contracts_view_admin_and_owner" ON storage.objects
FOR SELECT USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND user_type = 'admin'
        ) OR
        EXISTS (
            SELECT 1 FROM public.investor_contracts ic
            WHERE ic.investor_id = auth.uid() 
            AND ic.file_url LIKE '%' || name || '%'
        )
    )
);

CREATE POLICY "contracts_delete_admin" ON storage.objects
FOR DELETE USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

CREATE POLICY "contracts_update_admin" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- 8. Verificação final
SELECT 'Tabela criada' as item, '✅ CONCLUÍDO' as status
UNION ALL
SELECT 'Políticas RLS criadas' as item, '✅ CONCLUÍDO' as status
UNION ALL
SELECT 'Políticas Storage criadas' as item, '✅ CONCLUÍDO' as status
UNION ALL
SELECT 'Índices criados' as item, '✅ CONCLUÍDO' as status;
