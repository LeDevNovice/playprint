import { Clock, Context, Duration, Effect, Layer, Option, Ref } from 'effect';

declare const CachedValue: unique symbol;

export interface CacheKey<A> {
  readonly id: string;
  readonly [CachedValue]: (value: A) => A;
}

export const defineCacheKey =
  <A>(namespace: string) =>
  (id: string): CacheKey<A> =>
    ({ id: `${namespace}:${id}` }) as CacheKey<A>;

export const DEFAULT_CACHE_TTL: Duration.Duration = Duration.hours(6);

export class CacheService extends Context.Tag('@playprint/api/CacheService')<
  CacheService,
  {
    readonly get: <A>(key: CacheKey<A>) => Effect.Effect<Option.Option<A>>;
    readonly set: <A>(key: CacheKey<A>, value: A, ttl?: Duration.DurationInput) => Effect.Effect<void>;
  }
>() {}

interface Entry {
  readonly value: unknown;
  readonly expiresAt: number;
}

type Store = ReadonlyMap<string, Entry>;

const lookup = (entries: Store, id: string, now: number): readonly [Option.Option<unknown>, Store] => {
  const entry = entries.get(id);
  if (entry === undefined) return [Option.none(), entries];
  if (now < entry.expiresAt) return [Option.some(entry.value), entries];
  const next = new Map(entries);
  next.delete(id);
  return [Option.none(), next];
};

const insert = (entries: Store, id: string, entry: Entry, now: number, maxEntries: number): Store => {
  const next = new Map(entries);
  next.delete(id);
  next.set(id, entry);
  if (next.size > maxEntries) {
    for (const [key, { expiresAt }] of next) if (now >= expiresAt) next.delete(key);
  }
  for (const oldest of next.keys()) {
    if (next.size <= maxEntries) break;
    next.delete(oldest);
  }
  return next;
};

export interface InMemoryCacheOptions {
  readonly maxEntries: number;
}

export const makeInMemoryCache = (
  options: InMemoryCacheOptions,
): Effect.Effect<Context.Tag.Service<CacheService>> =>
  Effect.gen(function* () {
    const store = yield* Ref.make<Store>(new Map());

    const get = <A>(key: CacheKey<A>): Effect.Effect<Option.Option<A>> =>
      Effect.flatMap(Clock.currentTimeMillis, (now) =>
        Ref.modify(store, (entries) => lookup(entries, key.id, now)),
      ) as Effect.Effect<Option.Option<A>>;

    const set = <A>(
      key: CacheKey<A>,
      value: A,
      ttl: Duration.DurationInput = DEFAULT_CACHE_TTL,
    ): Effect.Effect<void> =>
      Effect.flatMap(Clock.currentTimeMillis, (now) => {
        const entry: Entry = { value, expiresAt: now + Duration.toMillis(ttl) };
        return Ref.update(store, (entries) => insert(entries, key.id, entry, now, options.maxEntries));
      });

    return { get, set };
  });

export const InMemoryCacheLayer: Layer.Layer<CacheService> = Layer.effect(
  CacheService,
  makeInMemoryCache({ maxEntries: 500 }),
);