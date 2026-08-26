# ============================================================================
# inference.cpp — Makefile
# ============================================================================

BUILD_DIR    := build
BUILD_TYPE   ?= Release
INSTALL_DIR  ?= /usr/local
NPROC        := $(shell nproc 2>/dev/null || echo 4)

# Default target
.PHONY: all
all: build

# ---- Build ----

.PHONY: build
build:
	cmake -B $(BUILD_DIR) -DCMAKE_BUILD_TYPE=$(BUILD_TYPE) -DINFERENCE_BUILD_TESTS=ON
	cmake --build $(BUILD_DIR) -j$(NPROC)

.PHONY: build-cuda
build-cuda:
	cmake -B $(BUILD_DIR) -DCMAKE_BUILD_TYPE=$(BUILD_TYPE) -DINFERENCE_CUDA=ON -DINFERENCE_BUILD_TESTS=ON
	cmake --build $(BUILD_DIR) -j$(NPROC)

.PHONY: build-all-plugins
build-all-plugins:
	cmake -B $(BUILD_DIR) \
		-DCMAKE_BUILD_TYPE=$(BUILD_TYPE) \
		-DINFERENCE_BUILD_TESTS=ON \
		-DINFERENCE_BUILD_LLAMA_PLUGIN=ON
	cmake --build $(BUILD_DIR) -j$(NPROC)

# ---- Test ----

.PHONY: test
test: build
	cd $(BUILD_DIR) && LD_LIBRARY_PATH=. ctest --output-on-failure

# ---- Install ----

.PHONY: install
install: build
	cmake --install $(BUILD_DIR) --prefix $(INSTALL_DIR)

.PHONY: uninstall
uninstall:
	rm -f $(INSTALL_DIR)/bin/inference_cli
	rm -f $(INSTALL_DIR)/lib/libinference.a
	rm -f $(INSTALL_DIR)/lib/libecho_plugin.so
	rm -f $(INSTALL_DIR)/lib/libbridge_plugin.so

# ---- Docker ----

.PHONY: docker
docker:
	docker build -t inference-cpp .

.PHONY: docker-cuda
docker-cuda:
	docker build --build-arg CUDA=ON -t inference-cpp:cuda .

.PHONY: docker-run
docker-run: docker
	docker run -p 8080:8080 -p 8081:8081 inference-cpp

.PHONY: docker-run-cuda
docker-run-cuda: docker-cuda
	docker run --gpus all -p 8080:8080 -p 8081:8081 inference-cpp:cuda

.PHONY: compose-up
compose-up:
	docker compose up -d

.PHONY: compose-down
compose-down:
	docker compose down

.PHONY: compose-logs
compose-logs:
	docker compose logs -f

# ---- Clean ----

.PHONY: clean
clean:
	rm -rf $(BUILD_DIR)

# ---- Dev helpers ----

.PHONY: serve
serve: build
	cd $(BUILD_DIR) && LD_LIBRARY_PATH=. ./inference_cli serve --port 8080 --plugin-dir . --catalog-dir ..

.PHONY: run
run: build
	cd $(BUILD_DIR) && LD_LIBRARY_PATH=. ./inference_cli run ../examples/echo-chain.yaml --input data=42.0

.PHONY: lint
lint:
	clang-format -i src/*.c src/*.cpp include/inference/*.h plugins/**/*.c
	clang-tidy src/*.c src/*.cpp -- -Iinclude -std=c20

.PHONY: fmt
fmt:
	clang-format -i src/*.c src/*.cpp include/inference/*.h plugins/**/*.c

# ---- Help ----

.PHONY: help
help:
	@echo "inference.cpp build targets:"
	@echo ""
	@echo "  make              — Build (Release)"
	@echo "  make build        — Build (Release)"
	@echo "  make build-cuda   — Build with CUDA"
	@echo "  make test         — Build + run tests"
	@echo "  make install      — Install to $(INSTALL_DIR)"
	@echo "  make docker       — Build Docker image"
	@echo "  make docker-cuda  — Build CUDA Docker image"
	@echo "  make docker-run   — Run in Docker"
	@echo "  make compose-up   — Start with docker compose"
	@echo "  make serve        — Run dev server"
	@echo "  make clean        — Remove build dir"
	@echo "  make help         — This message"
