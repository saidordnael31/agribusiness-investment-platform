-- Script para corrigir definitivamente a política de storage para distribuidores
-- Execute este script no Supabase SQL Editor
-- 
-- Este script corrige a política de storage para distribuidores visualizarem contratos
-- O problema é que a comparação do nome do arquivo pode estar falhando
--
-- ⚠️ IMPORTANTE: Este script APENAS atualiza a política "contracts_distributor_view_download"
--    NÃO afeta outras políticas existentes:
--    - contracts_admin_full_access (admins)
--    - contracts_owner_view_download (investidores)
--    - contracts_advisor_view_download_clients (assessores)
--    - contracts_office_view_download_clients (escritórios)
--    - contracts_upload_admin (upload de admins)
--
-- ✅ A nova política é MAIS ABRANGENTE que a antiga, mas NÃO remove acesso de ninguém
--    No Supabase, políticas são combinadas com OR (se qualquer política permite, acesso é concedido)

-- ========================================
-- REMOVER POLÍTICA ANTIGA DE DISTRIBUIDORES
-- ========================================

DROP POLICY IF EXISTS "contracts_distributor_view_download" ON storage.objects;

-- ========================================
-- CRIAR POLÍTICA CORRIGIDA PARA DISTRIBUIDORES
-- ========================================

-- Política para distribuidores verem contratos de investidores vinculados
-- Esta política verifica se o arquivo pertence a um contrato de um investidor vinculado ao distribuidor
-- A verificação inclui distributor_id, office_id e parent_id (hierarquia completa)
-- A verificação do nome do arquivo é feita de forma mais robusta
CREATE POLICY "contracts_distributor_view_download" ON storage.objects
FOR SELECT USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        -- Verificar se o usuário logado é um distribuidor
        SELECT 1 FROM public.profiles p_distributor
        WHERE p_distributor.id = auth.uid()
        AND p_distributor.user_type = 'distributor'
        AND (
            -- Verificar se existe um contrato de um investidor vinculado a este distribuidor
            -- onde o arquivo corresponde ao nome do arquivo no storage
            EXISTS (
                SELECT 1 FROM public.investor_contracts ic
                JOIN public.profiles p_investor ON ic.investor_id = p_investor.id
                WHERE p_investor.user_type = 'investor'
                AND (
                    -- Verificar distributor_id direto
                    p_investor.distributor_id = p_distributor.id
                    OR
                    -- Verificar se o investidor está vinculado através de office_id
                    (p_investor.office_id = p_distributor.id)
                    OR
                    -- Verificar se o investidor está vinculado através de parent_id (assessor)
                    (p_investor.parent_id = p_distributor.id)
                    OR
                    -- Verificar se o investidor está vinculado através de um escritório que pertence ao distribuidor
                    (p_investor.office_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM public.profiles p_office
                        WHERE p_office.id = p_investor.office_id
                        AND (p_office.id = p_distributor.id OR p_office.parent_id = p_distributor.id)
                    ))
                    OR
                    -- Verificar se o investidor está vinculado através de um assessor que pertence ao distribuidor
                    (p_investor.parent_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM public.profiles p_advisor
                        WHERE p_advisor.id = p_investor.parent_id
                        AND (p_advisor.id = p_distributor.id OR p_advisor.office_id = p_distributor.id)
                    ))
                )
                AND (
                    -- Verificar se o nome do arquivo no storage (name) está contido no file_url
                    -- name = 'contracts/filename.pdf'
                    -- file_url = 'https://...supabase.co/storage/v1/object/public/investor_contracts/contracts/filename.pdf'
                    ic.file_url LIKE '%' || name || '%'
                    OR
                    -- Verificar se apenas o nome do arquivo (sem pasta) está no file_url
                    ic.file_url LIKE '%' || SPLIT_PART(name, '/', -1) || '%'
                    OR
                    -- Verificar se o caminho relativo está no file_url
                    -- Extrair apenas a parte após 'investor_contracts/' da URL
                    ic.file_url LIKE '%/' || name || '%'
                )
            )
        )
    )
);

-- ========================================
-- VERIFICAÇÃO E TESTE
-- ========================================

-- Verificar se a política foi criada
SELECT 
    'Política de Distribuidores' as status,
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN '✅ TEM QUAL' 
        ELSE '❌ SEM QUAL' 
    END as has_qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname = 'contracts_distributor_view_download';

-- Listar todas as políticas de contratos
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
  RAISE NOTICE '✅ Política de storage para distribuidores atualizada!';
  RAISE NOTICE 'Distribuidores agora podem visualizar e baixar contratos de investidores vinculados.';
  RAISE NOTICE '';
  RAISE NOTICE 'A política verifica:';
  RAISE NOTICE '  1. Se o usuário é um distribuidor';
  RAISE NOTICE '  2. Se o investidor está vinculado através de:';
  RAISE NOTICE '     - distributor_id direto';
  RAISE NOTICE '     - office_id (escritório do distribuidor)';
  RAISE NOTICE '     - parent_id (assessor do distribuidor)';
  RAISE NOTICE '     - Hierarquia (escritório/assessor que pertence ao distribuidor)';
  RAISE NOTICE '  3. Se o nome do arquivo no storage corresponde ao file_url do contrato';
END $$;

