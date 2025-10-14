-- scripts/043_simple_debug_rls.sql

-- Verificar se RLS está habilitado na tabela pix_receipts
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'pix_receipts';

-- Verificar políticas RLS existentes
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'pix_receipts'
ORDER BY policyname;

-- Verificar usuário atual
SELECT current_user as current_user;

-- Contar comprovantes (deve funcionar se RLS estiver correto)
SELECT COUNT(*) as total_receipts FROM public.pix_receipts;

-- Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'pix_receipts'
ORDER BY ordinal_position;
