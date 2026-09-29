import { NodeRuntime } from '@effect/platform-node';
import { SqlClient } from '@effect/sql';
import { Effect, Layer } from 'effect';
import { ConfigProviderLayer } from './config';
import { DatabaseLayer } from './database';

const smokeTest = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  const [row] = yield* sql<{ database: string; serverTime: Date }>`
    SELECT current_database() AS database, now() AS "serverTime"
  `;
  yield* Effect.logInfo('Runtime database channel OK', row);
});

smokeTest.pipe(
  Effect.provide(DatabaseLayer.pipe(Layer.provide(ConfigProviderLayer))),
  NodeRuntime.runMain,
);