-- Script para corrigir políticas de storage para distribuidores visualizarem contratos
-- Execute este script no Supabase SQL Editor
-- 
-- Este script apenas atualiza as políticas de storage, não cria o bucket novamente

-- ========================================
-- REMOVER POLÍTICA ANTIGA DE DISTRIBUIDORES
-- ========================================

DROP POLICY IF EXISTS "contracts_distributor_view_download" ON storage.objects;

-- ========================================
-- CRIAR POLÍTICA CORRIGIDA PARA DISTRIBUIDORES
-- ========================================

-- Política para distribuidores verem contratos de investidores vinculados (usando distributor_id)
-- Esta política verifica se o arquivo pertence a um contrato de um investidor vinculado ao distribuidor
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
                AND p_investor.distributor_id = p_distributor.id
                AND (
                    -- Verificar se o nome do arquivo no storage corresponde ao caminho no file_url
                    ic.file_url LIKE '%' || (name) || '%'
                    OR
                    -- Verificar se o caminho completo corresponde
                    ic.file_url LIKE '%/' || (name)
                    OR
                    -- Verificar se o nome do arquivo está no final da URL
                    ic.file_url LIKE '%' || SPLIT_PART(name, '/', -1)
                )
            )
        )
    )
);

-- ========================================
-- VERIFICAÇÃO
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
    cmd
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%contract%'
ORDER BY policyname;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Política de storage para distribuidores atualizada!';
  RAISE NOTICE 'Distribuidores agora podem visualizar e baixar contratos de investidores vinculados.';
END $$;


