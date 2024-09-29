# Stage 1: Build Stage
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy the package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies, including Prisma CLI
RUN npm install --legacy-peer-deps

# Install Prisma CLI globally
RUN npm install -g prisma

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN prisma generate

# Run database migrations
RUN prisma migrate deploy 

# Build the application
RUN npm run build

# Stage 2: Production Stage
FROM node:18-alpine AS production

# Set the working directory
WORKDIR /app

# Install Prisma CLI globally
RUN npm install -g prisma

# Copy the build files, node_modules, and Prisma files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Copy any environment variables file if necessary
COPY --from=builder /app/.env ./

# Create the uploads directory
RUN mkdir -p /app/uploads

# Expose the application port (default NestJS port)
EXPOSE 3000

# Start the application with a check for environment variables
CMD ["sh", "-c", "if [ -z \"$DATABASE_URL\" ]; then echo 'DATABASE_URL is not set. Skipping migrations.'; else prisma migrate deploy; fi && node dist/main.js"]
