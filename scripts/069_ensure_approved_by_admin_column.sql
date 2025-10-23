-- Script para garantir que a coluna approved_by_admin existe e está configurada corretamente

-- 1. Verificar se a coluna existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'investments' 
        AND column_name = 'approved_by_admin'
    ) THEN
        -- Adicionar a coluna se não existir
        ALTER TABLE public.investments 
        ADD COLUMN approved_by_admin BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Coluna approved_by_admin adicionada à tabela investments';
    ELSE
        RAISE NOTICE 'Coluna approved_by_admin já existe na tabela investments';
    END IF;
END $$;

-- 2. Verificar a estrutura atual
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'investments' 
AND column_name = 'approved_by_admin';

-- 3. Atualizar investimentos existentes que estão ativos para marcar como aprovados pelo admin
-- (assumindo que investimentos ativos existentes foram aprovados pelo admin)
UPDATE public.investments 
SET approved_by_admin = true 
WHERE status = 'active' 
AND (approved_by_admin IS NULL OR approved_by_admin = false);

-- 4. Verificar o resultado
SELECT 
    approved_by_admin,
    COUNT(*) as total
FROM investments 
WHERE status = 'active'
GROUP BY approved_by_admin;

-- 5. Criar índice se não existir
CREATE INDEX IF NOT EXISTS idx_investments_approved_by_admin 
ON public.investments(approved_by_admin);

-- 6. Adicionar comentário
COMMENT ON COLUMN public.investments.approved_by_admin IS 'Indica se o investimento foi aprovado pelo administrador (true) ou apenas pelo assessor (false)';
