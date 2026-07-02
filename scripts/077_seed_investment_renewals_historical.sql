-- scripts/077_seed_investment_renewals_historical.sql
-- Registros históricos de renovação para investimentos com renewal_count = 1
-- (dados migrados do sistema anterior — coluna last_renewal_date removida na 076)

INSERT INTO public.investment_renewals (
  investment_id,
  user_id,
  current_renew,
  current_renewal_date,
  original_commitment_period,
  last_commitment_period,
  current_commitment_period,
  payment_date
)
SELECT *
FROM (VALUES
  (
    '585c4052-bb9a-40c4-949c-534994aeb983'::uuid,
    '2913cf64-80a1-459e-ad79-ba79fb1e2704'::uuid,
    1,
    '2026-06-30 00:00:00+00'::timestamptz,
    36,
    36,
    72,
    '2025-12-29 00:00:00+00'::timestamptz
  ),
  (
    '64d96efc-8b7c-4d3d-b8a4-b9ec96116a13'::uuid,
    '2913cf64-80a1-459e-ad79-ba79fb1e2704'::uuid,
    1,
    '2026-06-25 00:00:00+00'::timestamptz,
    36,
    36,
    72,
    '2025-12-24 00:00:00+00'::timestamptz
  ),
  (
    'f945fbbe-95e9-490f-852a-543954249351'::uuid,
    '2913cf64-80a1-459e-ad79-ba79fb1e2704'::uuid,
    1,
    '2026-01-07 00:00:00+00'::timestamptz,
    36,
    36,
    72,
    '2025-12-30 00:00:00+00'::timestamptz
  )
) AS seed (
  investment_id,
  user_id,
  current_renew,
  current_renewal_date,
  original_commitment_period,
  last_commitment_period,
  current_commitment_period,
  payment_date
)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.investment_renewals ir
  WHERE ir.investment_id = seed.investment_id
    AND ir.current_renew = seed.current_renew
);

-- Conferência
SELECT
  ir.investment_id,
  ir.user_id,
  ir.current_renew,
  ir.current_renewal_date,
  ir.original_commitment_period,
  ir.last_commitment_period,
  ir.current_commitment_period,
  ir.payment_date
FROM public.investment_renewals ir
WHERE ir.investment_id IN (
  '585c4052-bb9a-40c4-949c-534994aeb983',
  '64d96efc-8b7c-4d3d-b8a4-b9ec96116a13',
  'f945fbbe-95e9-490f-852a-543954249351'
)
ORDER BY ir.current_renewal_date;
