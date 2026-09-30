ARG NODE_IMAGE=node:22.23.3-alpine3.24@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402

# ─── Stage 1 : build ─────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --workspace=@playprint/api --ignore-scripts --no-audit --no-fund

COPY tsconfig.base.json ./
COPY apps/api/tsconfig.json apps/api/build.mjs apps/api/
COPY apps/api/src apps/api/src

RUN npm run build --workspace=@playprint/api

# ─── Stage 2 : runtime ───────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runtime

RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx \
           /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*

WORKDIR /app

COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./

USER 1000:1000

EXPOSE 8080

CMD ["node", "dist/index.js"]