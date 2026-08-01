1) Extract the folder jeebo-upgrade-v2 inside your jeebo-store project.
2) Open PowerShell in jeebo-store.
3) Run:
powershell -ExecutionPolicy Bypass -File .\jeebo-upgrade-v2\run-upgrade.ps1

The script backs up the project, creates R2, upgrades D1, builds, pushes Git, and deploys.
