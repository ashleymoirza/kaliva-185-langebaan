# Kaliva 185 Langebaan — Multi-stage Dockerfile for Next.js
# Optimized for production deployment with standalone output

# ─────────────────────────────────────────────────────────────
# Base image with dependencies
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    curl \
    postgresql-client \
    tzdata

# Set timezone
ENV TZ=Africa/Johannesburg

WORKDIR /app

# ─────────────────────────────────────────────────────────────
# Install dependencies (cached layer)
# ─────────────────────────────────────────────────────────────
FROM base AS deps

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --omit=dev --ignore-scripts

# ─────────────────────────────────────────────────────────────
# Build the application
# ─────────────────────────────────────────────────────────────
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application (output: standalone)
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Production runner
# ─────────────────────────────────────────────────────────────
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema for migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]