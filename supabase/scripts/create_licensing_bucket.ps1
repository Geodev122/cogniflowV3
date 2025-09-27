# PowerShell script to create a Supabase Storage bucket named 'licensing'
# Requires the Supabase CLI to be installed and authenticated
# Usage: .\create_licensing_bucket.ps1 --public true
param(
  [switch]$public
)

if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Host "Supabase CLI not found. Install from https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
  exit 1
}

$visibility = if ($public) { 'public' } else { 'private' }
Write-Host "Creating bucket 'licensing' with visibility: $visibility"

# Supabase CLI currently doesn't have a direct "create bucket" command in all versions; use the REST API with a service role key as fallback.
# Preferred: supabase storage create licensing --public (if available)
try {
  supabase storage create licensing --public:($public.IsPresent) | Out-Null
  Write-Host "Bucket creation attempted via supabase CLI (may be a no-op depending on CLI version)."
} catch {
  Write-Host "Supabase CLI create failed or not supported; attempting REST API fallback."
  $serviceRole = Read-Host -Prompt 'Paste your SUPABASE_SERVICE_ROLE_KEY (will be hidden)' -AsSecureString
  $srKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($serviceRole))
  if (-not $srKey) { Write-Host "No key provided"; exit 1 }
  $projectUrl = Read-Host -Prompt 'Enter your Supabase project URL (e.g. https://xyzcompany.supabase.co)'
  $body = @{
    id = 'licensing'
    public = $public.IsPresent
  } | ConvertTo-Json
  $resp = Invoke-RestMethod -Method Post -Uri "$projectUrl/storage/v1/bucket" -Headers @{ "apiKey" = $srKey; "Authorization" = "Bearer $srKey" } -ContentType 'application/json' -Body $body
  Write-Host "REST API response:`n$($resp | ConvertTo-Json -Depth 5)"
}

Write-Host "Done. If the bucket exists already this operation is idempotent." -ForegroundColor Green
