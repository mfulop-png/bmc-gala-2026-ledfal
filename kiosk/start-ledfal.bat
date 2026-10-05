@echo off
rem ============================================================================
rem  BMC Gala 2026 - LED fal inditasa kioszk modban (Windows 11 Home)
rem  A setup-windows-home.bat ezt a fajlt teszi az Automatikus inditasba.
rem  Kilepes (csak billentyuzettel): Alt+F4
rem ============================================================================

rem A LED fal cime - ha mashonnan fut (pl. Vercel elonezet), ird at:
set "LEDFAL_URL=https://bmc-gala-2026-ledfal.vercel.app/"

rem Kulon bongeszoprofil a kijelzonek: nincs "oldalak visszaallitasa" buborek, bovitmeny, mentett jelszo
set "PROFIL=%LOCALAPPDATA%\BMC-LedFal-Bongeszo"

rem Varunk a halozatra (bejelentkezes utan)
timeout /t 15 /nobreak >nul

rem Chrome, ha telepitve van; kulonben Microsoft Edge
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if exist "%CHROME%" (
  start "" "%CHROME%" --kiosk "%LEDFAL_URL%" --user-data-dir="%PROFIL%" ^
    --no-first-run --noerrdialogs --disable-pinch --overscroll-history-navigation=0 ^
    --disable-features=Translate,TouchpadOverscrollHistoryNavigation --disable-session-crashed-bubble ^
    --autoplay-policy=no-user-gesture-required
) else (
  start "" msedge --kiosk "%LEDFAL_URL%" --edge-kiosk-type=fullscreen --user-data-dir="%PROFIL%" ^
    --no-first-run --noerrdialogs --disable-pinch --overscroll-history-navigation=0
)
