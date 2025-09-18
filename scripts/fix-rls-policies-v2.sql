-- Corrigindo comparações entre text e uuid com conversões adequadas
-- Configurar políticas RLS para permitir cadastro de investidores por distribuidores

-- Habilitar RLS na tabela profiles se não estiver habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Distributors can insert investors" ON profiles;
DROP POLICY IF EXISTS "Distributors can view their investors" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Política para permitir que usuários vejam seu próprio perfil
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id::text = auth.uid()::text);

-- Política para permitir que usuários atualizem seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id::text = auth.uid()::text);

-- Política para permitir que distribuidores e assessores insiram investidores
CREATE POLICY "Distributors can insert investors" ON profiles
    FOR INSERT WITH CHECK (
        user_type = 'investor' AND
        parent_id::text = auth.uid()::text AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id::text = auth.uid()::text 
            AND user_type IN ('distributor', 'assessor')
        )
    );

-- Política para permitir que distribuidores vejam seus investidores
CREATE POLICY "Distributors can view their investors" ON profiles
    FOR SELECT USING (
        parent_id::text = auth.uid()::text OR
        id::text = auth.uid()::text
    );

-- Política para permitir inserção durante o processo de registro (trigger)
CREATE POLICY "Allow insert during registration" ON profiles
    FOR INSERT WITH CHECK (
        id::text = auth.uid()::text
    );

-- Verificar se as políticas foram criadas corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
