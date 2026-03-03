# Dockerfile for LogiTech Solutions API
# Production-ready Node.js application

FROM node:18-alpine

WORKDIR /app

# Copy package files for dependency caching
COPY package*.json ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install

# Copy application code
COPY . .

EXPOSE 3000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application (production)
CMD ["node", "src/server.js"]
