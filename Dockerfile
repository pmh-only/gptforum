FROM oven/bun:alpine AS build

WORKDIR /app

COPY package.json \
     bun.lock \
     ./

RUN bun install --frozen-lockfile

COPY prisma/ prisma/
RUN bun prisma generate

COPY src/ src/

RUN bun build src/main.ts \
     --compile --minify \
     --sourcemap --bytecode \
     --outfile gptforum

FROM alpine AS runtime

WORKDIR /app

RUN apk add --no-cache libstdc++

USER 1000:1000

COPY --chown=1000:1000 --from=build /app/gptforum .
COPY --chown=1000:1000 --from=build /app/node_modules/.prisma/client/libquery_engine* /tmp/prisma-engines/

ENTRYPOINT [ "/app/gptforum" ]
