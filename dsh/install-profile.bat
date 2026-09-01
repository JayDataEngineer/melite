@echo off
setlocal EnableExtensions
rem install-profile.bat -- install the inference.cpp DSH profile (Windows).
rem Mirrors dsh/install-profile.sh: renders dsh/profile/*.tmpl into
rem %DSH_HOME%\profiles\inference (default %USERPROFILE%\.dsh), installs
rem dependencies, prints the boot command. Idempotent.

set "REPO_ROOT=%~dp0.."
rem Normalize to absolute, forward slashes (link: paths + YAML want them)
for %%I in ("%REPO_ROOT%") do set "REPO_ROOT=%%~fI"
set "REPO_ROOT=%REPO_ROOT:\=/%"

if defined DSH_HOME (set "DST_DIR=%DSH_HOME%\profiles\inference") else set "DST_DIR=%USERPROFILE%\.dsh\profiles\inference"
set "DST_DIR_FWD=%DST_DIR:\=/%"
if not defined MELITE_GATEWAY set "MELITE_GATEWAY=http://localhost:33081"
set "SRC_DIR=%REPO_ROOT%/dsh/profile"

echo repo root   : %REPO_ROOT%
echo profile dir : %DST_DIR%
echo gateway     : %MELITE_GATEWAY%
echo.

rem Sanity: the host artifacts this profile mounts must exist.
for %%A in (
  "dsh/melite-tools/lib/index.mjs"
  "dsh/melite-card-view/lib/index.js"
  "dsh/infer-gallery/lib/index.js"
  "dsh/melite-hello/lib/index.mjs"
) do (
  if not exist "%REPO_ROOT%/%%~A" (
    echo ERROR: %%~A missing -- build it first ^(cd dsh\^<pkg^> ^&^& npm run build^) 1>&2
    exit /b 1
  )
)

if not exist "%DST_DIR%" mkdir "%DST_DIR%"

rem Render templates ({{REPO_ROOT}}, {{GATEWAY_URL}}).
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "(Get-Content -Raw '%SRC_DIR%/package.json.tmpl') -replace '\{\{REPO_ROOT\}\}','%REPO_ROOT%' -replace '\{\{GATEWAY_URL\}\}','%MELITE_GATEWAY%' | Set-Content -NoNewline '%DST_DIR%\package.json'"
if errorlevel 1 goto :fail
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "(Get-Content -Raw '%SRC_DIR%/cordis.patch.yml.tmpl') -replace '\{\{REPO_ROOT\}\}','%REPO_ROOT%' -replace '\{\{GATEWAY_URL\}\}','%MELITE_GATEWAY%' | Set-Content -NoNewline '%DST_DIR%\cordis.patch.yml'"
if errorlevel 1 goto :fail
copy /Y "%SRC_DIR%\pnpm-workspace.yaml" "%DST_DIR%\pnpm-workspace.yaml" >nul
rem The root config the loader anchors on (dsh rewrites it on boot).
echo # rendered by install-profile.bat> "%DST_DIR%\cordis.yml"
echo []>> "%DST_DIR%\cordis.yml"

echo rendered:
echo   %DST_DIR%\package.json
echo   %DST_DIR%\cordis.patch.yml
echo.

rem Install the Inference Studio agent preset (the dropdown entry).
if defined DSH_HOME (set "PRESET_DST=%DSH_HOME%\.agent-presets\inference-studio") else set "PRESET_DST=%USERPROFILE%\.dsh\.agent-presets\inference-studio"
if not exist "%PRESET_DST%" mkdir "%PRESET_DST%"
copy /Y "%REPO_ROOT%/dsh/inference-studio/preset.yml" "%PRESET_DST%\preset.yml" >nul
copy /Y "%REPO_ROOT%/dsh/inference-studio/agent.cordis.yml" "%PRESET_DST%\agent.cordis.yml" >nul
echo preset installed:
echo   %PRESET_DST%\preset.yml
echo   %PRESET_DST%\agent.cordis.yml
echo.

where pnpm >nul 2>nul
if errorlevel 1 (
  echo WARNING: pnpm not found -- install it, then run: cd /d "%DST_DIR%" ^&^& pnpm install 1>&2
  goto :done
)

echo installing dependencies with pnpm ...
pushd "%DST_DIR%"
call pnpm install
if errorlevel 1 (popd & goto :fail)
popd

:done
echo.
echo done. boot with:
echo   dsh web --profile inference --port 3081
echo then start a session with any agent preset -- the inference tools are there.
exit /b 0

:fail
echo install failed 1>&2
exit /b 1
