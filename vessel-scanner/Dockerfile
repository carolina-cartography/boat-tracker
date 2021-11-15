FROM node:12-alpine
WORKDIR /vessel-scanner
ADD . /vessel-scanner
RUN apk add gcc g++ make python linux-headers udev
RUN npm install
CMD ["node", "index.js"]
