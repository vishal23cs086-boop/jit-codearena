# ==============================================================================
# JIT CodeArena Runner - Python 3.13 + nsjail sandbox + Node HTTP API
# ==============================================================================

# ---- Build nsjail --------------------------------------------------------------
FROM debian:bookworm-slim AS nsjail
RUN apt-get update && apt-get install -y --no-install-recommends \
      autoconf bison flex gcc g++ git libprotobuf-dev libnl-route-3-dev \
      libtool make pkg-config protobuf-compiler ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 --branch 3.6 https://github.com/google/nsjail.git /nsjail \
 && make -C /nsjail -j"$(nproc)"

# ---- Runtime -------------------------------------------------------------------
FROM python:3.13-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
      libprotobuf32 libnl-route-3-200 \
 && rm -rf /var/lib/apt/lists/*

COPY --from=nsjail /nsjail/nsjail /usr/local/bin/nsjail
COPY --from=node:20-bookworm-slim /usr/local/bin/node /usr/local/bin/node

WORKDIR /app
COPY package.json server.mjs sandbox.mjs ./

ENV NODE_ENV=production \
    RUNNER_SANDBOX=nsjail \
    PORT=8787
EXPOSE 8787
CMD ["node", "server.mjs"]
