FROM oven/bun:1.3 AS builder

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy client and install its dependencies
COPY client/package.json client/bun.lockb ./client/
RUN cd client && bun install --frozen-lockfile

# Copy source
COPY . .

# Build frontend
RUN cd client && bunx vite build

# Production stage
FROM oven/bun:1.3-slim

WORKDIR /app

COPY --from=builder /app/package.json /app/bun.lockb ./
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

CMD ["bun", "run", "server.ts"]
