FROM oven/bun:1.3 AS builder

WORKDIR /app

# Install dependencies. Bun 1.3 writes the text lockfile (bun.lock); the binary bun.lockb this
# file used to reference no longer exists in the repo, so the old COPY failed every build.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy client and install its dependencies
COPY client/package.json client/bun.lock ./client/
RUN cd client && bun install --frozen-lockfile

# Copy source
COPY . .

# Build frontend
RUN cd client && bunx vite build

# Production stage
FROM oven/bun:1.3-slim

WORKDIR /app

COPY --from=builder /app/package.json /app/bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /app/server.ts ./
COPY --from=builder /app/db ./db
COPY --from=builder /app/modules ./modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/client/dist ./client/dist

# Create data directory for SQLite
RUN mkdir -p data

ENV PORT=3000
EXPOSE 3000

# Ensure the schema exists before serving: db/push.ts is CREATE TABLE IF NOT EXISTS throughout, so
# this is a no-op on a database that already has tables and a bootstrap on a fresh volume.
CMD ["sh", "-c", "bun run db/push.ts && bun run server.ts"]
