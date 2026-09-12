CREATE TYPE "public"."care_case_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."care_case_status" AS ENUM('new', 'assessing', 'plan_review', 'matching', 'following_up', 'closed');--> statement-breakpoint
CREATE TYPE "public"."care_plan_item_status" AS ENUM('proposed', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."care_plan_status" AS ENUM('draft', 'in_review', 'confirmed', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."case_action_status" AS ENUM('open', 'in_progress', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."case_event_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."case_event_source" AS ENUM('admin', 'family', 'system', 'ai');--> statement-breakpoint
CREATE TYPE "public"."case_timeline_event_type" AS ENUM('case_opened', 'assessment_saved', 'plan_created', 'plan_confirmed', 'match_updated', 'follow_up', 'note', 'status_changed');--> statement-breakpoint
CREATE TABLE "admin_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"organization_name" varchar(100),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_application_package_id" uuid,
	"family_user_id" uuid,
	"recipient_name" varchar(100) NOT NULL,
	"recipient_birth_date" date,
	"area" varchar(100),
	"referral_summary" text NOT NULL,
	"assigned_admin_id" uuid,
	"status" "care_case_status" DEFAULT 'new' NOT NULL,
	"priority" "care_case_priority" DEFAULT 'normal' NOT NULL,
	"referral_received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_plan_item_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_plan_item_id" uuid NOT NULL,
	"actor" varchar(20) NOT NULL,
	"decision" varchar(20) NOT NULL,
	"reason" text,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recorded_by_admin_id" uuid,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_plan_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"category" varchar(100) NOT NULL,
	"service_name" varchar(100) NOT NULL,
	"objective" text NOT NULL,
	"frequency" varchar(100),
	"status" "care_plan_item_status" DEFAULT 'proposed' NOT NULL,
	"ai_rationale" text,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "care_plan_items_position_check" CHECK ("care_plan_items"."position" between 0 and 31)
);
--> statement-breakpoint
CREATE TABLE "care_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_case_id" uuid NOT NULL,
	"source_assessment_id" uuid,
	"version" integer NOT NULL,
	"status" "care_plan_status" DEFAULT 'draft' NOT NULL,
	"goal" text NOT NULL,
	"created_by_admin_id" uuid,
	"confirmed_by_admin_id" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "care_plans_version_check" CHECK ("care_plans"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "care_state_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_case_id" uuid NOT NULL,
	"source" varchar(50) NOT NULL,
	"daily_living" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"care_environment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"family_care" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recent_needs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"summary" text,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_action_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_case_id" uuid NOT NULL,
	"source_event_id" uuid,
	"origin" "case_event_source" DEFAULT 'admin' NOT NULL,
	"type" varchar(100) NOT NULL,
	"priority" "care_case_priority" DEFAULT 'normal' NOT NULL,
	"status" "case_action_status" DEFAULT 'open' NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"assigned_admin_id" uuid,
	"due_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"resolved_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_case_id" uuid NOT NULL,
	"cms_level" integer,
	"summary" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"assessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"care_case_id" uuid NOT NULL,
	"care_plan_id" uuid,
	"event_type" "case_timeline_event_type" NOT NULL,
	"source" "case_event_source" DEFAULT 'admin' NOT NULL,
	"severity" "case_event_severity" DEFAULT 'info' NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_admin_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_cases" ADD CONSTRAINT "care_cases_source_application_package_id_application_packages_id_fk" FOREIGN KEY ("source_application_package_id") REFERENCES "public"."application_packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_cases" ADD CONSTRAINT "care_cases_family_user_id_users_id_fk" FOREIGN KEY ("family_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_cases" ADD CONSTRAINT "care_cases_assigned_admin_id_users_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plan_item_decisions" ADD CONSTRAINT "care_plan_item_decisions_care_plan_item_id_care_plan_items_id_fk" FOREIGN KEY ("care_plan_item_id") REFERENCES "public"."care_plan_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plan_item_decisions" ADD CONSTRAINT "care_plan_item_decisions_recorded_by_admin_id_users_id_fk" FOREIGN KEY ("recorded_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plan_items" ADD CONSTRAINT "care_plan_items_care_plan_id_care_plans_id_fk" FOREIGN KEY ("care_plan_id") REFERENCES "public"."care_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_care_case_id_care_cases_id_fk" FOREIGN KEY ("care_case_id") REFERENCES "public"."care_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_source_assessment_id_case_assessments_id_fk" FOREIGN KEY ("source_assessment_id") REFERENCES "public"."case_assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_confirmed_by_admin_id_users_id_fk" FOREIGN KEY ("confirmed_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_state_snapshots" ADD CONSTRAINT "care_state_snapshots_care_case_id_care_cases_id_fk" FOREIGN KEY ("care_case_id") REFERENCES "public"."care_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_state_snapshots" ADD CONSTRAINT "care_state_snapshots_recorded_by_admin_id_users_id_fk" FOREIGN KEY ("recorded_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_action_items" ADD CONSTRAINT "case_action_items_care_case_id_care_cases_id_fk" FOREIGN KEY ("care_case_id") REFERENCES "public"."care_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_action_items" ADD CONSTRAINT "case_action_items_source_event_id_case_timeline_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."case_timeline_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_action_items" ADD CONSTRAINT "case_action_items_assigned_admin_id_users_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_action_items" ADD CONSTRAINT "case_action_items_resolved_by_admin_id_users_id_fk" FOREIGN KEY ("resolved_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assessments" ADD CONSTRAINT "case_assessments_care_case_id_care_cases_id_fk" FOREIGN KEY ("care_case_id") REFERENCES "public"."care_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assessments" ADD CONSTRAINT "case_assessments_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_timeline_events" ADD CONSTRAINT "case_timeline_events_care_case_id_care_cases_id_fk" FOREIGN KEY ("care_case_id") REFERENCES "public"."care_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_timeline_events" ADD CONSTRAINT "case_timeline_events_care_plan_id_care_plans_id_fk" FOREIGN KEY ("care_plan_id") REFERENCES "public"."care_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_timeline_events" ADD CONSTRAINT "case_timeline_events_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "care_cases_source_application_package_uidx" ON "care_cases" USING btree ("source_application_package_id");--> statement-breakpoint
CREATE INDEX "care_cases_status_updated_at_idx" ON "care_cases" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "care_cases_assigned_admin_id_idx" ON "care_cases" USING btree ("assigned_admin_id");--> statement-breakpoint
CREATE INDEX "care_cases_family_user_id_idx" ON "care_cases" USING btree ("family_user_id");--> statement-breakpoint
CREATE INDEX "care_plan_item_decisions_item_decided_at_idx" ON "care_plan_item_decisions" USING btree ("care_plan_item_id","decided_at");--> statement-breakpoint
CREATE UNIQUE INDEX "care_plan_items_plan_position_uidx" ON "care_plan_items" USING btree ("care_plan_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "care_plans_case_version_uidx" ON "care_plans" USING btree ("care_case_id","version");--> statement-breakpoint
CREATE INDEX "care_plans_case_status_idx" ON "care_plans" USING btree ("care_case_id","status");--> statement-breakpoint
CREATE INDEX "care_state_snapshots_case_observed_at_idx" ON "care_state_snapshots" USING btree ("care_case_id","observed_at");--> statement-breakpoint
CREATE INDEX "case_action_items_assigned_status_due_idx" ON "case_action_items" USING btree ("assigned_admin_id","status","due_at");--> statement-breakpoint
CREATE INDEX "case_action_items_case_status_priority_due_idx" ON "case_action_items" USING btree ("care_case_id","status","priority","due_at");--> statement-breakpoint
CREATE INDEX "case_assessments_case_assessed_at_idx" ON "case_assessments" USING btree ("care_case_id","assessed_at");--> statement-breakpoint
CREATE INDEX "case_timeline_events_case_occurred_at_idx" ON "case_timeline_events" USING btree ("care_case_id","occurred_at");