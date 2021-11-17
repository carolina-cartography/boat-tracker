FROM node:12-alpine
WORKDIR /vessel-scanner
ADD . /vessel-scanner
RUN apk add --virtual build-deps gcc g++ make python3 linux-headers udev && \
    npm install && \
    apk del build-deps
CMD ["node", "index.js"]
