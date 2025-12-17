@echo off
echo Starting Blog API Backend...
cd /d %~dp0
call venv\Scripts\activate.bat
python main.py
pause
