FROM node:20-alpine AS build

WORKDIR /app
COPY package.json tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
COPY web ./web
RUN npm install
RUN npm run build

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/web/dist ./web/dist

EXPOSE 8080

CMD ["node", "dist/index.js"]
