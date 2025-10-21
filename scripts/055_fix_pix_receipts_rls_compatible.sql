-- Script corrigido para políticas RLS da tabela pix_receipts
-- Compatível com versões mais antigas do PostgreSQL

-- 1. Verificar políticas existentes
SELECT 
  policyname,
  permissive,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'pix_receipts'
ORDER BY policyname;

-- 2. Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "pix_receipts_insert_own" ON public.pix_receipts;
DROP POLICY IF EXISTS "pix_receipts_insert_flexible" ON public.pix_receipts;
DROP POLICY IF EXISTS "pix_receipts_insert_policy" ON public.pix_receipts;
DROP POLICY IF EXISTS "pix_receipts_select_own" ON public.pix_receipts;
DROP POLICY IF EXISTS "pix_receipts_select_admin" ON public.pix_receipts;
DROP POLICY IF EXISTS "pix_receipts_select_policy" ON public.pix_receipts;
DROP POLICY IF EXISTS "pix_receipts_update_own" ON public.pix_receipts;
DROP POLICY IF EXISTS "pix_receipts_update_admin" ON public.pix_receipts;
DROP POLICY IF EXISTS "pix_receipts_update_policy" ON public.pix_receipts;
DROP POLICY IF EXISTS "pix_receipts_delete_own" ON public.pix_receipts;
DROP POLICY IF EXISTS "pix_receipts_delete_admin" ON public.pix_receipts;

-- 3. Criar política de INSERT que permite:
--    - Admin inserir para qualquer usuário
--    - Assessor inserir para seus investidores
--    - Usuário inserir para si mesmo
CREATE POLICY "pix_receipts_insert_policy" ON public.pix_receipts 
FOR INSERT WITH CHECK (
  -- Admin pode inserir para qualquer usuário
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
  OR
  -- Usuário inserindo para si mesmo
  auth.uid() = user_id
  OR
  -- Assessor inserindo para seu investidor
  EXISTS (
    SELECT 1 FROM public.profiles assessor
    JOIN public.profiles investor ON investor.parent_id = assessor.id
    WHERE assessor.id = auth.uid() 
    AND assessor.user_type = 'distributor' 
    AND assessor.role = 'assessor'
    AND investor.id = user_id
    AND investor.user_type = 'investor'
  )
);

-- 4. Criar política de SELECT que permite:
--    - Admin ver todos
--    - Usuário ver seus próprios
--    - Assessor ver dos seus investidores
CREATE POLICY "pix_receipts_select_policy" ON public.pix_receipts 
FOR SELECT USING (
  -- Admin pode ver todos
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
  OR
  -- Usuário pode ver seus próprios
  auth.uid() = user_id
  OR
  -- Assessor pode ver dos seus investidores
  EXISTS (
    SELECT 1 FROM public.profiles assessor
    JOIN public.profiles investor ON investor.parent_id = assessor.id
    WHERE assessor.id = auth.uid() 
    AND assessor.user_type = 'distributor' 
    AND assessor.role = 'assessor'
    AND investor.id = user_id
    AND investor.user_type = 'investor'
  )
);

-- 5. Criar política de UPDATE que permite:
--    - Admin atualizar qualquer
--    - Usuário atualizar seus próprios
--    - Assessor atualizar dos seus investidores
CREATE POLICY "pix_receipts_update_policy" ON public.pix_receipts 
FOR UPDATE USING (
  -- Admin pode atualizar qualquer
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
  OR
  -- Usuário pode atualizar seus próprios
  auth.uid() = user_id
  OR
  -- Assessor pode atualizar dos seus investidores
  EXISTS (
    SELECT 1 FROM public.profiles assessor
    JOIN public.profiles investor ON investor.parent_id = assessor.id
    WHERE assessor.id = auth.uid() 
    AND assessor.user_type = 'distributor' 
    AND assessor.role = 'assessor'
    AND investor.id = user_id
    AND investor.user_type = 'investor'
  )
);

-- 6. Criar política de DELETE que permite:
--    - Admin deletar qualquer
--    - Usuário deletar seus próprios
--    - Assessor deletar dos seus investidores
CREATE POLICY "pix_receipts_delete_policy" ON public.pix_receipts 
FOR DELETE USING (
  -- Admin pode deletar qualquer
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
  OR
  -- Usuário pode deletar seus próprios
  auth.uid() = user_id
  OR
  -- Assessor pode deletar dos seus investidores
  EXISTS (
    SELECT 1 FROM public.profiles assessor
    JOIN public.profiles investor ON investor.parent_id = assessor.id
    WHERE assessor.id = auth.uid() 
    AND assessor.user_type = 'distributor' 
    AND assessor.role = 'assessor'
    AND investor.id = user_id
    AND investor.user_type = 'investor'
  )
);

-- 7. Verificar se as políticas foram criadas corretamente
SELECT 
  policyname,
  permissive,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'pix_receipts'
ORDER BY policyname;

-- 8. Testar se a tabela está acessível
SELECT COUNT(*) as total_receipts FROM pix_receipts;

-- 9. Verificar se RLS está habilitado (versão compatível)
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'pix_receipts';
