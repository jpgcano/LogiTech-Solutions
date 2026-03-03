# Dockerfile for LogiTech Solutions API
# Builds Node.js application with dependencies

FROM node:18-alpine

# set working directory
WORKDIR /usr/src/app

# copy package files first for caching
COPY package*.json pnpm-lock.yaml ./

# install pnpm globally and project deps
RUN pnpm install -g pnpm && \
    pnpm install --frozen-lockfile

# copy rest of the source code
COPY . .

# expose port used by the API
EXPOSE 3000

# start command
CMD ["node", "src/server.js"]
