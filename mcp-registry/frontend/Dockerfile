FROM nginx:alpine

# Copy static files
COPY index.html /usr/share/nginx/html/

# Fix file permissions
RUN chmod 644 /usr/share/nginx/html/index.html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
