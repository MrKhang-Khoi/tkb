@echo off
title Tat Bot Zalo
chcp 65001 > nul
cls
echo Dang tat tien trinh Bot Zalo chay ngam...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Bot Zalo*" >nul 2>&1
taskkill /F /FI "MODULES eq node.exe" >nul 2>&1
echo Da tat Bot Zalo thanh cong!
pause
