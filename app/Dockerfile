# 🐳 AI Image Generator - Production Dockerfile
# Multi-stage build for optimal size and security

# Stage 1: Build dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app

# Install system dependencies for potential native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Production image
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Install curl for health checks
RUN apk add --no-cache curl && rm -rf /var/cache/apk/*

# Copy dependencies from build stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodeuser:nodejs . .

# Create necessary directories with proper permissions
RUN mkdir -p uploads generated logs data && \
    chown -R nodeuser:nodejs uploads generated logs data

# Set proper permissions
USER nodeuser

# Expose port
EXPOSE 3008

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3008/api/images || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=3008

# Start the application
CMD ["node", "server.js"]
