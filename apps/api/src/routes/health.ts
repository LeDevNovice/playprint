import { HttpLayerRouter, HttpMiddleware, HttpServerResponse } from '@effect/platform';
import { Clock, Effect } from 'effect';

interface HealthReport {
  readonly status: 'ok';
  readonly timestamp: number;
}

const healthCheck = Effect.gen(function* () {
  const timestamp = yield* Clock.currentTimeMillis;
  const report: HealthReport = { status: 'ok', timestamp };
  return yield* Effect.orDie(HttpServerResponse.json(report, { headers: { 'cache-control': 'no-store' } }));
});

export const HealthRoute = HttpLayerRouter.add(
  'GET',
  '/health',
  HttpMiddleware.withLoggerDisabled(healthCheck),
);