-- Script para criar bucket e políticas de storage para contratos
-- Inclui permissões para distribuidores verem contratos de investidores vinculados
-- Execute este script no Supabase SQL Editor

-- ========================================
-- VERIFICAÇÃO E CRIAÇÃO DO BUCKET (SE NECESSÁRIO)
-- ========================================

-- 1. Verificar se o bucket já existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'investor_contracts') THEN
        -- Criar bucket apenas se não existir
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'investor_contracts',
            'investor_contracts',
            false, -- Não público por padrão
            10485760, -- 10MB limite
            ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
        );
        RAISE NOTICE '✅ Bucket investor_contracts criado';
    ELSE
        RAISE NOTICE 'ℹ️ Bucket investor_contracts já existe, apenas atualizando políticas';
    END IF;
END $$;

-- ========================================
-- REMOVER POLÍTICAS ANTIGAS
-- ========================================

-- Remover todas as políticas antigas relacionadas a contratos
DROP POLICY IF EXISTS "contracts_upload_admin" ON storage.objects;
DROP POLICY IF EXISTS "contracts_view_admin_and_owner" ON storage.objects;
DROP POLICY IF EXISTS "contracts_delete_admin" ON storage.objects;
DROP POLICY IF EXISTS "contracts_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "contracts_view_advisor" ON storage.objects;
DROP POLICY IF EXISTS "contracts_download_admin_and_owner" ON storage.objects;
DROP POLICY IF EXISTS "contracts_admin_full_access" ON storage.objects;
DROP POLICY IF EXISTS "contracts_owner_view_download" ON storage.objects;
DROP POLICY IF EXISTS "contracts_advisor_view_download_clients" ON storage.objects;
DROP POLICY IF EXISTS "contracts_office_view_download_clients" ON storage.objects;
DROP POLICY IF EXISTS "contracts_distributor_view_download" ON storage.objects;

-- ========================================
-- CRIAR POLÍTICAS DE STORAGE
-- ========================================

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

-- Política para admins (acesso completo)
CREATE POLICY "contracts_admin_full_access" ON storage.objects
FOR ALL USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- Política para investidores verem seus próprios contratos
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

-- Política para assessores verem contratos de seus investidores
CREATE POLICY "contracts_advisor_view_download_clients" ON storage.objects
FOR SELECT USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles p_advisor
        WHERE p_advisor.id = auth.uid()
        AND p_advisor.user_type = 'distributor'
        AND (p_advisor.role = 'assessor' OR p_advisor.role = 'assessor_externo')
        AND EXISTS (
            SELECT 1 FROM public.investor_contracts ic
            JOIN public.profiles p_investor ON ic.investor_id = p_investor.id
            WHERE p_investor.parent_id = p_advisor.id
            AND ic.file_url LIKE '%' || name || '%'
        )
    )
);

-- Política para escritórios verem contratos de investidores do seu office_id
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

-- Política para distribuidores verem contratos de investidores vinculados (usando distributor_id)
CREATE POLICY "contracts_distributor_view_download" ON storage.objects
FOR SELECT USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles p_distributor
        WHERE p_distributor.id = auth.uid()
        AND p_distributor.user_type = 'distributor'
        AND EXISTS (
            SELECT 1 FROM public.investor_contracts ic
            JOIN public.profiles p_investor ON ic.investor_id = p_investor.id
            WHERE p_investor.user_type = 'investor'
            AND p_investor.distributor_id = p_distributor.id
            AND ic.file_url LIKE '%' || name || '%'
        )
    )
);

-- ========================================
-- VERIFICAÇÃO
-- ========================================

-- Verificar se o bucket foi criado
SELECT 
    'Bucket Status' as status,
    id,
    name,
    public,
    file_size_limit,
    created_at
FROM storage.buckets 
WHERE id = 'investor_contracts';

-- Verificar políticas criadas
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'HAS_QUAL' 
        ELSE 'NO_QUAL' 
    END as has_qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%contract%'
ORDER BY policyname;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Bucket investor_contracts e políticas de storage criadas com sucesso!';
  RAISE NOTICE 'Permissões configuradas para:';
  RAISE NOTICE '  - Admins (acesso completo)';
  RAISE NOTICE '  - Investidores (próprios contratos)';
  RAISE NOTICE '  - Assessores (investidores vinculados)';
  RAISE NOTICE '  - Escritórios (investidores do office_id)';
  RAISE NOTICE '  - Distribuidores (investidores com distributor_id)';
END $$;

