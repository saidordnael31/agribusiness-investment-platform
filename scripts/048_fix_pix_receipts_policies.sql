-- Corrigir políticas RLS para pix_receipts
-- Permitir que assessores insiram comprovantes para seus investidores

-- Remover políticas existentes
DROP POLICY IF EXISTS "pix_receipts_insert_own" ON public.pix_receipts;

-- Criar nova política que permite:
-- 1. Usuários inserirem comprovantes para si mesmos
-- 2. Assessores inserirem comprovantes para seus investidores
-- 3. Admins inserirem comprovantes para qualquer usuário
CREATE POLICY "pix_receipts_insert_flexible" ON public.pix_receipts 
FOR INSERT WITH CHECK (
  -- Usuário inserindo para si mesmo
  auth.uid() = user_id
  OR
  -- Admin inserindo para qualquer usuário
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
  OR
  -- Assessor inserindo para seu investidor
  EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.profiles p2 ON p2.parent_id = p1.id
    WHERE p1.id = auth.uid() 
    AND p1.user_type = 'distributor' 
    AND p1.role = 'assessor'
    AND p2.id = user_id
    AND p2.user_type = 'investor'
  )
);

-- Verificar se a política foi criada corretamente
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
