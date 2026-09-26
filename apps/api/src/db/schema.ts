import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).defaultNow().notNull();

const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => sql`now()`);

const percentage = (name: string) =>
  numeric(name, { precision: 5, scale: 2, mode: 'number' });

export const GAME_STATUSES = ['PLAYING', 'FINISHED', 'SHELVED', 'WISHLIST'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];
export const gameStatusEnum = pgEnum('game_status', GAME_STATUSES);

export const POST_MORTEM_REASONS = [
  'BORED',
  'TOO_LONG',
  'TOO_HARD',
  'OTHER_GAME',
  'SLOW_PACING',
  'OTHER',
] as const;
export type PostMortemReason = (typeof POST_MORTEM_REASONS)[number];
export const postMortemReasonEnum = pgEnum('post_mortem_reason', POST_MORTEM_REASONS);

export const games = pgTable(
  'games',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    igdbId: integer('igdb_id').notNull().unique(),
    title: text('title').notNull(),
    coverUrl: text('cover_url'),
    platforms: text('platforms').array().notNull().default(sql`'{}'::text[]`),
    genres: text('genres').array().notNull().default(sql`'{}'::text[]`),
    releaseYear: integer('release_year'),
    avgCompletionRate: percentage('avg_completion_rate'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('games_igdb_id_positive', sql`${t.igdbId} > 0`),
    check('games_avg_completion_rate_range', sql`${t.avgCompletionRate} BETWEEN 0 AND 100`),
  ],
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    steamId: text('steam_id').notNull().unique(),
    email: text('email').unique(),
    profileConfidence: percentage('profile_confidence').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('users_steam_id_format', sql`${t.steamId} ~ '^[0-9]{17}$'`),
    check('users_email_normalized', sql`${t.email} = lower(btrim(${t.email}))`),
    check('users_email_length', sql`char_length(${t.email}) <= 254`),
    check('users_profile_confidence_range', sql`${t.profileConfidence} BETWEEN 0 AND 100`),
  ],
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [index('auth_sessions_user_id_idx').on(t.userId)],
);

export const userGames = pgTable(
  'user_games',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'restrict' }),
    status: gameStatusEnum('status').notNull(),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    steamPlaytimeMinutes: integer('steam_playtime_minutes'),
    achievementCompletionRate: percentage('achievement_completion_rate'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.gameId] }),
    index('user_games_game_id_idx').on(t.gameId),
    index('user_games_status_status_changed_at_idx').on(t.status, t.statusChangedAt),
    check('user_games_steam_playtime_non_negative', sql`${t.steamPlaytimeMinutes} >= 0`),
    check(
      'user_games_achievement_completion_rate_range',
      sql`${t.achievementCompletionRate} BETWEEN 0 AND 100`,
    ),
  ],
);

export const postMortems = pgTable(
  'post_mortems',
  {
    userId: uuid('user_id').notNull(),
    gameId: uuid('game_id').notNull(),
    reason: postMortemReasonEnum('reason').notNull(),
    isFinal: boolean('is_final'),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.gameId] }),
    foreignKey({
      name: 'post_mortems_user_game_fk',
      columns: [t.userId, t.gameId],
      foreignColumns: [userGames.userId, userGames.gameId],
    }).onDelete('cascade'),
  ],
);

export const predictions = pgTable(
  'predictions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'restrict' }),
    algorithm: text('algorithm').notNull(),
    scoreValue: integer('score_value').notNull(),
    confidence: integer('confidence').notNull(),
    wasPersonalized: boolean('was_personalized').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index('predictions_user_id_created_at_idx').on(t.userId, t.createdAt.desc()),
    index('predictions_game_id_idx').on(t.gameId),
    check('predictions_score_value_range', sql`${t.scoreValue} BETWEEN 0 AND 100`),
    check('predictions_confidence_range', sql`${t.confidence} BETWEEN 0 AND 100`),
    check(
      'predictions_personalized_requires_user',
      sql`NOT ${t.wasPersonalized} OR ${t.userId} IS NOT NULL`,
    ),
  ],
);