# Debian-based image (NOT node:18-alpine). Alpine's musl libc has a known
# DNS resolution bug inside Docker's internal network (shows up as
# "getaddrinfo EAI_AGAIN <service-name>"). Debian's glibc resolver doesn't
# have this problem.
FROM node:18-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN npm install
WORKDIR /app/server
RUN npm install
WORKDIR /app/client
RUN npm install
WORKDIR /app

EXPOSE 5000 5173

# server/config/db.js retries the DB connection with backoff on its own,
# so no wait/sleep script is needed here.
CMD ["npm", "run", "dev"]
