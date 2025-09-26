# archive_old_migrations.ps1
# Moves all .sql migration files into an archived/ folder except the consolidated migration
param(
    [string]$MigrationsDir = "supabase/migrations",
    [string]$KeepFile = "20250920120000_consolidated_schema.sql"
)

$absDir = Join-Path -Path (Split-Path -Parent $PSScriptRoot) -ChildPath "..\$MigrationsDir"
$absDir = Resolve-Path -Path $absDir
$archivedDir = Join-Path -Path $absDir -ChildPath "archived"

if (-not (Test-Path -Path $archivedDir)) {
    New-Item -ItemType Directory -Path $archivedDir | Out-Null
}

Get-ChildItem -Path $absDir -Filter "*.sql" -File | Where-Object { $_.Name -ne $KeepFile } | ForEach-Object {
    $dest = Join-Path -Path $archivedDir -ChildPath $_.Name
    Write-Host "Archiving $($_.FullName) -> $dest"
    Move-Item -Path $_.FullName -Destination $dest -Force
}

Write-Host "Archive complete. Kept: $KeepFile"
