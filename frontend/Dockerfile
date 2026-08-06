# ── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Cache npm install separately from source so code-only changes don't
# reinstall all dependencies.
COPY package*.json ./
RUN npm ci

COPY . .

# Baked in at build time since CRA inlines REACT_APP_* vars into the bundle.
ARG REACT_APP_API_BASE_URL=http://localhost:8080/api
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
RUN npm run build

# ── Runtime stage ───────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
