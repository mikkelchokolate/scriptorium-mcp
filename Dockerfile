FROM node:22-alpine

WORKDIR /app

# Install Neo4j dependencies if needed
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY dist/ ./dist/

# Neo4j connection will be configured via env
ENV SCRIPTORIUM_PROJECTS=/data/projects \
    NEO4J_URI=bolt://neo4j:7687 \
    NEO4J_USERNAME=neo4j \
    NEO4J_PASSWORD=password

VOLUME ["/data/projects"]

EXPOSE 3000

CMD ["node", "dist/index.js"]
