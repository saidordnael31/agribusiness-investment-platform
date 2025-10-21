-- scripts/064_fix_contracts_bucket_final.sql

-- ========================================
-- CRIAR BUCKET E POLÍTICAS FINAIS PARA CONTRATOS
-- ========================================

-- 1. Criar o bucket 'investor_contracts' se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'investor_contracts',
    'investor_contracts',
    false, -- Não público por segurança
    10485760, -- 10MB limite
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

-- 2. Remover políticas antigas para evitar conflitos
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

-- 3. Criar políticas de storage para o bucket 'investor_contracts'

-- Permitir que admins façam upload de arquivos
CREATE POLICY "contracts_upload_admin" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- Permitir que admins vejam, atualizem e deletem qualquer arquivo
CREATE POLICY "contracts_admin_full_access" ON storage.objects
FOR ALL USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- Permitir que o proprietário do contrato (investidor) veja e baixe seu próprio contrato
CREATE POLICY "contracts_owner_view_download" ON storage.objects
FOR SELECT USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.investor_contracts ic
        WHERE ic.investor_id = auth.uid()
        AND ic.file_url LIKE '%' || name || '%'
    )
);

-- Permitir que assessores vejam e baixem contratos de seus investidores
CREATE POLICY "contracts_advisor_view_download_clients" ON storage.objects
FOR SELECT USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles p_advisor
        WHERE p_advisor.id = auth.uid()
        AND p_advisor.user_type = 'distributor'
        AND p_advisor.role = 'assessor'
        AND EXISTS (
            SELECT 1 FROM public.investor_contracts ic
            JOIN public.profiles p_investor ON ic.investor_id = p_investor.id
            WHERE p_investor.parent_id = p_advisor.id
            AND ic.file_url LIKE '%' || name || '%'
        )
    )
);

-- Permitir que escritórios vejam e baixem contratos de investidores do seu office_id
CREATE POLICY "contracts_office_view_download_clients" ON storage.objects
FOR SELECT USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles p_office
        WHERE p_office.id = auth.uid()
        AND p_office.user_type = 'distributor'
        AND p_office.role = 'escritorio'
        AND EXISTS (
            SELECT 1 FROM public.investor_contracts ic
            JOIN public.profiles p_investor ON ic.investor_id = p_investor.id
            WHERE p_investor.office_id = p_office.id
            AND ic.file_url LIKE '%' || name || '%'
        )
    )
);

-- 4. Verificar se o bucket foi criado corretamente
SELECT 
    'Bucket Status' as status,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id = 'investor_contracts';

-- 5. Listar políticas criadas
SELECT 
    'Storage Policies' as info,
    name,
    bucket_id,
    permission,
    definition
FROM storage.policies
WHERE bucket_id = 'investor_contracts'
ORDER BY name;

RAISE NOTICE 'Bucket investor_contracts e políticas de storage configuradas com sucesso!';
