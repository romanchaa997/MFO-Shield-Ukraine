# Multi-stage Dockerfile for MFO-Shield-Ukraine optimization
# Stage 1: Builder - compile and prepare dependencies
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with caching
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application if needed (for TypeScript)
RUN npm run build --if-present

# Stage 2: Runtime - minimal production image
FROM node:18-alpine

WORKDIR /app

# Set environment variables for optimization
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512 --enable-source-maps"

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app . 

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT:-3000}', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]
