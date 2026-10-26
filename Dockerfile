# Servidor de Smartnomic. Sirve para Railway o cualquier plataforma con Docker.
# La web exportada se añadirá a esta imagen con la tarea T031.
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

ENV NODE_ENV=production
WORKDIR /app/apps/server
# La plataforma indica el puerto en PORT (3000 si no).
CMD ["node", "--import", "tsx", "src/index.ts"]
