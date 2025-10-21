-- scripts/066_fix_advisor_contract_permissions.sql

-- ========================================
-- CORREÇÃO ESPECÍFICA: PERMISSÕES DE CONTRATOS PARA ASSESSORES
-- ========================================

-- 1. Primeiro, garantir que o bucket existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'investor_contracts',
    'investor_contracts',
    false,
    10485760, -- 10MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

-- 2. Remover TODAS as políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "contracts_upload_admin" ON storage.objects;
DROP POLICY IF EXISTS "contracts_view_admin_and_owner" ON storage.objects;
DROP POLICY IF EXISTS "contracts_delete_admin" ON storage.objects;
DROP POLICY IF EXISTS "contracts_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "contracts_view_all_if_public" ON storage.objects;
DROP POLICY IF EXISTS "contracts_admin_full_access" ON storage.objects;
DROP POLICY IF EXISTS "contracts_owner_view_download" ON storage.objects;
DROP POLICY IF EXISTS "contracts_advisor_view_download_clients" ON storage.objects;
DROP POLICY IF EXISTS "contracts_office_view_download_clients" ON storage.objects;
DROP POLICY IF EXISTS "contracts_public_access" ON storage.objects;

-- 3. Criar políticas de storage SIMPLIFICADAS e FUNCIONAIS

-- Política 1: Admin tem acesso total
CREATE POLICY "contracts_admin_all_access" ON storage.objects
FOR ALL USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- Política 2: Investidor pode ver seus próprios contratos
CREATE POLICY "contracts_investor_own_contracts" ON storage.objects
FOR SELECT USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.investor_contracts ic
        WHERE ic.investor_id = auth.uid()
        AND ic.file_url LIKE '%' || name || '%'
    )
);

-- Política 3: Assessor pode ver contratos de seus investidores
CREATE POLICY "contracts_advisor_client_contracts" ON storage.objects
FOR SELECT USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles advisor_profile
        WHERE advisor_profile.id = auth.uid()
        AND advisor_profile.user_type = 'distributor'
        AND advisor_profile.role = 'assessor'
        AND EXISTS (
            SELECT 1 FROM public.investor_contracts ic
            JOIN public.profiles investor_profile ON ic.investor_id = investor_profile.id
            WHERE investor_profile.parent_id = advisor_profile.id
            AND ic.file_url LIKE '%' || name || '%'
        )
    )
);

-- Política 4: Escritório pode ver contratos de investidores do seu office_id
CREATE POLICY "contracts_office_client_contracts" ON storage.objects
FOR SELECT USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles office_profile
        WHERE office_profile.id = auth.uid()
        AND office_profile.user_type = 'distributor'
        AND office_profile.role = 'escritorio'
        AND EXISTS (
            SELECT 1 FROM public.investor_contracts ic
            JOIN public.profiles investor_profile ON ic.investor_id = investor_profile.id
            WHERE investor_profile.office_id = office_profile.id
            AND ic.file_url LIKE '%' || name || '%'
        )
    )
);

-- 4. Verificar se as políticas foram criadas
SELECT 
    'Políticas Criadas' as item,
    policyname,
    tablename,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'objects'
AND policyname LIKE '%contracts%'
ORDER BY policyname;

-- 5. Testar se o bucket está acessível
SELECT 
    'Bucket Acessível' as item,
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'investor_contracts')
        THEN '✅ SIM'
        ELSE '❌ NÃO'
    END as status;

-- 6. Verificar se há arquivos no bucket
SELECT 
    'Arquivos no Bucket' as item,
    COUNT(*) as total_arquivos
FROM storage.objects
WHERE bucket_id = 'investor_contracts';

-- Políticas de storage para assessores configuradas com sucesso!
