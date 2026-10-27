# Servidor de Smartnomic con la web incluida. Sirve para Railway o cualquier plataforma
# con Docker.

# --- 1. Exportar la web de la app (Expo) ---------------------------------------------
FROM node:22-slim AS web
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/domain/package.json packages/domain/
COPY packages/api/package.json packages/api/
COPY apps/server/package.json apps/server/
COPY apps/mobile/package.json apps/mobile/
RUN pnpm install --frozen-lockfile --filter "@smartnomic/mobile..."

COPY packages packages
COPY apps/mobile apps/mobile
# Sin EXPO_PUBLIC_API_URL, la web llama a la API en su mismo origen.
RUN pnpm --filter @smartnomic/mobile export:web

# --- 2. Servidor -----------------------------------------------------------------------
FROM node:22-slim
WORKDIR /app
RUN corepack enable

# Primero las dependencias, para que Docker las reutilice si solo cambia el código.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/domain/package.json packages/domain/
COPY packages/api/package.json packages/api/
COPY apps/server/package.json apps/server/
COPY apps/mobile/package.json apps/mobile/
RUN pnpm install --frozen-lockfile --prod --filter "@smartnomic/server..."

COPY packages packages
COPY apps/server apps/server
COPY --from=web /app/apps/mobile/dist apps/mobile/dist

ENV NODE_ENV=production
WORKDIR /app/apps/server
# La plataforma indica el puerto en PORT (3000 si no).
CMD ["node", "--import", "tsx", "src/index.ts"]
