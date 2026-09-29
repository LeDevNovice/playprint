import { NodeRuntime } from '@effect/platform-node';
import { Config, Effect } from 'effect';
import { ConfigProviderLayer } from './config';
import { PooledDatabaseUrl } from './database';

const check = Effect.gen(function* () {
  yield* Config.all([PooledDatabaseUrl]);
  yield* Effect.logInfo('Runtime configuration OK');
});

check.pipe(Effect.provide(ConfigProviderLayer), NodeRuntime.runMain);