-- Script para adicionar política RLS permitindo que distribuidores vejam contratos de seus investidores
-- Execute este script no Supabase SQL Editor
-- 
-- Esta política permite que distribuidores vejam contratos de investidores que têm
-- o distributor_id igual ao ID do distribuidor logado

-- ========================================
-- POLÍTICA RLS PARA DISTRIBUIDORES
-- ========================================

-- Remover política antiga se existir
DROP POLICY IF EXISTS "investor_contracts_select_distributor" ON public.investor_contracts;

-- Criar política para distribuidores verem contratos de investidores vinculados
-- Um distribuidor pode ver contratos de investidores que têm distributor_id igual ao seu ID
CREATE POLICY "investor_contracts_select_distributor" ON public.investor_contracts 
  FOR SELECT USING (
    -- Verificar se o usuário logado é um distribuidor
    EXISTS (
      SELECT 1 FROM public.profiles p1
      WHERE p1.id = auth.uid() 
      AND p1.user_type = 'distributor'
    )
    AND
    -- Verificar se o investidor tem distributor_id igual ao distribuidor logado
    EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = investor_contracts.investor_id
      AND p2.user_type = 'investor'
      AND p2.distributor_id = auth.uid()
    )
  );

-- ========================================
-- VERIFICAÇÃO
-- ========================================

-- Verificar se a política foi criada
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'investor_contracts'
AND policyname = 'investor_contracts_select_distributor';

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Política RLS para distribuidores criada com sucesso!';
  RAISE NOTICE 'Distribuidores agora podem ver contratos de investidores onde distributor_id = auth.uid()';
END $$;

