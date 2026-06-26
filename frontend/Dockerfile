FROM node:20-alpine AS builder

WORKDIR /repo

RUN apk add --no-cache git

# Accept build-time arguments
ARG VITE_API_URL=http://localhost:3000
ARG VITE_GIT_BRANCH
ARG VITE_GIT_COMMIT
ARG VITE_GIT_COMMIT_DATE
ARG VITE_BUILD_TIME
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GIT_BRANCH=$VITE_GIT_BRANCH
ENV VITE_GIT_COMMIT=$VITE_GIT_COMMIT
ENV VITE_GIT_COMMIT_DATE=$VITE_GIT_COMMIT_DATE
ENV VITE_BUILD_TIME=$VITE_BUILD_TIME

# Copy Git metadata when this Dockerfile is built from the repository root.
# If it is unavailable (for example, an exported source archive), vite.config.ts falls back to "unknown".
COPY .git ./.git

# Copy package files
COPY frontend/package*.json ./frontend/

# Install dependencies
WORKDIR /repo/frontend
RUN npm install

# Copy application files
COPY frontend/ ./

# Build application
RUN npm run build

# Production image with nginx
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built application
COPY --from=builder /repo/frontend/dist .

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
