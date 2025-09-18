-- Configurando políticas RLS para permitir que distribuidores cadastrem investidores

-- Primeiro, vamos verificar as políticas existentes e removê-las se necessário
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Distributors can view their investors" ON profiles;
DROP POLICY IF EXISTS "Distributors can insert investors" ON profiles;

-- Habilitar RLS na tabela profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política para usuários visualizarem seu próprio perfil
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid()::text = id);

-- Política para usuários atualizarem seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid()::text = id);

-- Política para admins visualizarem todos os perfis
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid()::text 
            AND user_type = 'admin'
        )
    );

-- Política para admins inserirem perfis
CREATE POLICY "Admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid()::text 
            AND user_type = 'admin'
        )
    );

-- Política para admins atualizarem todos os perfis
CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid()::text 
            AND user_type = 'admin'
        )
    );

-- Política para distribuidores visualizarem seus investidores
CREATE POLICY "Distributors can view their investors" ON profiles
    FOR SELECT USING (
        -- Distribuidor pode ver seu próprio perfil
        auth.uid()::text = id
        OR
        -- Distribuidor pode ver investidores que ele cadastrou
        (
            user_type = 'investor' 
            AND parent_id = auth.uid()::text
        )
        OR
        -- Distribuidor pode ver outros distribuidores (para ranking, etc)
        (
            user_type IN ('distributor', 'assessor') 
            AND EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid()::text 
                AND user_type IN ('distributor', 'assessor')
            )
        )
    );

-- Política CRUCIAL: permitir que distribuidores insiram investidores
CREATE POLICY "Distributors can insert investors" ON profiles
    FOR INSERT WITH CHECK (
        -- Apenas distribuidores/assessores podem inserir
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid()::text 
            AND user_type IN ('distributor', 'assessor')
        )
        AND
        -- E só podem inserir investidores
        user_type = 'investor'
        AND
        -- Que sejam associados a eles mesmos
        parent_id = auth.uid()::text
    );

-- Política para distribuidores atualizarem investidores que cadastraram
CREATE POLICY "Distributors can update their investors" ON profiles
    FOR UPDATE USING (
        -- Distribuidor pode atualizar investidores que ele cadastrou
        user_type = 'investor' 
        AND parent_id = auth.uid()::text
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid()::text 
            AND user_type IN ('distributor', 'assessor')
        )
    );

-- Verificar se as políticas foram criadas corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
