# ============================================================================
# inference.cpp — Multi-stage Docker build
# ============================================================================
#
# Build:
#   docker build -t inference-cpp .
#   docker build --build-arg CUDA=ON -t inference-cpp:cuda .
#
# Run:
#   docker run -p 8080:8080 -p 8081:8081 inference-cpp
#   docker run --gpus all -p 8080:8080 -p 8081:8081 inference-cpp:cuda
#
# docker-compose:
#   docker compose up
# ============================================================================

# ---- Stage 1: Builder ----
FROM ubuntu:24.04 AS builder

ARG CUDA=OFF
ARG BUILD_TYPE=Release

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    build-essential cmake git \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Optional: CUDA toolkit for GPU builds
# (installed via nvidia/cuda image when CUDA=ON)
# When CUDA=ON, use: docker build --build-arg CUDA=ON --build-arg BASE_IMAGE=nvidia/cuda:12.6.0-devel-ubuntu24.04 .

WORKDIR /src

# Copy source
COPY . .

# Build
RUN cmake -B build \
    -DCMAKE_BUILD_TYPE=${BUILD_TYPE} \
    -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DINFERENCE_BUILD_TESTS=ON \
    -DINFERENCE_CUDA=${CUDA} \
    && cmake --build build -j$(nproc) \
    && ctest --test-dir build --output-on-failure

# Install
RUN cmake --install build

# ---- Stage 2: Runtime ----
FROM ubuntu:24.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy built binaries
COPY --from=builder /usr/local/bin/inference_cli /usr/local/bin/
COPY --from=builder /usr/local/lib/libinference.a /usr/local/lib/
COPY --from=builder /usr/local/lib/libecho_plugin.so /usr/local/lib/
COPY --from=builder /usr/local/lib/libbridge_plugin.so /usr/local/lib/

# Copy catalog and config
COPY models/ /opt/inference/models/
COPY cards/ /opt/inference/cards/
COPY agents/ /opt/inference/agents/

# Create cache directory
RUN mkdir -p /root/.cache/inference.cpp

EXPOSE 8080 8081

ENTRYPOINT ["inference_cli"]
CMD ["serve", "--port", "8080", "--catalog-dir", "/opt/inference", "--plugin-dir", "/usr/local/lib"]

# ---- CUDA variant ----
FROM nvidia/cuda:12.6.0-runtime-ubuntu24.04 AS runtime-cuda

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/bin/inference_cli /usr/local/bin/
COPY --from=builder /usr/local/lib/libinference.a /usr/local/lib/
COPY --from=builder /usr/local/lib/libecho_plugin.so /usr/local/lib/
COPY --from=builder /usr/local/lib/libbridge_plugin.so /usr/local/lib/

COPY models/ /opt/inference/models/
COPY cards/ /opt/inference/cards/
COPY agents/ /opt/inference/agents/

RUN mkdir -p /root/.cache/inference.cpp

EXPOSE 8080 8081

ENTRYPOINT ["inference_cli"]
CMD ["serve", "--port", "8080", "--catalog-dir", "/opt/inference", "--plugin-dir", "/usr/local/lib"]
