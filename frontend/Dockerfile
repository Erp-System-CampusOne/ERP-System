# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm ci --workspace=frontend --include-workspace-root --ignore-scripts

COPY frontend/ ./frontend/

# Build Vite app — /api calls are proxied by nginx at runtime
# VITE_API_BASE_URL is intentionally empty so the browser hits /api on the same origin
WORKDIR /app/frontend
ENV VITE_API_BASE_URL=""
RUN npm install -D @rollup/rollup-linux-x64-musl
RUN npm run build
# ─── Stage 2: Nginx ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx site
RUN rm -f /etc/nginx/conf.d/default.conf

# Custom nginx config (proxies /api → backend api container)
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React SPA
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
