-- Script para corrigir políticas RLS da tabela investments
-- Permite que assessores externos vejam investimentos dos seus investidores usando parent_id

-- 1. Verificar políticas existentes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'investments';

-- 2. Remover política existente se houver (vamos recriar com suporte a assessores externos)
DROP POLICY IF EXISTS "Assessores can view investments of their investors" ON investments;

-- 3. Criar política que permite assessores (internos e externos) verem investimentos dos seus investidores
CREATE POLICY "Assessores can view investments of their investors" ON investments
    FOR SELECT USING (
        -- Usuário pode ver seus próprios investimentos
        user_id = auth.uid()
        OR
        -- Admin pode ver todos os investimentos
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.user_type = 'admin'
        )
        OR
        -- Distribuidor pode ver investimentos dos investidores onde distributor_id = auth.uid()
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = investments.user_id
            AND profiles.distributor_id = auth.uid()
        )
        OR
        -- Assessor (interno ou externo) pode ver investimentos dos seus investidores usando parent_id
        EXISTS (
            SELECT 1 FROM profiles assessor_profile
            JOIN profiles investor_profile ON investor_profile.parent_id = assessor_profile.id
            WHERE assessor_profile.id = auth.uid()
            AND assessor_profile.user_type = 'distributor'
            AND (assessor_profile.role = 'assessor' OR assessor_profile.role = 'assessor_externo')
            AND investor_profile.id = investments.user_id
            AND investor_profile.user_type = 'investor'
        )
    );

-- 4. Atualizar política de UPDATE para incluir assessores externos
DROP POLICY IF EXISTS "investments_update_policy" ON investments;

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
  -- Assessor (interno ou externo) pode atualizar investimentos dos seus investidores
  EXISTS (
    SELECT 1 FROM profiles assessor_profile
    JOIN profiles investor_profile ON investor_profile.parent_id = assessor_profile.id
    WHERE assessor_profile.id = auth.uid()
    AND assessor_profile.user_type = 'distributor'
    AND (assessor_profile.role = 'assessor' OR assessor_profile.role = 'assessor_externo')
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
  -- Assessor (interno ou externo) pode atualizar investimentos dos seus investidores
  EXISTS (
    SELECT 1 FROM profiles assessor_profile
    JOIN profiles investor_profile ON investor_profile.parent_id = assessor_profile.id
    WHERE assessor_profile.id = auth.uid()
    AND assessor_profile.user_type = 'distributor'
    AND (assessor_profile.role = 'assessor' OR assessor_profile.role = 'assessor_externo')
    AND investor_profile.id = investments.user_id
    AND investor_profile.user_type = 'investor'
  )
);

-- 5. Verificar se as políticas foram criadas corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'investments' 
AND (policyname LIKE '%Assessor%' OR policyname LIKE '%update%');

