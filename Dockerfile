FROM node:20-slim

WORKDIR /app

# Copy everything
COPY . .

# Install client deps and build
WORKDIR /app/client
RUN npm install
RUN npm run build

# Install server deps
WORKDIR /app/server
RUN npm install

# Expose port
EXPOSE 8080

ENV PORT=8080

# Start server
CMD ["node", "index.js"]
