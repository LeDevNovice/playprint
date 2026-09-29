import { SqlError } from '@effect/sql';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import { type ConfigError, Context, Duration, Effect, Layer, Redacted } from 'effect';
import type { Adapter } from 'lucia';
import pg from 'pg';
import { authSessions, users } from '../db/schema';
import { PooledDatabaseUrl } from './database';

export class LuciaAdapter extends Context.Tag('@playprint/api/LuciaAdapter')<
  LuciaAdapter,
  Adapter
>() {}

const MAX_CONNECTIONS = 2;
const CONNECT_TIMEOUT = Duration.seconds(5);
const IDLE_TIMEOUT = Duration.seconds(10);

const acquirePool = (url: Redacted.Redacted<string>) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const pool = new pg.Pool({
        connectionString: Redacted.value(url),
        max: MAX_CONNECTIONS,
        connectionTimeoutMillis: Duration.toMillis(CONNECT_TIMEOUT),
        idleTimeoutMillis: Duration.toMillis(IDLE_TIMEOUT),
        application_name: 'playprint-auth',
      });
      pool.on('error', () => {});
      return pool;
    }),
    (pool) => Effect.promise(() => pool.end()).pipe(Effect.timeoutOption('1 second')),
  );

const verifyConnection = (pool: pg.Pool) =>
  Effect.tryPromise({
    try: () => pool.query('SELECT 1'),
    catch: (cause) => new SqlError.SqlError({ cause, message: 'LuciaAdapter: Failed to connect' }),
  }).pipe(
    Effect.timeoutFail({
      duration: CONNECT_TIMEOUT,
      onTimeout: () =>
        new SqlError.SqlError({ cause: new Error('Connection timed out'), message: 'LuciaAdapter: Connection timed out' }),
    }),
  );

export const LuciaAdapterLayer: Layer.Layer<
  LuciaAdapter,
  ConfigError.ConfigError | SqlError.SqlError
> = Layer.scoped(
  LuciaAdapter,
  Effect.gen(function* () {
    const pool = yield* acquirePool(yield* PooledDatabaseUrl);
    yield* verifyConnection(pool);
    return new DrizzlePostgreSQLAdapter(drizzle({ client: pool }), authSessions, users);
  }),
);