-- Script de teste para verificar permissões de upload
-- Execute este script para verificar se as políticas RLS estão funcionando

-- Verificar se o bucket existe
SELECT 
    id, 
    name, 
    public, 
    file_size_limit, 
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id = 'pix_receipts';

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
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE 'pix_receipts%'
ORDER BY policyname;

-- Verificar se a tabela pix_receipts existe
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pix_receipts' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Teste de permissão (simulação)
-- Este comando deve retornar true se o usuário estiver autenticado
SELECT 
    auth.role() as current_role,
    auth.uid() as current_user_id,
    CASE 
        WHEN auth.role() = 'authenticated' THEN 'Usuário autenticado'
        ELSE 'Usuário não autenticado'
    END as auth_status;

-- Verificar se existem usuários admin
SELECT 
    id,
    email,
    user_type,
    full_name
FROM public.profiles 
WHERE user_type = 'admin'
LIMIT 5;
