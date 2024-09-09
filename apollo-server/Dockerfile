# FROM node:hydrogen-alpine

# WORKDIR /app

# COPY index.js index.js
# COPY typedefs.gql typedefs.gql
# COPY package.json package.json
# COPY package-lock.json package-lock.json

# RUN npm install

# ENTRYPOINT [ "node", "index.js" ]

FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules

EXPOSE 4000
CMD [ "node", "index.js" ]