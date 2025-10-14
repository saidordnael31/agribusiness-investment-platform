-- scripts/042_debug_rls_policies.sql

-- Verificar se RLS está habilitado na tabela pix_receipts
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'pix_receipts';

-- Verificar políticas RLS existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'pix_receipts'
ORDER BY policyname;

-- Verificar se o usuário atual tem permissões
SELECT 
    current_user,
    session_user,
    current_setting('role');

-- Testar se conseguimos ver os dados como admin
-- (Execute isso logado como admin)
SELECT COUNT(*) as total_receipts FROM public.pix_receipts;

-- Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'pix_receipts'
ORDER BY ordinal_position;
