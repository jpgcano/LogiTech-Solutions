# Dockerfile for LogiTech Solutions Client
# Lightweight Nginx server for static assets

FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config with API proxy
COPY nginx.conf /etc/nginx/conf.d/nginx.conf

# Copy frontend source to nginx html directory
COPY src /usr/share/nginx/html

EXPOSE 80

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/index.html || exit 1

CMD ["nginx", "-g", "daemon off;"]