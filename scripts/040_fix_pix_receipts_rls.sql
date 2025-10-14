-- scripts/040_fix_pix_receipts_rls.sql

-- Verificar políticas RLS existentes na tabela pix_receipts
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
WHERE schemaname = 'public' AND tablename = 'pix_receipts';

-- Remover políticas existentes para recriar
DROP POLICY IF EXISTS "pix_receipts_select_own" ON public.pix_receipts;
DROP POLICY IF EXISTS "pix_receipts_insert_own" ON public.pix_receipts;
DROP POLICY IF EXISTS "pix_receipts_select_admin" ON public.pix_receipts;
DROP POLICY IF EXISTS "pix_receipts_update_admin" ON public.pix_receipts;
DROP POLICY IF EXISTS "pix_receipts_delete_admin" ON public.pix_receipts;

-- Recriar políticas RLS para pix_receipts
-- Usuários podem ver seus próprios comprovantes
CREATE POLICY "pix_receipts_select_own" ON public.pix_receipts 
FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem inserir seus próprios comprovantes
CREATE POLICY "pix_receipts_insert_own" ON public.pix_receipts 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins podem ver todos os comprovantes
CREATE POLICY "pix_receipts_select_admin" ON public.pix_receipts 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Admins podem atualizar qualquer comprovante
CREATE POLICY "pix_receipts_update_admin" ON public.pix_receipts 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Admins podem deletar qualquer comprovante
CREATE POLICY "pix_receipts_delete_admin" ON public.pix_receipts 
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Usuários podem deletar seus próprios comprovantes
CREATE POLICY "pix_receipts_delete_own" ON public.pix_receipts 
FOR DELETE USING (auth.uid() = user_id);

-- Verificar se as políticas foram criadas corretamente
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
WHERE schemaname = 'public' AND tablename = 'pix_receipts'
ORDER BY policyname;
