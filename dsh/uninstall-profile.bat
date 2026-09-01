@echo off
setlocal EnableExtensions
rem uninstall-profile.bat -- remove the inference.cpp DSH profile (Windows).

if defined DSH_HOME (set "DST_DIR=%DSH_HOME%\profiles\inference") else set "DST_DIR=%USERPROFILE%\.dsh\profiles\inference"

if exist "%DST_DIR%" (
  rmdir /S /Q "%DST_DIR%"
  echo removed %DST_DIR%
) else (
  echo nothing to remove (%DST_DIR% not found)
)
exit /b 0
