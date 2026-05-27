# --- Build stage -----------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

# Empty URL → the React app uses relative paths (e.g. "/api/...") which nginx
# in the runtime stage proxies to the backend service. This keeps the image
# environment-agnostic.
ENV REACT_APP_BACKEND_URL=""
RUN yarn build

# --- Runtime stage ---------------------------------------------------------
FROM nginx:1.27-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
