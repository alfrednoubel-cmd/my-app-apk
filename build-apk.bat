@echo off
chcp 65001 > nul
echo ========================================================
echo   COMPILATION DE L'APK ANDROID - MON VTC GESTION
echo ========================================================
echo.
echo Vérification des dépendances...
call npx eas-cli --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installation de EAS CLI...
    call npm install -g eas-cli
)

echo.
echo Lancement du build APK (Profil Preview - APK autonome installable)...
echo.
call npx eas-cli build --platform android --profile preview

echo.
echo ========================================================
echo Si le build est terminé, téléchargez l'APK via le lien
echo ou le QR Code fourni par EAS Build.
echo ========================================================
pause
