# ============================================================================
# inference.cpp — the gateway image. ONE build path: bootstrap.py.
#
# Docker WRAPS the self-bootstrap; it is not a second path. The builder
# stage calls the exact command bare metal calls (python3 bootstrap.py
# --server). ComfyUI is a separate service (infra/comfyui/Dockerfile.comfyui)
# which wraps the same bootstrap for extensions + models.
#
# Build:   docker build -t inference-cpp .
# Compose: docker compose up
# ============================================================================

# ---- Stage 1: Builder — the self-bootstrap builds the server ----
FROM ubuntu:24.04 AS builder

ARG CUDA=OFF
ARG BUILD_TYPE=Release

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    build-essential cmake git curl \
    libssl-dev python3 python3-yaml \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
COPY . .

# THE build path (same as bare metal; --server needs no ComfyUI workspace).
# CUDA=ON wants a cuda base image:
#   docker build --build-arg CUDA=ON \
#     --build-arg BASE_IMAGE=nvidia/cuda:12.6.0-devel-ubuntu24.04 .
ARG BASE_IMAGE=ubuntu:24.04

RUN python3 bootstrap.py --server

# Gate on the queue law (headless, no GPU). Full suite runs bare-metal;
# parts of it needs GPU / live estate and is red mid-WIP.
RUN ctest --test-dir build -R '^test_queue$' --output-on-failure

# ---- Stage 2: Runtime ----
FROM ubuntu:24.04 AS runtime

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y libssl3 curl python3 python3-yaml \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/inference
COPY --from=builder /src/build/inference_cli /usr/local/bin/
COPY --from=builder /src/build/*.so /usr/local/lib/
COPY --from=builder /src/pipelines /opt/inference/pipelines
COPY --from=builder /src/plugins /opt/inference/plugins
COPY --from=builder /src/bootstrap.py /opt/inference/bootstrap.py

RUN mkdir -p /root/.cache/inference.cpp /root/.inference

EXPOSE 18090 18091

# The gateway boots exactly like bare metal: same binary, same catalog
ENTRYPOINT ["inference_cli"]
CMD ["serve", "--port", "18090", "--catalog-dir", "/opt/inference", "--plugin-dir", "/usr/local/lib"]
