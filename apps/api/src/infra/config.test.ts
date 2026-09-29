import { describe, expect, it } from '@effect/vitest';
import { Config, ConfigProvider, Effect, Redacted } from 'effect';
import { secret, setting } from './config';
import { PooledDatabaseUrl } from './database';

const withEnv = (env: Record<string, string>) =>
  Effect.withConfigProvider(ConfigProvider.fromMap(new Map(Object.entries(env))));

const failureOf = <A>(config: Config.Config<A>, env: Record<string, string>) =>
  Effect.flip(config).pipe(withEnv(env), Effect.map(String));

const LEAK = 're_live_DO_NOT_LEAK';

describe('secret', () => {
  it.effect('keeps a filled value redacted', () =>
    Effect.gen(function* () {
      const key = yield* secret('RESEND_API_KEY').pipe(withEnv({ RESEND_API_KEY: LEAK }));
      expect(Redacted.value(key)).toBe(LEAK);
      expect(String(key)).toBe('<redacted>');
      expect(JSON.stringify({ key })).not.toContain(LEAK);
    }));

  it.effect.each([
    ['missing', {}, 'Missing data at RESEND_API_KEY'],
    ['empty', { RESEND_API_KEY: '' }, 'is empty'],
    ['trailing newline', { RESEND_API_KEY: `${LEAK}\n` }, 'whitespace'],
  ] as const)('rejects a %s value without echoing it', ([, env, expected]) =>
    Effect.gen(function* () {
      const message = yield* failureOf(secret('RESEND_API_KEY'), env);
      expect(message).toContain(expected);
      expect(message).toContain('RESEND_API_KEY');
      expect(message).not.toContain(LEAK);
    }));

  it.effect('reports every missing variable at once through Config.all', () =>
    Effect.gen(function* () {
      const message = yield* failureOf(Config.all([secret('A_KEY'), setting('B_ID')]), {});
      expect(message).toContain('A_KEY');
      expect(message).toContain('B_ID');
    }));
});

describe('owner refinements keep the variable name and hide the value', () => {
  it.effect('DATABASE_URL on the direct endpoint', () =>
    Effect.gen(function* () {
      const message = yield* failureOf(PooledDatabaseUrl, {
        DATABASE_URL: 'postgresql://u:hunter2@ep-x.eu-central-1.aws.neon.tech/db?sslmode=verify-full',
      });
      expect(message).toContain('Invalid data at DATABASE_URL');
      expect(message).not.toContain('hunter2');
    }));
});