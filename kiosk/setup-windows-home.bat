@echo off
rem ============================================================================
rem  BMC Gala 2026 - LED fal: Windows 11 Home kioszk-beallitas
rem  Futtatas: jobb klikk -> "Futtatas rendszergazdakent". Utana UJRAINDITAS.
rem  Visszaallitas: setup-windows-home.bat /undo (szinten rendszergazdakent)
rem ============================================================================
net session >nul 2>&1
if errorlevel 1 (
  echo.
  echo  HIBA: rendszergazdakent kell futtatni ^(jobb klikk -^> Futtatas rendszergazdakent^).
  echo.
  pause
  exit /b 1
)

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

if /i "%~1"=="/undo" goto undo

echo [1/4] Kepernyo szelerol behuzott gesztusok tiltasa (ertesitesi kozpont, widgetek, feladatvalto)...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\EdgeUI" /v AllowEdgeSwipe /t REG_DWORD /d 0 /f >nul

echo [2/4] Kepernyo, alvas es hibernalas kikapcsolasa halozati tapon...
powercfg /change monitor-timeout-ac 0
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0

echo [3/4] LED fal automatikus inditasa bejelentkezeskor...
copy /y "%~dp0start-ledfal.bat" "%STARTUP%\BMC-LedFal.bat" >nul

echo [4/4] Kesz.
echo.
echo  Meg KEZZEL allitsd be (Gephaz), lasd KIOSZK.md:
echo   - Bluetooth es eszkozok ^> Erintes: Harom- es negyujjas erintesi kezmozdulatok = KI
echo   - Ido es nyelv ^> Gepeles ^> Erintobillentyuzet: automatikus megjelenites = KI
echo   - Rendszer ^> Ertesitesek: Ne zavarjanak = BE
echo   - Windows Update: frissitesek szuneteltetese a gala utanig
echo   - Automatikus bejelentkezes ^(lasd KIOSZK.md^)
echo.
echo  Ezutan inditsd UJRA a gepet.
pause
exit /b 0

:undo
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\EdgeUI" /v AllowEdgeSwipe /f >nul 2>&1
del "%STARTUP%\BMC-LedFal.bat" >nul 2>&1
echo  Visszaallitva: szele-gesztusok engedelyezve, automatikus inditas torolve. Inditsd ujra a gepet.
pause
