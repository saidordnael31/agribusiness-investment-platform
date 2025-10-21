-- Script para corrigir políticas RLS da tabela investor_contracts
-- Permitir que assessores vejam contratos de seus investidores
-- Execute este script no Supabase SQL Editor

-- ========================================
-- CORREÇÃO DAS POLÍTICAS RLS PARA CONTRATOS
-- ========================================

-- 1. Remover política antiga se existir
DROP POLICY IF EXISTS "investor_contracts_select_advisor" ON public.investor_contracts;

-- 2. Criar nova política para assessores
CREATE POLICY "investor_contracts_select_advisor" ON public.investor_contracts 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p2.parent_id = p1.id OR p2.office_id = p1.id
      WHERE p1.id = auth.uid() 
      AND p1.user_type = 'distributor'
      AND p2.id = investor_id
    )
  );

-- 3. Verificar se a política foi criada
SELECT 
    'Política para assessores' as item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'investor_contracts' 
            AND policyname = 'investor_contracts_select_advisor'
        ) 
        THEN '✅ CRIADA' 
        ELSE '❌ NÃO CRIADA' 
    END as status;

-- 4. Listar todas as políticas da tabela
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'investor_contracts'
ORDER BY policyname;
