FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM base
RUN apt-get update && apt-get install -y git gh && rm -rf /var/lib/apt/lists/*

COPY --from=install /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY src ./src
COPY tsconfig.json ./

ENV PORT=3000
EXPOSE 3000

CMD ["bun", "src/index.ts"]
