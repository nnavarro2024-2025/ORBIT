CREATE TYPE "public"."user_role" AS ENUM('student', 'faculty', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'banned', 'suspended');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"action" varchar NOT NULL,
	"details" text,
	"ip_address" varchar,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"reminder_time" timestamp NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "booking_reminders_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "computer_stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"location" varchar NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "computer_stations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"capacity" integer NOT NULL,
	"image" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"unavailable_reason" text,
	"unavailable_dates" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facility_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"facility_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"purpose" text NOT NULL,
	"course_year_dept" text,
	"participants" integer NOT NULL,
	"equipment" jsonb,
	"arrival_confirmation_deadline" timestamp,
	"arrival_confirmed" boolean DEFAULT false,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"admin_id" varchar,
	"admin_response" text,
	"reminder_opt_in" boolean DEFAULT true NOT NULL,
	"reminder_status" varchar DEFAULT 'pending' NOT NULL,
	"reminder_scheduled_at" timestamp,
	"reminder_lead_minutes" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"not_helpful_count" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar NOT NULL,
	"severity" varchar NOT NULL,
	"title" varchar NOT NULL,
	"message" text NOT NULL,
	"user_id" varchar,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"password_hash" varchar,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"ban_reason" text,
	"ban_end_date" timestamp,
	"banned_at" timestamp,
	"two_factor_enabled" boolean DEFAULT false,
	"two_factor_secret" varchar,
	"password_setup_required_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "report_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_type" varchar NOT NULL,
	"frequency" varchar NOT NULL,
	"day_of_week" integer,
	"time_of_day" varchar,
	"format" varchar DEFAULT 'pdf' NOT NULL,
	"description" text,
	"email_recipients" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"next_run_at" timestamp,
	"last_run_at" timestamp,
	"created_by" varchar,
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_reminders" ADD CONSTRAINT "booking_reminders_booking_id_facility_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."facility_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_bookings" ADD CONSTRAINT "facility_bookings_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_bookings" ADD CONSTRAINT "facility_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facility_bookings" ADD CONSTRAINT "facility_bookings_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_alerts" ADD CONSTRAINT "system_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;