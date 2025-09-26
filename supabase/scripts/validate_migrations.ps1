# validate_migrations.ps1
# Runs the consolidated migration against a staging database and performs basic checks.
param(
    [string]$StagingDbUrl
)

if (-not $StagingDbUrl) {
    Write-Error "Provide a staging DB connection string in the form: postgresql://user:pass@host:port/dbname"
    exit 2
}

# Temp file to download migration
$repoRoot = Resolve-Path -Path "$PSScriptRoot\..\.."
$migration = Join-Path -Path $repoRoot -ChildPath "supabase/migrations/20250920120000_consolidated_schema.sql"

# Run migration using psql (requires psql in PATH)
Write-Host "Running consolidated migration against: $StagingDbUrl"
$env:PGPASSWORD = (Get-Item -Path ("env:PGPASSWORD") -ErrorAction SilentlyContinue).Value
# psql requires separate env vars for host/user/db or a full connection string with -d
psql -d $StagingDbUrl -f $migration
if ($LASTEXITCODE -ne 0) {
    Write-Error "psql failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

# Basic sanity checks
Write-Host "Running basic sanity checks..."
psql -d $StagingDbUrl -c "\d public.profiles"
psql -d $StagingDbUrl -c "SELECT count(*) FROM public.profiles;"

Write-Host "Validation complete. Review the outputs for errors."
