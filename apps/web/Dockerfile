# Build model assets from source so fresh deployments include every product.
FROM python:3.12-slim AS model-assets
WORKDIR /models
COPY scripts/3d/requirements.txt scripts/3d/requirements.txt
RUN pip install --no-cache-dir -r scripts/3d/requirements.txt
COPY scripts/3d/ scripts/3d/
COPY data/catalog.json data/catalog.json
COPY preview/models/hilton-2-draft.glb preview/models/hilton-2-draft.glb
COPY preview/models/hilton-2-estimated.usdz preview/models/hilton-2-estimated.usdz
COPY preview/model-manifests/hilton-2.json preview/model-manifests/hilton-2.json
RUN python scripts/3d/build_catalog_models.py --sync-web

FROM node:22-alpine AS builder
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY apps/web/ .
COPY --from=model-assets /models/apps/web/public/ ./public/
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
USER node
CMD ["npm","run","start"]

