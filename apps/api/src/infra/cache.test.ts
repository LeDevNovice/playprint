import { describe, expect, it } from '@effect/vitest';
import { Effect, Option, Ref, TestClock } from 'effect';
import { CacheService, defineCacheKey, InMemoryCacheLayer, makeInMemoryCache } from './cache';

const numberKey = defineCacheKey<number>('test:number');

describe('InMemoryCache', () => {
  it.effect('returns None for a key never set', () =>
    Effect.gen(function* () {
      const cache = yield* CacheService;
      expect(yield* cache.get(numberKey('absent'))).toEqual(Option.none());
    }).pipe(Effect.provide(InMemoryCacheLayer)),
  );

  it.effect('serves the value 1 ms before the default TTL expires', () =>
    Effect.gen(function* () {
      const cache = yield* CacheService;
      yield* cache.set(numberKey('a'), 42);
      yield* TestClock.adjust('21599999 millis');
      expect(yield* cache.get(numberKey('a'))).toEqual(Option.some(42));
    }).pipe(Effect.provide(InMemoryCacheLayer)),
  );

  it.effect('reports a miss at exactly the default TTL', () =>
    Effect.gen(function* () {
      const cache = yield* CacheService;
      yield* cache.set(numberKey('a'), 42);
      yield* TestClock.adjust('6 hours');
      expect(yield* cache.get(numberKey('a'))).toEqual(Option.none());
    }).pipe(Effect.provide(InMemoryCacheLayer)),
  );

  it.effect('honours an explicit TTL and restarts it on overwrite', () =>
    Effect.gen(function* () {
      const cache = yield* CacheService;
      yield* cache.set(numberKey('a'), 1, '1 minute');
      yield* TestClock.adjust('50 seconds');
      yield* cache.set(numberKey('a'), 2, '1 minute');
      yield* TestClock.adjust('50 seconds');
      expect(yield* cache.get(numberKey('a'))).toEqual(Option.some(2));
      yield* TestClock.adjust('10 seconds');
      expect(yield* cache.get(numberKey('a'))).toEqual(Option.none());
    }).pipe(Effect.provide(InMemoryCacheLayer)),
  );

  it.effect('treats a zero TTL as immediately absent, even over a previous value', () =>
    Effect.gen(function* () {
      const cache = yield* CacheService;
      yield* cache.set(numberKey('a'), 1);
      yield* cache.set(numberKey('a'), 2, 0);
      expect(yield* cache.get(numberKey('a'))).toEqual(Option.none());
    }).pipe(Effect.provide(InMemoryCacheLayer)),
  );

  it.effect('never holds more than maxEntries: oldest insertion goes first', () =>
    Effect.gen(function* () {
      const cache = yield* makeInMemoryCache({ maxEntries: 2 });
      yield* cache.set(numberKey('a'), 1);
      yield* cache.set(numberKey('b'), 2);
      yield* cache.set(numberKey('c'), 3);
      expect(yield* cache.get(numberKey('a'))).toEqual(Option.none());
      expect(yield* cache.get(numberKey('b'))).toEqual(Option.some(2));
      expect(yield* cache.get(numberKey('c'))).toEqual(Option.some(3));
    }),
  );

  it.effect('when full, drops expired entries before live ones', () =>
    Effect.gen(function* () {
      const cache = yield* makeInMemoryCache({ maxEntries: 2 });
      yield* cache.set(numberKey('long'), 1, '1 hour');
      yield* cache.set(numberKey('short'), 2, '1 second');
      yield* TestClock.adjust('2 seconds');
      yield* cache.set(numberKey('new'), 3);
      expect(yield* cache.get(numberKey('long'))).toEqual(Option.some(1));
      expect(yield* cache.get(numberKey('new'))).toEqual(Option.some(3));
    }),
  );

  it.effect('loses no write under 1 000 concurrent fibers', () =>
    Effect.gen(function* () {
      const cache = yield* makeInMemoryCache({ maxEntries: 10_000 });
      const ids = Array.from({ length: 1_000 }, (_, i) => `k${i}`);
      yield* Effect.forEach(ids, (id, i) => cache.set(numberKey(id), i), { concurrency: 'unbounded' });
      const values = yield* Effect.forEach(ids, (id) => cache.get(numberKey(id)));
      expect(values.filter(Option.isSome)).toHaveLength(1_000);
    }),
  );
});

describe('Ref read-then-write across a yield point', () => {
  it.effect('loses concurrent updates', () =>
    Effect.gen(function* () {
      const store = yield* Ref.make<ReadonlyMap<string, number>>(new Map());
      const naiveSet = (id: string, value: number) =>
        Effect.gen(function* () {
          const current = yield* Ref.get(store);
          yield* Effect.yieldNow();
          yield* Ref.set(store, new Map(current).set(id, value));
        });
      yield* Effect.forEach(Array.from({ length: 1_000 }, (_, i) => i), (i) => naiveSet(`k${i}`, i), {
        concurrency: 'unbounded',
      });
      expect((yield* Ref.get(store)).size).toBeLessThan(1_000);
    }),
  );
});

// Type-level contract, checked by tsc (never executed).
const _typeChecks = Effect.gen(function* () {
  const cache = yield* CacheService;
  // @ts-expect-error a CacheKey<number> refuses a string value
  yield* cache.set(numberKey('a'), 'not a number');
  const n: Option.Option<number> = yield* cache.get(numberKey('a'));
  // @ts-expect-error the caller cannot re-type what a key reads
  const s: Option.Option<string> = yield* cache.get(numberKey('a'));
  return [n, s];
});