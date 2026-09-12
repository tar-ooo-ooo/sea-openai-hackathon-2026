INSERT INTO "care_cases" (
  "source_application_package_id",
  "family_user_id",
  "recipient_name",
  "area",
  "referral_summary",
  "status",
  "priority"
)
SELECT
  package."id",
  package."user_id",
  package."target_name",
  LEFT(NULLIF(intake."data" ->> 'jurisdiction', ''), 100),
  package."summary",
  'new',
  'normal'
FROM "application_packages" AS package
LEFT JOIN LATERAL (
  SELECT "data"
  FROM "application_intakes"
  WHERE "application_package_id" = package."id"
  ORDER BY "updated_at" DESC
  LIMIT 1
) AS intake ON true
WHERE NOT EXISTS (
  SELECT 1
  FROM "care_cases"
  WHERE "source_application_package_id" = package."id"
)
ON CONFLICT ("source_application_package_id") DO NOTHING;
