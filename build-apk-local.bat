@echo off
chcp 65001 > nul
echo ========================================================
echo   COMPILATION LOCALE DE L'APK (GRADLE) - MON VTC GESTION
echo ========================================================
echo.
echo Étape 1 : Génération du projet natif Android...
call npx expo prebuild --platform android --clean

if %errorlevel% neq 0 (
    echo Erreur lors de la génération du projet natif.
    pause
    exit /b %errorlevel%
)

echo.
echo Étape 2 : Compilation du fichier APK Release...
cd android
call gradlew.bat assembleRelease

if %errorlevel% neq 0 (
    echo Erreur lors de la compilation Gradle.
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo SUCCÈS ! Votre fichier APK installable se trouve dans :
echo android\app\build\outputs\apk\release\app-release.apk
echo ========================================================
pause
