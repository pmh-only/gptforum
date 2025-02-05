FROM alpine AS build

RUN apk add --no-cache nodejs npm
RUN npm i -g pnpm

WORKDIR /app

COPY package.json \
     pnpm-lock.yaml \
     ./

RUN pnpm i --frozen-lockfile

COPY tsconfig.json .
COPY src/ src/

RUN npx tsc

FROM alpine AS resolve

RUN apk add --no-cache nodejs npm
RUN npm i -g pnpm

WORKDIR /app

COPY package.json \
     pnpm-lock.yaml \
     ./

RUN pnpm i --frozen-lockfile -P

FROM alpine AS runtime

RUN apk add --no-cache nodejs

ARG user=1000
ARG group=1000

USER $user:$group
WORKDIR /app

COPY --from=build /app/dist dist
COPY --from=resolve /app/node_modules node_modules

ENTRYPOINT ["/usr/bin/node", "dist/main.js"]
