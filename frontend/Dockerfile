# Use the official Next.js image as a build environment
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Set build-time args for env vars
ARG NEXT_PUBLIC_API_KEY
ENV NEXT_PUBLIC_API_KEY=${NEXT_PUBLIC_API_KEY}

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED 1

# Build the Next.js app with standalone output
RUN npm run build

# --- Production Stage ---
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone output from the builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to the non-root user
USER nextjs

# Expose the port Next.js will run on
EXPOSE 8080

# Set the PORT environment variable
ENV PORT 8080

# Start the server
CMD ["node", "server.js"] 