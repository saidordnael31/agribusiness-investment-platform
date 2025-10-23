-- Adicionar coluna approved_by_admin à tabela investments
-- Esta coluna indica se o investimento foi aprovado pelo administrador
-- false = aprovado apenas pelo assessor, true = aprovado pelo admin

ALTER TABLE public.investments 
ADD COLUMN IF NOT EXISTS approved_by_admin BOOLEAN DEFAULT false;

-- Comentário para documentação
COMMENT ON COLUMN public.investments.approved_by_admin IS 'Indica se o investimento foi aprovado pelo administrador (true) ou apenas pelo assessor (false)';

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_investments_approved_by_admin ON public.investments(approved_by_admin);

-- Atualizar investimentos existentes que estão ativos para marcar como aprovados pelo admin
-- (assumindo que investimentos ativos existentes foram aprovados pelo admin)
UPDATE public.investments 
SET approved_by_admin = true 
WHERE status = 'active' AND approved_by_admin IS NULL;
