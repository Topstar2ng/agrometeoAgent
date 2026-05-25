@echo off
echo Building Tailwind CSS...
call npm run build:css

echo Copying files to deployment folder...
xcopy public\* ..\deploy\public\ /E /I /Y
xcopy server.js ..\deploy\ /Y
xcopy package.json ..\deploy\ /Y
xcopy .env ..\deploy\ /Y

echo Deployment ready!
pause