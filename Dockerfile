FROM node:22-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production && apk del python3 make g++

# Copy app files
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
