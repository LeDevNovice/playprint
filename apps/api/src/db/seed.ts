import { NodeRuntime } from '@effect/platform-node';
import { inArray, notInArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Data, Effect, Schedule } from 'effect';
import pg from 'pg';
import { loadDirectUrl } from './direct-url';
import { genreCompletionBaselines, genres } from './schema';

const GENRE_COMPLETION_BASELINES = [
  { igdbGenreId: 12, igdbName: 'Role-playing (RPG)', completionRate: 28 },
  { igdbGenreId: 5, igdbName: 'Shooter', completionRate: 42 },
  { igdbGenreId: 31, igdbName: 'Adventure', completionRate: 55 },
  { igdbGenreId: 8, igdbName: 'Platform', completionRate: 62 },
  { igdbGenreId: 15, igdbName: 'Strategy', completionRate: 35 },
  { igdbGenreId: 9, igdbName: 'Puzzle', completionRate: 70 },
] as const;

class SeedError extends Data.TaggedError('SeedError')<{ readonly cause: unknown }> {}

const TRANSIENT_CODES = new Set(['57P01', '57P03', '55P03', '40001', '40P01', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED']);
const isTransient = ({ cause }: SeedError): boolean => {
  const code = (cause as { code?: unknown } | null)?.code;
  return typeof code === 'string' && (code.startsWith('08') || TRANSIENT_CODES.has(code));
};

type Db = ReturnType<typeof drizzle>;

const applyGenreBaselines = (db: Db) =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
    const igdbIds = GENRE_COMPLETION_BASELINES.map((b) => b.igdbGenreId);

    await tx
      .insert(genres)
      .values(GENRE_COMPLETION_BASELINES.map((b) => ({ igdbId: b.igdbGenreId, name: b.igdbName })))
      .onConflictDoNothing({ target: genres.igdbId });

    const rows = await tx
      .select({ id: genres.id, igdbId: genres.igdbId })
      .from(genres)
      .where(inArray(genres.igdbId, igdbIds));
    const genreIdByIgdbId = new Map(rows.map((r) => [r.igdbId, r.id]));
    const desired = GENRE_COMPLETION_BASELINES.map((b) => {
      const genreId = genreIdByIgdbId.get(b.igdbGenreId);
      if (genreId === undefined) throw new Error(`genre igdb_id=${b.igdbGenreId} missing after insert`);
      return { genreId, completionRate: b.completionRate };
    });

    const written = await tx
      .insert(genreCompletionBaselines)
      .values(desired)
      .onConflictDoUpdate({
        target: genreCompletionBaselines.genreId,
        set: { completionRate: sql.raw(`excluded.${genreCompletionBaselines.completionRate.name}`) },
        setWhere: sql`${genreCompletionBaselines.completionRate} IS DISTINCT FROM excluded.${sql.raw(genreCompletionBaselines.completionRate.name)}`,
      })
      .returning({ genreId: genreCompletionBaselines.genreId });

    const pruned = await tx
      .delete(genreCompletionBaselines)
      .where(notInArray(genreCompletionBaselines.genreId, desired.map((d) => d.genreId)))
      .returning({ genreId: genreCompletionBaselines.genreId });

    return { written: written.length, unchanged: desired.length - written.length, pruned: pruned.length };
  });

const program = Effect.gen(function* () {
  const pool = yield* Effect.acquireRelease(
    Effect.try({
      try: () => new pg.Pool({ connectionString: loadDirectUrl(), max: 1 }),
      catch: (cause) => new SeedError({ cause }),
    }),
    (p) => Effect.promise(() => p.end()),
  );
  const db = drizzle({ client: pool });

  const report = yield* Effect.tryPromise({
    try: () => applyGenreBaselines(db),
    catch: (cause) => new SeedError({ cause }),
  }).pipe(
    Effect.retry({ schedule: Schedule.exponential('500 millis'), times: 3, while: isTransient }),
  );

  yield* Effect.logInfo('genre_completion_baselines seeded', report);
});

NodeRuntime.runMain(Effect.scoped(program));