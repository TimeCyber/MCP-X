FROM electronuserland/builder:wine

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN npm ci
RUN npm install --os=win32 --cpu=x64 sharp

ENV WINEARCH=win64
ENV WINEDEBUG=-all

CMD ["npm", "run", "package:windows"]