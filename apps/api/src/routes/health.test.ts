import { HttpClient, HttpClientResponse, HttpLayerRouter } from '@effect/platform';
import { NodeHttpServer } from '@effect/platform-node';
import { describe, expect, it } from '@effect/vitest';
import { Duration, Effect, Layer, Schema, TestClock } from 'effect';
import { HealthRoute } from './health';

const HealthBody = Schema.Struct({ status: Schema.Literal('ok'), timestamp: Schema.Number });

const TestServer = HttpLayerRouter.serve(HealthRoute, { disableListenLog: true }).pipe(
  Layer.provideMerge(NodeHttpServer.layerTest),
);

const getHealth = HttpClient.get('/health').pipe(
  Effect.tap((res) => expect(res.status).toBe(200)),
  Effect.tap((res) => expect(res.headers['cache-control']).toBe('no-store')),
  Effect.flatMap(HttpClientResponse.schemaBodyJson(HealthBody)),
);

describe('GET /health', () => {
  it.scoped('reads the time from the Clock, per request', () =>
    Effect.gen(function* () {
      yield* TestClock.setTime(Date.UTC(2026, 8, 30));
      const first = yield* getHealth;
      yield* TestClock.adjust(Duration.minutes(5));
      const second = yield* getHealth;

      expect(first).toEqual({ status: 'ok', timestamp: Date.UTC(2026, 8, 30) });
      expect(second.timestamp - first.timestamp).toBe(Duration.toMillis('5 minutes'));
    }).pipe(Effect.provide(TestServer)));
});