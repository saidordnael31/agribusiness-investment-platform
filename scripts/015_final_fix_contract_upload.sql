-- Script FINAL para corrigir definitivamente o upload de contratos
-- Execute este script no Supabase SQL Editor

-- ========================================
-- PARTE 1: VERIFICAÇÕES INICIAIS
-- ========================================

-- Verificar se a tabela investor_contracts existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investor_contracts' AND table_schema = 'public') THEN
        RAISE NOTICE 'Tabela investor_contracts não existe. Criando...';
        
        -- Criar a tabela
        CREATE TABLE public.investor_contracts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          contract_name TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_url TEXT NOT NULL,
          file_size INTEGER,
          file_type TEXT NOT NULL,
          uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Habilitar RLS
        ALTER TABLE public.investor_contracts ENABLE ROW LEVEL SECURITY;
        
        -- Criar políticas RLS
        CREATE POLICY "investor_contracts_select_own" ON public.investor_contracts 
          FOR SELECT USING (auth.uid() = investor_id);
        
        CREATE POLICY "investor_contracts_select_admin" ON public.investor_contracts 
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE id = auth.uid() AND user_type = 'admin'
            )
          );
        
        CREATE POLICY "investor_contracts_insert_admin" ON public.investor_contracts 
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE id = auth.uid() AND user_type = 'admin'
            )
          );
        
        CREATE POLICY "investor_contracts_update_admin" ON public.investor_contracts 
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE id = auth.uid() AND user_type = 'admin'
            )
          );
        
        CREATE POLICY "investor_contracts_delete_admin" ON public.investor_contracts 
          FOR DELETE USING (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE id = auth.uid() AND user_type = 'admin'
            )
          );
        
        -- Criar índices
        CREATE INDEX IF NOT EXISTS idx_investor_contracts_investor_id ON public.investor_contracts(investor_id);
        CREATE INDEX IF NOT EXISTS idx_investor_contracts_uploaded_by ON public.investor_contracts(uploaded_by);
        CREATE INDEX IF NOT EXISTS idx_investor_contracts_status ON public.investor_contracts(status);
        
        RAISE NOTICE 'Tabela investor_contracts criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela investor_contracts já existe.';
    END IF;
END $$;

-- ========================================
-- PARTE 2: CRIAR/VERIFICAR BUCKET
-- ========================================

-- Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'investor_contracts', 
    'investor_contracts', 
    false, 
    10485760, -- 10MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ========================================
-- PARTE 3: REMOVER POLÍTICAS ANTIGAS
-- ========================================

-- Remover todas as políticas de storage existentes
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND (policyname LIKE '%contract%' OR policyname LIKE '%admin%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
        RAISE NOTICE 'Política removida: %', policy_record.policyname;
    END LOOP;
END $$;

-- ========================================
-- PARTE 4: CRIAR POLÍTICAS DE STORAGE
-- ========================================

-- Política para INSERT (upload) - apenas admins
CREATE POLICY "contracts_upload_admin" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- Política para SELECT (visualização) - admins e investidores
CREATE POLICY "contracts_view_admin_and_owner" ON storage.objects
FOR SELECT USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND (
        -- Admins podem ver todos
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND user_type = 'admin'
        ) OR
        -- Investidores podem ver apenas os seus
        EXISTS (
            SELECT 1 FROM public.investor_contracts ic
            WHERE ic.investor_id = auth.uid() 
            AND ic.file_url LIKE '%' || name || '%'
        )
    )
);

-- Política para DELETE - apenas admins
CREATE POLICY "contracts_delete_admin" ON storage.objects
FOR DELETE USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- Política para UPDATE - apenas admins
CREATE POLICY "contracts_update_admin" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- ========================================
-- PARTE 5: VERIFICAÇÕES FINAIS
-- ========================================

-- Verificar se a tabela foi criada
SELECT 
    'Tabela investor_contracts' as item,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investor_contracts' AND table_schema = 'public') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status;

-- Verificar se o bucket foi criado
SELECT 
    'Bucket investor_contracts' as item,
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'investor_contracts') 
        THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status;

-- Verificar políticas de storage
SELECT 
    'Storage Policies' as item,
    COUNT(*)::text || ' policies created' as status
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%contract%';

-- Verificar políticas RLS da tabela
SELECT 
    'Table RLS Policies' as item,
    COUNT(*)::text || ' policies created' as status
FROM pg_policies 
WHERE tablename = 'investor_contracts';

-- Verificar usuários admin
SELECT 
    'Admin Users' as item,
    COUNT(*)::text || ' admin users found' as status
FROM public.profiles 
WHERE user_type = 'admin';

-- Listar usuários admin
SELECT 
    id,
    full_name,
    email,
    user_type,
    created_at
FROM public.profiles 
WHERE user_type = 'admin'
ORDER BY created_at DESC;

-- ========================================
-- PARTE 6: TESTE DE CONECTIVIDADE
-- ========================================

-- Verificar se auth.uid() funciona
SELECT 
    'Auth Function' as item,
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'Working - User: ' || auth.uid()::text
        ELSE 'Working - No user authenticated'
    END as status;
