import { NodeRuntime } from '@effect/platform-node';
import { Effect, Layer } from 'effect';
import { AppLayer, StartupConfigCheck } from './app.layer';
import { ConfigProviderLayer } from './infra/config';

const main = Effect.zipRight(StartupConfigCheck, Layer.launch(AppLayer));

main.pipe(Effect.provide(ConfigProviderLayer), NodeRuntime.runMain);