FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
# Cloud Run מזריק את המשתנה PORT אוטומטית (בד"כ 8080) - server.js כבר קורא process.env.PORT
EXPOSE 8080

CMD ["node", "server.js"]
