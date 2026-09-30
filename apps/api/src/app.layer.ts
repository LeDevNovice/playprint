import { HttpLayerRouter } from '@effect/platform';
import { NodeHttpServer } from '@effect/platform-node';
import { Config, Layer } from 'effect';
import { createServer } from 'node:http';
import { InMemoryCacheLayer } from './infra/cache';
import { DatabaseLayer, PooledDatabaseUrl } from './infra/database';
import { LuciaAdapterLayer } from './infra/lucia-db';
import { HealthRoute } from './routes/health';

const ListenPort = Config.port('PORT').pipe(Config.withDefault(8080));

const InfraLayer = Layer.mergeAll(DatabaseLayer, LuciaAdapterLayer, InMemoryCacheLayer);

const Routes = Layer.mergeAll(HealthRoute);

export const AppLayer = HttpLayerRouter.serve(Routes).pipe(
  Layer.provide(NodeHttpServer.layerConfig(createServer, { port: ListenPort })),
  Layer.provide(InfraLayer),
);

export const StartupConfigCheck: Config.Config<void> = Config.all([PooledDatabaseUrl, ListenPort]).pipe(
  Config.map(() => undefined),
);