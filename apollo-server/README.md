# Neo4J proxy

Neo4j graphql proxy using Apollo server

## Prepare

1. Rename `.env.example` to `.env`
2. Fill env variables in file `.env`

## Run

```bash
pnpm install
pnpm start
```

## Build and run using docker

```bash
docker build -t <image_name> .
docker run -p 4000:4000 <image_name> 
```