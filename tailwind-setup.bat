@echo off
echo Installing Tailwind CSS v3...
call npm uninstall tailwindcss postcss autoprefixer
call npm install -D tailwindcss@3 postcss@8 autoprefixer@10

echo Creating config files...
echo module.exports = { content: ["./public/**/*.{html,js}", "./*.html"], theme: { extend: {}, }, plugins: [], } > tailwind.config.js
echo module.exports = { plugins: { tailwindcss: {}, autoprefixer: {}, } } > postcss.config.js

echo Creating src folder and input.css...
if not exist src mkdir src
echo @tailwind base; > src\input.css
echo @tailwind components; >> src\input.css
echo @tailwind utilities; >> src\input.css

echo Building CSS...
if not exist public mkdir public
call npx tailwindcss -i ./src/input.css -o ./public/style.css --minify

echo Done! CSS file created at public/style.css
pause