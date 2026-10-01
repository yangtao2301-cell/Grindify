param(
    [string]$SourceRoot = (Join-Path $PSScriptRoot '../..'),
    [Parameter(Mandatory = $true)][string]$ApiUrl,
    [string]$EnvironmentFile = (Join-Path $PSScriptRoot '../../.env'),
    [string]$OutputDirectory = (Join-Path $PSScriptRoot '../../.deploy/images'),
    [string]$ImageNamespace = 'ghcr.io/yangtao2301-cell',
    [string]$AptMirror = 'deb.debian.org',
    [string]$Tag
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Docker {
    param([string[]]$Arguments)
    & docker @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "docker $($Arguments[0]) failed with exit code $LASTEXITCODE"
    }
}

$SourceRoot = (Resolve-Path -LiteralPath $SourceRoot).Path
$EnvironmentFile = (Resolve-Path -LiteralPath $EnvironmentFile).Path
$ImageNamespace = $ImageNamespace.TrimEnd('/')

if ($ApiUrl -notmatch '^https?://') {
    throw 'ApiUrl must be an absolute HTTP(S) URL.'
}

$fullSha = (& git -C $SourceRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'SourceRoot must be a Git checkout.' }
$dirty = & git -C $SourceRoot status --porcelain --untracked-files=normal
if ($LASTEXITCODE -ne 0) { throw 'Could not inspect source checkout.' }
if ($dirty) { throw 'Source checkout has uncommitted files; use a clean commit or worktree.' }
if (-not $Tag) { $Tag = $fullSha.Substring(0, 7) }
if ($Tag -notmatch '^[0-9a-f]{7,40}$' -or -not $fullSha.StartsWith($Tag)) {
    throw 'Tag must be a 7–40 character prefix of the source commit SHA.'
}

$publicValues = @{}
foreach ($line in Get-Content -LiteralPath $EnvironmentFile) {
    if ($line -match '^\s*(VITE_(?:CONTACT_EMAIL|OPERATOR_NAME|OPERATOR_ADDRESS|OPERATOR_CITY|OPERATOR_COUNTRY|OPERATOR_PHONE))\s*=\s*(.*)$') {
        $value = $Matches[2].Trim()
        if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $publicValues[$Matches[1]] = $value
    }
}

$version = (Get-Content -LiteralPath (Join-Path $SourceRoot 'frontend/package.json') -Raw | ConvertFrom-Json).version
$builtAt = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
$apiImage = "$ImageNamespace/grindify-api:$Tag"
$frontendImage = "$ImageNamespace/grindify-frontend:$Tag"
$adminImage = "$ImageNamespace/grindify-adminpanel:$Tag"

$apiArgs = @('build', '--platform', 'linux/amd64', '--target', 'production', '--build-arg', "APT_MIRROR=$AptMirror", '-f', (Join-Path $SourceRoot 'Dockerfile.api'), '-t', $apiImage, $SourceRoot)
Invoke-Docker $apiArgs

$frontendArgs = @('build', '--platform', 'linux/amd64', '--target', 'production', '-f', (Join-Path $SourceRoot 'Dockerfile.frontend'), '-t', $frontendImage,
    '--build-arg', "VITE_API_URL=$ApiUrl", '--build-arg', 'FRONTEND_BUILD_SCRIPT=build-only', '--build-arg', 'NODE_OPTIONS=--max-old-space-size=1024',
    '--build-arg', "VERSION=$version", '--build-arg', "GIT_SHA=$fullSha", '--build-arg', "BUILD_TIME=$builtAt", '--build-arg', 'CHANNEL=production')
foreach ($key in ($publicValues.Keys | Sort-Object)) {
    $frontendArgs += @('--build-arg', "$key=$($publicValues[$key])")
}
$frontendArgs += $SourceRoot
Invoke-Docker $frontendArgs

$adminArgs = @('build', '--platform', 'linux/amd64', '--target', 'production', '-f', (Join-Path $SourceRoot 'Dockerfile.adminpanel'), '-t', $adminImage,
    '--build-arg', "VITE_API_URL=$ApiUrl", '--build-arg', 'ADMIN_BASE_PATH=/admin/', $SourceRoot)
Invoke-Docker $adminArgs

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$OutputDirectory = (Resolve-Path -LiteralPath $OutputDirectory).Path
$archive = Join-Path $OutputDirectory "grindify-images-$Tag.tar"
if (Test-Path -LiteralPath $archive) { throw "Archive already exists: $archive" }
$partialArchive = "$archive.partial"
try {
    Invoke-Docker @('save', '-o', $partialArchive, $apiImage, $frontendImage, $adminImage)
    Move-Item -LiteralPath $partialArchive -Destination $archive
} finally {
    if (Test-Path -LiteralPath $partialArchive) { Remove-Item -LiteralPath $partialArchive }
}

$checksum = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant()
$checksumPath = "$archive.sha256"
[System.IO.File]::WriteAllText($checksumPath, "$checksum  $(Split-Path -Leaf $archive)`n")
Write-Output "Archive: $archive"
Write-Output "Checksum: $checksumPath"
Write-Output "Version: $Tag ($fullSha)"
