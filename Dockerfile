# syntax=docker/dockerfile:1

# ---- deps: install node_modules with Bun ----
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- build: produce .next/standalone ----
FROM oven/bun:1 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ---- runtime: minimal Node server from Next.js standalone output ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nova \
 && useradd --system --uid 1001 --gid nova --no-create-home nova

COPY --from=build --chown=nova:nova /app/.next/standalone ./
COPY --from=build --chown=nova:nova /app/.next/static ./.next/static
COPY --from=build --chown=nova:nova /app/public ./public

USER nova
EXPOSE 3000
CMD ["node", "server.js"]
