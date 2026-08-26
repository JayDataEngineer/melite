cmake_minimum_required(VERSION 3.20)
project(inference.cpp VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# ---------------------------------------------------------------------------
# Backend selection (matches ggml conventions)
# ---------------------------------------------------------------------------
option(INFERENCE_CUDA    "Enable CUDA backend"    OFF)
option(INFERENCE_VULKAN  "Enable Vulkan backend"  OFF)
option(INFERENCE_METAL   "Enable Metal backend"   OFF)
option(INFERENCE_HIP     "Enable HIP/ROCm backend" OFF)
option(INFERENCE_BUILD_TESTS "Build tests"        ON)
option(INFERENCE_BUILD_LLAMA_PLUGIN "Build llama.cpp plugin (requires llama.cpp)" OFF)
option(INFERENCE_BUILD_KIMODO_PLUGIN "Build kimodo.cpp plugin (requires kimodo.cpp)" OFF)
option(INFERENCE_BUILD_SAM3_PLUGIN "Build sam3.cpp plugin (requires sam3.cpp)" OFF)
option(INFERENCE_BUILD_TRELLIS2_PLUGIN "Build trellis2cpp plugin (requires trellis2cpp)" OFF)
option(INFERENCE_BUILD_SD_PLUGIN "Build sd.cpp plugin (requires stable-diffusion.cpp)" OFF)
option(INFERENCE_BUILD_AUDIO_PLUGIN "Build audio.cpp plugin (requires audio.cpp)" OFF)

# Auto-detect platform defaults
if(APPLE AND NOT INFERENCE_CUDA AND NOT INFERENCE_VULKAN AND NOT INFERENCE_HIP)
    set(INFERENCE_METAL ON)
endif()

# ---------------------------------------------------------------------------
# ggml (vendored submodule)
# ---------------------------------------------------------------------------
set(GGML_CUDA    ${INFERENCE_CUDA}    CACHE BOOL "" FORCE)
set(GGML_VULKAN  ${INFERENCE_VULKAN}  CACHE BOOL "" FORCE)
set(GGML_METAL   ${INFERENCE_METAL}   CACHE BOOL "" FORCE)
set(GGML_HIP     ${INFERENCE_HIP}     CACHE BOOL "" FORCE)
set(GGML_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(GGML_BUILD_TESTS    OFF CACHE BOOL "" FORCE)

add_subdirectory(ggml)

# ---------------------------------------------------------------------------
# FetchContent dependencies
# ---------------------------------------------------------------------------
include(FetchContent)
find_package(Threads REQUIRED)

FetchContent_Declare(
    httplib
    GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
    GIT_TAG        v0.15.3
    GIT_SHALLOW    TRUE
)

FetchContent_MakeAvailable(httplib)

# ---------------------------------------------------------------------------
# inference.cpp library
# ---------------------------------------------------------------------------
find_package(OpenSSL REQUIRED)

add_library(inference STATIC
    src/plugin.c
    src/vram.c
    src/dag.c
    src/runner.c
    src/catalog.c
    src/download.c
    src/server.cpp
    src/ws_server.c
)

target_include_directories(inference
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_link_libraries(inference
    PUBLIC
        ggml
        ggml-base
    PRIVATE
        httplib::httplib
        Threads::Threads
        OpenSSL::SSL
        OpenSSL::Crypto
)

target_compile_definitions(inference PRIVATE
    INFERENCE_VERSION="${PROJECT_VERSION}"
)

if(INFERENCE_CUDA)
    target_compile_definitions(inference PUBLIC INFERENCE_HAS_CUDA=1)
endif()
if(INFERENCE_VULKAN)
    target_compile_definitions(inference PUBLIC INFERENCE_HAS_VULKAN=1)
endif()
if(INFERENCE_METAL)
    target_compile_definitions(inference PUBLIC INFERENCE_HAS_METAL=1)
endif()

# ---------------------------------------------------------------------------
# CLI executable
# ---------------------------------------------------------------------------
add_executable(inference_cli src/main.c)
target_link_libraries(inference_cli PRIVATE inference)

# ---------------------------------------------------------------------------
# Echo plugin (proof-of-concept)
# ---------------------------------------------------------------------------
add_library(echo_plugin SHARED plugins/core/engines/echo/echo.c)
target_include_directories(echo_plugin PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include)
set_target_properties(echo_plugin PROPERTIES
    PREFIX ""
    POSITION_INDEPENDENT_CODE ON
)

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
if(INFERENCE_BUILD_TESTS)
    enable_testing()
    add_executable(test_dag tests/test_dag.c)
    target_link_libraries(test_dag PRIVATE inference)
    add_test(NAME test_dag COMMAND test_dag)

    add_executable(test_vram tests/test_vram.c)
    target_link_libraries(test_vram PRIVATE inference)
    add_test(NAME test_vram COMMAND test_vram)

    add_executable(test_plugin tests/test_plugin.c)
    target_link_libraries(test_plugin PRIVATE inference)
    target_link_libraries(test_plugin PRIVATE ${CMAKE_DL_LIBS})
    add_test(NAME test_plugin COMMAND test_plugin)

    add_executable(test_runner tests/test_runner.c)
    target_link_libraries(test_runner PRIVATE inference)
    target_link_libraries(test_runner PRIVATE ${CMAKE_DL_LIBS})
    add_test(NAME test_runner COMMAND test_runner)
endif()

# ---------------------------------------------------------------------------
# llama.cpp plugin (opt-in, fetches llama.cpp via FetchContent)
# ---------------------------------------------------------------------------
if(INFERENCE_BUILD_LLAMA_PLUGIN)
    message(STATUS "Building llama.cpp plugin — fetching llama.cpp...")
    FetchContent_Declare(
        llama_cpp
        GIT_REPOSITORY https://github.com/ggerganov/llama.cpp.git
        GIT_TAG        v0.3.0
        GIT_SHALLOW    TRUE
    )
    set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
    set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
    set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(llama_cpp)

    add_library(llama_plugin SHARED plugins/text/engines/llama/llama_plugin.c)
    target_include_directories(llama_plugin PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/include
        ${llama_cpp_SOURCE_DIR}/include
    )
    target_link_libraries(llama_plugin PRIVATE inference llama)
    set_target_properties(llama_plugin PROPERTIES
        PREFIX ""
        POSITION_INDEPENDENT_CODE ON
    )
endif()

# ---------------------------------------------------------------------------
# kimodo.cpp plugin (opt-in, fetches kimodo.cpp via FetchContent)
# ---------------------------------------------------------------------------
if(INFERENCE_BUILD_KIMODO_PLUGIN)
    message(STATUS "Building kimodo.cpp plugin — fetching kimodo.cpp...")
    FetchContent_Declare(
        kimodo_cpp
        GIT_REPOSITORY https://github.com/localai-org/kimodo.cpp.git
        GIT_TAG        main
        GIT_SHALLOW    TRUE
    )
    set(KIMODO_BUILD_TESTS OFF CACHE BOOL "" FORCE)
    set(KIMODO_BUILD_DEMO OFF CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(kimodo_cpp)

    add_library(kimodo_plugin SHARED plugins/motion/engines/kimodo/kimodo_plugin.c)
    target_include_directories(kimodo_plugin PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/include
        ${kimodo_cpp_SOURCE_DIR}/include
    )
    target_link_libraries(kimodo_plugin PRIVATE inference kimodo)
    set_target_properties(kimodo_plugin PROPERTIES
        PREFIX ""
        POSITION_INDEPENDENT_CODE ON
    )
endif()

# ---------------------------------------------------------------------------
# sam3.cpp plugin (opt-in, fetches sam3.cpp via FetchContent)
# ---------------------------------------------------------------------------
if(INFERENCE_BUILD_SAM3_PLUGIN)
    message(STATUS "Building sam3.cpp plugin — fetching sam3.cpp...")
    FetchContent_Declare(
        sam3_cpp
        GIT_REPOSITORY https://github.com/PABannier/sam3.cpp.git
        GIT_TAG        main
        GIT_SHALLOW    TRUE
    )
    set(SAM3_BUILD_TESTS OFF CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(sam3_cpp)

    add_library(sam3_plugin SHARED plugins/vision/engines/sam3/sam3_plugin.c)
    target_include_directories(sam3_plugin PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/include
        ${sam3_cpp_SOURCE_DIR}
    )
    target_link_libraries(sam3_plugin PRIVATE inference sam3)
    set_target_properties(sam3_plugin PROPERTIES
        PREFIX ""
        POSITION_INDEPENDENT_CODE ON
    )
endif()

# ---------------------------------------------------------------------------
# trellis2cpp plugin (opt-in, fetches trellis2cpp via FetchContent)
# ---------------------------------------------------------------------------
if(INFERENCE_BUILD_TRELLIS2_PLUGIN)
    message(STATUS "Building trellis2cpp plugin — fetching trellis2cpp...")
    FetchContent_Declare(
        trellis2_cpp
        GIT_REPOSITORY https://github.com/localai-org/trellis2cpp.git
        GIT_TAG        main
        GIT_SHALLOW    TRUE
    )
    set(TRELLIS2_BUILD_TESTS OFF CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(trellis2_cpp)

    add_library(trellis2_plugin SHARED plugins/3d/engines/trellis2/trellis2_plugin.c)
    target_include_directories(trellis2_plugin PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/include
        ${trellis2_cpp_SOURCE_DIR}
    )
    target_link_libraries(trellis2_plugin PRIVATE inference trellis2)
    set_target_properties(trellis2_plugin PROPERTIES
        PREFIX ""
        POSITION_INDEPENDENT_CODE ON
    )
endif()

# ---------------------------------------------------------------------------
# sd.cpp plugin (opt-in, fetches stable-diffusion.cpp via FetchContent)
# ---------------------------------------------------------------------------
if(INFERENCE_BUILD_SD_PLUGIN)
    message(STATUS "Building sd.cpp plugin — fetching stable-diffusion.cpp...")
    FetchContent_Declare(
        sd_cpp
        GIT_REPOSITORY https://github.com/leejet/stable-diffusion.cpp.git
        GIT_TAG        master
        GIT_SHALLOW    TRUE
    )
    set(SD_BUILD_TESTS OFF CACHE BOOL "" FORCE)
    set(SD_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(sd_cpp)

    add_library(sd_plugin SHARED plugins/image/engines/sd/sd_plugin.c)
    target_include_directories(sd_plugin PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/include
        ${sd_cpp_SOURCE_DIR}/include
    )
    target_link_libraries(sd_plugin PRIVATE inference stable-diffusion)
    set_target_properties(sd_plugin PROPERTIES
        PREFIX ""
        POSITION_INDEPENDENT_CODE ON
    )
endif()

# ---------------------------------------------------------------------------
# audio.cpp plugin (opt-in, subprocess wrapper — no library dependency)
# ---------------------------------------------------------------------------
if(INFERENCE_BUILD_AUDIO_PLUGIN)
    message(STATUS "Building audio.cpp plugin (subprocess wrapper)...")
    add_library(audio_plugin SHARED plugins/audio/engines/audio/audio_plugin.c)
    target_include_directories(audio_plugin PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include)
    set_target_properties(audio_plugin PROPERTIES
        PREFIX ""
        POSITION_INDEPENDENT_CODE ON
    )
endif()

# ---------------------------------------------------------------------------
# ComfyUI engine plugin (always built — ComfyUI as a managed engine, peer of the C-ABI plugins)
# ---------------------------------------------------------------------------
add_library(comfyui_plugin SHARED plugins/gens/engines/comfyui/comfyui_plugin.c)
target_include_directories(comfyui_plugin PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include)
set_target_properties(comfyui_plugin PROPERTIES
    PREFIX ""
    POSITION_INDEPENDENT_CODE ON
)

# ---------------------------------------------------------------------------
# Crop-stitch plugin (always built — crop, feather, alpha blend)
# ---------------------------------------------------------------------------
add_library(crop_stitch_plugin SHARED plugins/vision/engines/crop_stitch/crop_stitch_plugin.c)
target_include_directories(crop_stitch_plugin PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_link_libraries(crop_stitch_plugin PRIVATE m)
set_target_properties(crop_stitch_plugin PROPERTIES
    PREFIX ""
    POSITION_INDEPENDENT_CODE ON
)
