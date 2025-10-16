-- scripts/044_fix_admin_insert_policy.sql
-- Corrigir política RLS para permitir que admins insiram comprovantes

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
WHERE schemaname = 'public' AND tablename = 'pix_receipts'
ORDER BY policyname;

-- Adicionar política para admins inserirem comprovantes
CREATE POLICY "pix_receipts_insert_admin" ON public.pix_receipts 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Verificar se a política foi criada corretamente
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

-- Comentário para documentação
COMMENT ON POLICY "pix_receipts_insert_admin" ON public.pix_receipts IS 'Permite que admins insiram comprovantes PIX para qualquer usuário';
