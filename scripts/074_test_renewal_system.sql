-- scripts/074_test_renewal_system.sql
-- Script de teste para verificar se o sistema de renovação está funcionando

-- 1. Verificar se as tabelas existem
SELECT 
  'investment_renewals' as tabela,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'investment_renewals'
  ) THEN '✅ Existe' ELSE '❌ Não existe' END as status
UNION ALL
SELECT 
  'investments (com campos de renovação)' as tabela,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'investments' 
    AND column_name = 'renewal_count'
  ) THEN '✅ Campos adicionados' ELSE '❌ Campos não encontrados' END as status;

-- 2. Verificar campos adicionais em investments
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'investments' 
  AND column_name IN ('renewal_count', 'last_renewal_date', 'original_investment_date', 'current_cycle_start_date')
ORDER BY column_name;

-- 3. Verificar estrutura da tabela investment_renewals
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'investment_renewals'
ORDER BY ordinal_position;

-- 4. Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'investment_renewals';

-- 5. Verificar políticas RLS
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'investment_renewals';

-- 6. Verificar investimentos existentes e seus campos de renovação
SELECT 
  id,
  user_id,
  amount,
  payment_date,
  commitment_period,
  renewal_count,
  last_renewal_date,
  original_investment_date,
  current_cycle_start_date,
  status
FROM public.investments
WHERE status = 'active'
LIMIT 5;

-- 7. Contar renovações registradas
SELECT 
  COUNT(*) as total_renovacoes,
  renewal_type,
  COUNT(*) as quantidade
FROM public.investment_renewals
GROUP BY renewal_type;

-- 8. Verificar investimentos renovados
SELECT 
  COUNT(*) as total_investimentos,
  COUNT(CASE WHEN renewal_count > 0 THEN 1 END) as investimentos_renovados,
  MAX(renewal_count) as max_renovacoes,
  AVG(renewal_count) as media_renovacoes
FROM public.investments
WHERE status = 'active';

