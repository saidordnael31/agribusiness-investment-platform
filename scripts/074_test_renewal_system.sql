-- scripts/074_test_renewal_system.sql
-- Script de VERIFICAÇÃO do sistema de renovação.
--
-- PRÉ-REQUISITO: executar antes scripts/076_refactor_renewal_system.sql
-- (074 não aplica alterações — apenas consulta o estado do banco)

-- 0. Verificar se a migration 076 foi aplicada
SELECT
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'investments'
      AND column_name = 'original_commitment_period'
  ) THEN '✅ Migration 076 aplicada (original_commitment_period existe)'
  ELSE '❌ Execute scripts/076_refactor_renewal_system.sql antes deste script'
  END AS migration_076_status;

-- 1. Verificar se as tabelas existem
SELECT
  'investment_renewals' AS tabela,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'investment_renewals'
  ) THEN '✅ Existe' ELSE '❌ Não existe' END AS status
UNION ALL
SELECT
  'investments (campos de renovação)' AS tabela,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'investments'
    AND column_name = 'renewal_count'
  ) THEN '✅ Campos presentes' ELSE '❌ Campos não encontrados' END AS status;

-- 2. Verificar campos de renovação em investments
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'investments'
  AND column_name IN ('renewal_count', 'original_commitment_period')
ORDER BY column_name;

-- 3. Verificar colunas removidas (não devem existir após migration 076)
SELECT
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'investments'
  AND column_name IN ('last_renewal_date', 'original_investment_date', 'current_cycle_start_date');

-- 4. Verificar estrutura da tabela investment_renewals
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'investment_renewals'
ORDER BY ordinal_position;

-- 5. Verificar índices
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'investment_renewals';

-- 6. Verificar políticas RLS
SELECT
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'investment_renewals';

-- 7. Amostra de investimentos ativos (colunas base — funciona antes e depois da 076)
SELECT
  id,
  user_id,
  amount,
  payment_date,
  commitment_period,
  renewal_count,
  status
FROM public.investments
WHERE status = 'active'
LIMIT 5;

-- 8. Contar renovações registradas (requer migration 076 com nova tabela)
SELECT COUNT(*) AS total_renovacoes
FROM public.investment_renewals;

-- 9. Resumo de investimentos renovados
SELECT
  COUNT(*) AS total_investimentos,
  COUNT(CASE WHEN renewal_count > 0 THEN 1 END) AS investimentos_renovados,
  MAX(renewal_count) AS max_renovacoes,
  AVG(renewal_count) AS media_renovacoes
FROM public.investments
WHERE status = 'active';

-- 10. Amostra completa pós-migration 076 (só executar após a 076)
-- SELECT
--   id,
--   payment_date,
--   commitment_period,
--   original_commitment_period,
--   renewal_count
-- FROM public.investments
-- WHERE status = 'active'
-- LIMIT 5;
