-- Políticas RLS para permitir que ESCRITÓRIOS vejam seus assessores e investidores
-- Necessário para o dashboard do escritório exibir dados corretamente
-- Execute este script no SQL Editor do Supabase

-- ============================================
-- 1. PROFILES: Escritório pode ver perfis relacionados
-- ============================================
CREATE POLICY "Escritorios can view related profiles" ON profiles
    FOR SELECT USING (
        -- Próprio perfil
        id = auth.uid()
        OR
        -- Assessores do escritório (office_id = escritório)
        office_id = auth.uid()
        OR
        -- Assessores com escritório como parent
        parent_id = auth.uid()
        OR
        -- Investidores vinculados diretamente ao escritório
        (user_type_id IN (
            SELECT id FROM user_types WHERE user_type = 'investor'
        ) AND office_id = auth.uid())
        OR
        -- Investidores dos assessores deste escritório
        (user_type_id IN (
            SELECT id FROM user_types WHERE user_type = 'investor'
        ) AND parent_id IN (
            SELECT p.id FROM profiles p
            WHERE (p.office_id = auth.uid() OR p.parent_id = auth.uid())
            AND p.user_type_id IN (
                SELECT id FROM user_types WHERE user_type IN ('advisor', 'assessor')
            )
        ))
    );

-- ============================================
-- 2. INVESTMENTS: Escritório pode ver investimentos dos seus investidores
-- ============================================
-- Nota: A política atual pode ter nome diferente. Verificamos e adicionamos condição para office.
-- Precisamos atualizar a política existente ou criar uma adicional.

DROP POLICY IF EXISTS "Escritorios can view investments of their investors" ON investments;
CREATE POLICY "Escritorios can view investments of their investors" ON investments
    FOR SELECT USING (
        -- Investimentos de investidores onde office_id = escritório
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = investments.user_id
            AND profiles.office_id = auth.uid()
        )
        OR
        -- Investimentos de investidores cujo assessor pertence ao escritório
        EXISTS (
            SELECT 1 FROM profiles investor_profile
            JOIN profiles advisor_profile ON investor_profile.parent_id = advisor_profile.id
            WHERE investor_profile.id = investments.user_id
            AND (advisor_profile.office_id = auth.uid() OR advisor_profile.parent_id = auth.uid())
        )
    );

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'investments')
AND policyname LIKE '%Escritorio%';
