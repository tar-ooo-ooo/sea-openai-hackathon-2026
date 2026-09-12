CREATE TYPE "public"."application_intake_status" AS ENUM('collecting', 'packaged');--> statement-breakpoint
CREATE TABLE "application_intakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "application_intake_status" DEFAULT 'collecting' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"application_package_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_intakes" ADD CONSTRAINT "application_intakes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_intakes" ADD CONSTRAINT "application_intakes_application_package_id_application_packages_id_fk" FOREIGN KEY ("application_package_id") REFERENCES "public"."application_packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_intakes_user_status_idx" ON "application_intakes" USING btree ("user_id","status");