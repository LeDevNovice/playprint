import { PlatformConfigProvider } from '@effect/platform';
import { NodeFileSystem } from '@effect/platform-node';
import { Config, ConfigError, Either, Layer, Redacted } from 'effect';

export const ConfigProviderLayer: Layer.Layer<never> = PlatformConfigProvider.layerDotEnvAdd(
  '.env',
).pipe(Layer.provide(NodeFileSystem.layer));

type Refinement<A, B> = (value: A) => Either.Either<B, ConfigError.ConfigError>;

const requireFilled = (raw: string): Either.Either<string, ConfigError.ConfigError> => {
  if (raw.length === 0) {
    return Either.left(ConfigError.MissingData([], 'is empty (key copied from .env.example without a value?)'));
  }
  if (raw.trim() !== raw) {
    return Either.left(
      ConfigError.InvalidData([], 'has leading or trailing whitespace (value hidden; secret created with `echo` instead of `echo -n`?)'),
    );
  }
  return Either.right(raw);
};

export const secret = (
  name: string,
  refine: Refinement<Redacted.Redacted<string>, Redacted.Redacted<string>> = Either.right,
): Config.Config<Redacted.Redacted<string>> =>
  Config.redacted().pipe(
    Config.mapOrFail((value) =>
      Either.flatMap(requireFilled(Redacted.value(value)), () => refine(value)),
    ),
    Config.nested(name),
  );

export function setting(name: string): Config.Config<string>;
export function setting<A>(name: string, refine: Refinement<string, A>): Config.Config<A>;
export function setting(name: string, refine: Refinement<string, unknown> = Either.right): Config.Config<unknown> {
  return Config.string().pipe(
    Config.mapOrFail((raw) => Either.flatMap(requireFilled(raw), refine)),
    Config.nested(name),
  );
}