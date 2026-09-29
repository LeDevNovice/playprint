import { PlatformConfigProvider } from '@effect/platform';
import { NodeFileSystem } from '@effect/platform-node';
import { Layer } from 'effect';

export const ConfigProviderLayer: Layer.Layer<never> = PlatformConfigProvider.layerDotEnvAdd(
  '.env',
).pipe(Layer.provide(NodeFileSystem.layer));