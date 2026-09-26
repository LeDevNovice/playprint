CREATE TABLE "game_genres" (
	"game_id" uuid NOT NULL,
	"genre_id" uuid NOT NULL,
	CONSTRAINT "game_genres_game_id_genre_id_pk" PRIMARY KEY("game_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "genre_completion_baselines" (
	"genre_id" uuid PRIMARY KEY NOT NULL,
	"completion_rate" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "genre_completion_baselines_completion_rate_range" CHECK ("genre_completion_baselines"."completion_rate" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "genres_igdb_id_unique" UNIQUE("igdb_id"),
	CONSTRAINT "genres_igdb_id_positive" CHECK ("genres"."igdb_id" > 0)
);
--> statement-breakpoint
ALTER TABLE "game_genres" ADD CONSTRAINT "game_genres_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_genres" ADD CONSTRAINT "game_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "genre_completion_baselines" ADD CONSTRAINT "genre_completion_baselines_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_genres_genre_id_idx" ON "game_genres" USING btree ("genre_id");--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "genres";