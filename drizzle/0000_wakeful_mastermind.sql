CREATE TYPE "public"."application_category" AS ENUM('照顧及專業服務', '交通接送服務', '輔具及居家無障礙環境改善', '喘息服務');--> statement-breakpoint
CREATE TYPE "public"."application_service_status" AS ENUM('尚未申請', '已送出');--> statement-breakpoint
CREATE TYPE "public"."chat_role" AS ENUM('assistant', 'user');--> statement-breakpoint
CREATE TYPE "public"."triage_urgency" AS ENUM('follow_up', 'emergency');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "application_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_name" varchar(100) NOT NULL,
	"summary" varchar(500) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_package_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"category" "application_category" NOT NULL,
	"name" varchar(100) NOT NULL,
	"reason" varchar(300) NOT NULL,
	"status" "application_service_status" DEFAULT '尚未申請' NOT NULL,
	CONSTRAINT "application_services_position_check" CHECK ("application_services"."position" between 0 and 7)
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" varchar(4000) NOT NULL,
	"workflow_steps" jsonb,
	"application_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_messages_content_check" CHECK (char_length("chat_messages"."content") > 0)
);
--> statement-breakpoint
CREATE TABLE "emergency_triages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"urgency" "triage_urgency" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"birth_date" date NOT NULL,
	"area" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"national_id" varchar(10) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_national_id_unique" UNIQUE("national_id")
);
--> statement-breakpoint
ALTER TABLE "application_packages" ADD CONSTRAINT "application_packages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_services" ADD CONSTRAINT "application_services_application_package_id_application_packages_id_fk" FOREIGN KEY ("application_package_id") REFERENCES "public"."application_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_application_id_application_packages_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."application_packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_triages" ADD CONSTRAINT "emergency_triages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "application_packages_user_target_name_uidx" ON "application_packages" USING btree ("user_id","target_name");--> statement-breakpoint
CREATE UNIQUE INDEX "application_services_package_position_uidx" ON "application_services" USING btree ("application_package_id","position");--> statement-breakpoint
CREATE INDEX "chat_messages_user_created_at_idx" ON "chat_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "emergency_triages_user_created_at_idx" ON "emergency_triages" USING btree ("user_id","created_at");