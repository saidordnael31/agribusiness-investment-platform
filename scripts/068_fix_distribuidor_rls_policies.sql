-- Políticas RLS para permitir que distribuidores vejam seus escritórios, assessores e investidores
-- Este script adiciona políticas específicas para o role "distribuidor"
-- SIMPLIFICADO: Agora usa o campo distributor_id que existe em todos os usuários descendentes

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Distribuidores can view their escritorios" ON profiles;
DROP POLICY IF EXISTS "Distribuidores can view assessores of their escritorios" ON profiles;
DROP POLICY IF EXISTS "Distribuidores can view investors of their escritorios" ON profiles;

-- Remover funções antigas se existirem (não são mais necessárias)
DROP FUNCTION IF EXISTS is_current_user_distribuidor();
DROP FUNCTION IF EXISTS is_escritorio_of_distribuidor(UUID);

-- Política única e simplificada para distribuidores visualizarem todos os perfis relacionados
-- Verifica se o distributor_id do perfil corresponde ao distribuidor atual
CREATE POLICY "Distribuidores can view related profiles" ON profiles
    FOR SELECT USING (
        -- Distribuidor pode ver seu próprio perfil
        id = auth.uid()
        OR
        -- Distribuidor pode ver qualquer perfil onde distributor_id = auth.uid()
        distributor_id = auth.uid()
    );

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'profiles' 
AND policyname LIKE '%Distribuidor%';

