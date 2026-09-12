ALTER TABLE "care_cases" ALTER COLUMN "accepted_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "care_cases" ALTER COLUMN "accepted_at" DROP NOT NULL;--> statement-breakpoint
UPDATE "care_cases" SET "accepted_at" = NULL WHERE "status" = 'new';
