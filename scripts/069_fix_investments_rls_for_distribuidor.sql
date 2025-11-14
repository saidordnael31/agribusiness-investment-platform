-- Política RLS para permitir que distribuidores vejam investimentos dos seus investidores
-- Usa o campo distributor_id para verificar a relação

-- Remover política existente se houver
DROP POLICY IF EXISTS "Distribuidores can view investments of their investors" ON investments;

-- Criar política para distribuidores visualizarem investimentos dos seus investidores
CREATE POLICY "Distribuidores can view investments of their investors" ON investments
    FOR SELECT USING (
        -- Usuário pode ver seus próprios investimentos
        user_id = auth.uid()
        OR
        -- Distribuidor pode ver investimentos dos investidores onde distributor_id = auth.uid()
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = investments.user_id
            AND profiles.distributor_id = auth.uid()
        )
    );

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'investments' 
AND policyname LIKE '%Distribuidor%';

