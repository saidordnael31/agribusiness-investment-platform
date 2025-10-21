-- Script para corrigir políticas RLS da tabela investments
-- Permite que assessores atualizem investimentos dos seus investidores

-- 1. Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'investments';

-- 2. Remover políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "investments_update_own" ON investments;
DROP POLICY IF EXISTS "investments_update_admin" ON investments;
DROP POLICY IF EXISTS "investments_update_assessor" ON investments;

-- 3. Criar nova política que permite:
-- - Admins atualizarem qualquer investimento
-- - Assessores atualizarem investimentos dos seus investidores
CREATE POLICY "investments_update_policy" ON investments
FOR UPDATE
USING (
  -- Admin pode atualizar qualquer investimento
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'admin'
  )
  OR
  -- Assessor pode atualizar investimentos dos seus investidores
  EXISTS (
    SELECT 1 FROM profiles assessor_profile
    JOIN profiles investor_profile ON investor_profile.parent_id = assessor_profile.id
    WHERE assessor_profile.id = auth.uid()
    AND assessor_profile.user_type = 'distributor'
    AND assessor_profile.role = 'assessor'
    AND investor_profile.id = investments.user_id
    AND investor_profile.user_type = 'investor'
  )
)
WITH CHECK (
  -- Admin pode atualizar qualquer investimento
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'admin'
  )
  OR
  -- Assessor pode atualizar investimentos dos seus investidores
  EXISTS (
    SELECT 1 FROM profiles assessor_profile
    JOIN profiles investor_profile ON investor_profile.parent_id = assessor_profile.id
    WHERE assessor_profile.id = auth.uid()
    AND assessor_profile.user_type = 'distributor'
    AND assessor_profile.role = 'assessor'
    AND investor_profile.id = investments.user_id
    AND investor_profile.user_type = 'investor'
  )
);

-- 4. Verificar se a política foi criada corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'investments' AND policyname = 'investments_update_policy';
