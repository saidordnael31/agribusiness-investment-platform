-- Script para criar bucket e políticas de storage para contratos
-- Execute este script no Supabase SQL Editor

-- ========================================
-- CRIAÇÃO DO BUCKET E POLÍTICAS DE STORAGE
-- ========================================

-- 1. Criar bucket investor_contracts se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'investor_contracts',
    'investor_contracts',
    false, -- Não público por padrão
    10485760, -- 10MB limite
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

-- 2. Remover políticas antigas se existirem
DROP POLICY IF EXISTS "contracts_upload_admin" ON storage.objects;
DROP POLICY IF EXISTS "contracts_view_admin_and_owner" ON storage.objects;
DROP POLICY IF EXISTS "contracts_delete_admin" ON storage.objects;
DROP POLICY IF EXISTS "contracts_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "contracts_view_advisor" ON storage.objects;

-- 3. Criar políticas de storage para contratos

-- Política para upload (apenas admins)
CREATE POLICY "contracts_upload_admin" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- Política para visualização (admins, investidores e assessores)
CREATE POLICY "contracts_view_admin_and_owner" ON storage.objects
FOR SELECT USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND (
        -- Admin pode ver tudo
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND user_type = 'admin'
        ) OR
        -- Investidor pode ver seus próprios contratos
        EXISTS (
            SELECT 1 FROM public.investor_contracts ic
            JOIN public.profiles p ON p.id = ic.investor_id
            WHERE ic.investor_id = auth.uid() 
            AND ic.file_url LIKE '%' || name || '%'
        ) OR
        -- Assessor pode ver contratos de seus investidores
        EXISTS (
            SELECT 1 FROM public.investor_contracts ic
            JOIN public.profiles p ON p.id = ic.investor_id
            WHERE p.parent_id = auth.uid()
            AND ic.file_url LIKE '%' || name || '%'
        ) OR
        -- Escritório pode ver contratos de investidores do seu office_id
        EXISTS (
            SELECT 1 FROM public.investor_contracts ic
            JOIN public.profiles p ON p.id = ic.investor_id
            WHERE p.office_id = auth.uid()
            AND ic.file_url LIKE '%' || name || '%'
        )
    )
);

-- Política para download (mesma lógica de visualização)
CREATE POLICY "contracts_download_admin_and_owner" ON storage.objects
FOR SELECT USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND (
        -- Admin pode baixar tudo
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND user_type = 'admin'
        ) OR
        -- Investidor pode baixar seus próprios contratos
        EXISTS (
            SELECT 1 FROM public.investor_contracts ic
            JOIN public.profiles p ON p.id = ic.investor_id
            WHERE ic.investor_id = auth.uid() 
            AND ic.file_url LIKE '%' || name || '%'
        ) OR
        -- Assessor pode baixar contratos de seus investidores
        EXISTS (
            SELECT 1 FROM public.investor_contracts ic
            JOIN public.profiles p ON p.id = ic.investor_id
            WHERE p.parent_id = auth.uid()
            AND ic.file_url LIKE '%' || name || '%'
        ) OR
        -- Escritório pode baixar contratos de investidores do seu office_id
        EXISTS (
            SELECT 1 FROM public.investor_contracts ic
            JOIN public.profiles p ON p.id = ic.investor_id
            WHERE p.office_id = auth.uid()
            AND ic.file_url LIKE '%' || name || '%'
        )
    )
);

-- Política para delete (apenas admins)
CREATE POLICY "contracts_delete_admin" ON storage.objects
FOR DELETE USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- Política para update (apenas admins)
CREATE POLICY "contracts_update_admin" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- 4. Verificar se o bucket foi criado
SELECT 
    'Bucket criado' as item,
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'investor_contracts') 
        THEN '✅ SUCESSO' 
        ELSE '❌ FALHOU' 
    END as status;

-- 5. Verificar políticas criadas
SELECT 
    'Políticas criadas' as item,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ ' || COUNT(*)::text || ' políticas' 
        ELSE '❌ APENAS ' || COUNT(*)::text || ' políticas' 
    END as status
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%contract%';

-- 6. Listar todas as políticas de storage
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'HAS_QUAL' 
        ELSE 'NO_QUAL' 
    END as has_qual,
    CASE 
        WHEN with_check IS NOT NULL THEN 'HAS_WITH_CHECK' 
        ELSE 'NO_WITH_CHECK' 
    END as has_with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%contract%'
ORDER BY policyname;
