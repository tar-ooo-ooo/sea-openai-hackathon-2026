CREATE TABLE "chat_summaries" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"summary" text NOT NULL,
	"last_message_id" uuid NOT NULL,
	"last_message_created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_summaries_summary_check" CHECK (char_length("chat_summaries"."summary") > 0)
);
--> statement-breakpoint
ALTER TABLE "chat_summaries" ADD CONSTRAINT "chat_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;