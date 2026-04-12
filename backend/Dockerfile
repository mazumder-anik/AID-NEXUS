FROM node:20-alpine
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy application code
COPY . .

# Create persistent data directory
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "server.js"]
