import type { SqlClient, SqlError } from '@effect/sql';
import { PgClient } from '@effect/sql-pg';
import { Config, ConfigError, Duration, Either, Layer, Redacted } from 'effect';

const requirePooledChannel = (
  url: Redacted.Redacted<string>,
): Either.Either<Redacted.Redacted<string>, ConfigError.ConfigError> => {
  const parsed = URL.parse(Redacted.value(url));
  if (parsed === null) {
    return Either.left(ConfigError.InvalidData([], 'Invalid URL (value hidden)'));
  }
  if (!parsed.hostname.includes('-pooler')) {
    return Either.left(
      ConfigError.InvalidData([], `Must target the Neon pooler endpoint, got ${parsed.hostname}`),
    );
  }
  if (parsed.searchParams.get('sslmode') !== 'verify-full') {
    return Either.left(ConfigError.InvalidData([], 'Must use sslmode=verify-full'));
  }
  return Either.right(url);
};

export const PooledDatabaseUrl = Config.redacted().pipe(
  Config.mapOrFail(requirePooledChannel),
  Config.nested('DATABASE_URL'),
);

export const DatabaseLayer: Layer.Layer<
  SqlClient.SqlClient,
  ConfigError.ConfigError | SqlError.SqlError
> = PgClient.layerConfig({
  url: PooledDatabaseUrl,
  connectTimeout: Config.succeed(Duration.seconds(5)),
  applicationName: Config.succeed('playprint-api'),
});