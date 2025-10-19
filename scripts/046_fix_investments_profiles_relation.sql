-- scripts/046_fix_investments_profiles_relation.sql
-- Verificar e corrigir relação entre investments e profiles

-- Verificar se as tabelas existem e suas estruturas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('investments', 'profiles')
ORDER BY table_name, ordinal_position;

-- Verificar se há dados nas tabelas
SELECT 'investments' as table_name, COUNT(*) as row_count FROM public.investments
UNION ALL
SELECT 'profiles' as table_name, COUNT(*) as row_count FROM public.profiles;

-- Verificar se há user_ids em investments que não existem em profiles
SELECT 
    i.user_id,
    COUNT(*) as investment_count
FROM public.investments i
LEFT JOIN public.profiles p ON i.user_id = p.id
WHERE p.id IS NULL
GROUP BY i.user_id
LIMIT 10;

-- Criar uma view para facilitar consultas de investimentos com perfis
CREATE OR REPLACE VIEW investments_with_profiles AS
SELECT 
    i.id,
    i.user_id,
    i.amount,
    i.monthly_return_rate,
    i.payment_date,
    i.created_at,
    i.status,
    i.commitment_period,
    i.profitability_liquidity,
    p.full_name,
    p.email,
    p.user_type
FROM public.investments i
LEFT JOIN public.profiles p ON i.user_id = p.id;

-- Comentário da view
COMMENT ON VIEW investments_with_profiles IS 'View que combina dados de investments com profiles através do user_id';

-- Verificar se a view foi criada corretamente
SELECT * FROM investments_with_profiles LIMIT 5;
