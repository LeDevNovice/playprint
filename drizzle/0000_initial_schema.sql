CREATE TYPE "public"."game_status" AS ENUM('PLAYING', 'FINISHED', 'SHELVED', 'WISHLIST');--> statement-breakpoint
CREATE TYPE "public"."post_mortem_reason" AS ENUM('BORED', 'TOO_LONG', 'TOO_HARD', 'OTHER_GAME', 'SLOW_PACING', 'OTHER');--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer NOT NULL,
	"title" text NOT NULL,
	"cover_url" text,
	"platforms" text[] DEFAULT '{}'::text[] NOT NULL,
	"genres" text[] DEFAULT '{}'::text[] NOT NULL,
	"release_year" integer,
	"avg_completion_rate" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_igdb_id_unique" UNIQUE("igdb_id"),
	CONSTRAINT "games_igdb_id_positive" CHECK ("games"."igdb_id" > 0),
	CONSTRAINT "games_avg_completion_rate_range" CHECK ("games"."avg_completion_rate" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "post_mortems" (
	"user_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"reason" "post_mortem_reason" NOT NULL,
	"is_final" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_mortems_user_id_game_id_pk" PRIMARY KEY("user_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"game_id" uuid NOT NULL,
	"algorithm" text NOT NULL,
	"score_value" integer NOT NULL,
	"confidence" integer NOT NULL,
	"was_personalized" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "predictions_score_value_range" CHECK ("predictions"."score_value" BETWEEN 0 AND 100),
	CONSTRAINT "predictions_confidence_range" CHECK ("predictions"."confidence" BETWEEN 0 AND 100),
	CONSTRAINT "predictions_personalized_requires_user" CHECK (NOT "predictions"."was_personalized" OR "predictions"."user_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "user_games" (
	"user_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"status" "game_status" NOT NULL,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"steam_playtime_minutes" integer,
	"achievement_completion_rate" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_games_user_id_game_id_pk" PRIMARY KEY("user_id","game_id"),
	CONSTRAINT "user_games_steam_playtime_non_negative" CHECK ("user_games"."steam_playtime_minutes" >= 0),
	CONSTRAINT "user_games_achievement_completion_rate_range" CHECK ("user_games"."achievement_completion_rate" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"steam_id" text NOT NULL,
	"email" text,
	"profile_confidence" numeric(5, 2) DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_steam_id_unique" UNIQUE("steam_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_steam_id_format" CHECK ("users"."steam_id" ~ '^[0-9]{17}$'),
	CONSTRAINT "users_email_normalized" CHECK ("users"."email" = lower(btrim("users"."email"))),
	CONSTRAINT "users_email_length" CHECK (char_length("users"."email") <= 254),
	CONSTRAINT "users_profile_confidence_range" CHECK ("users"."profile_confidence" BETWEEN 0 AND 100)
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_mortems" ADD CONSTRAINT "post_mortems_user_game_fk" FOREIGN KEY ("user_id","game_id") REFERENCES "public"."user_games"("user_id","game_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "predictions_user_id_created_at_idx" ON "predictions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "predictions_game_id_idx" ON "predictions" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "user_games_game_id_idx" ON "user_games" USING btree ("game_id");