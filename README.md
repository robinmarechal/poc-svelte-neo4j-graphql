# Svelte Neo4J GraphQL POC

Sveltekit frontend with a Neo4J database using an Apollo Server proxy to translate GraphQL queries to Cypher

## Developing

```bash
pnpm install
pnpm dev
```

## Start Apollo GraphQL Proxy

1. Rename `apollo-server/.env.example` to `apollo-server/.env`
2. Fill env variables in file `apollo-server/.env`
3. Start apollo server

```bash
docker compose up
```

> Note: To run Apollo proxy without docker compose, see [apollo-server/README.md](apollo-server/README.md)

