# The web app: a static build served by non-root nginx.
#   docker build -t agentic-ai-web:staging --build-arg VITE_API_BASE_URL=https://app.example.com .
#
# The API address is compiled into the bundle, so it is a build argument. It must
# be given: the default in the source points at localhost.
FROM node:22-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_CLERK_PUBLISHABLE_KEY=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
RUN test -n "$VITE_API_BASE_URL" || (echo "VITE_API_BASE_URL build argument is required" && exit 1)
RUN npm run build

# The Content-Security-Policy names the API origin, which is only known now: write
# it in (scheme, host and port of VITE_API_BASE_URL, without any path).
RUN API_ORIGIN=$(node -e 'console.log(new URL(process.env.VITE_API_BASE_URL).origin)')  && sed "s#__API_ORIGIN__#${API_ORIGIN}#g" deploy/security-headers.conf > /app/security-headers.conf  && ! grep -q __API_ORIGIN__ /app/security-headers.conf

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
