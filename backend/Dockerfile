FROM node:18-alpine

WORKDIR /app

# Install dependencies for mssql (native modules)
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install

COPY . .

# Create fonts directory (for PDF export)
RUN mkdir -p fonts

EXPOSE 5000

CMD ["node", "server.js"]