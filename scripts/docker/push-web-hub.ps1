param(
  [string]$Builder = $env:DOCKER_BUILDX_BUILDER,
  [string]$Image = $env:THE_COPY_WEB_IMAGE_REPOSITORY,
  [string]$Tag = $env:THE_COPY_WEB_TAG
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Builder)) {
  $Builder = "cloud-mohamedaminrad-thecopy"
}

if ([string]::IsNullOrWhiteSpace($Image)) {
  $Image = "docker.io/mohamedaminrad/the-copy-web"
}

if ([string]::IsNullOrWhiteSpace($env:TIPTAP_PRO_TOKEN)) {
  throw "TIPTAP_PRO_TOKEN is required for the web image build."
}

$shortSha = (git rev-parse --short=12 HEAD).Trim()
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
$branchTag = $branch -replace "[^A-Za-z0-9_.-]", "-"
$timeTag = "manual-{0}" -f (Get-Date -Format "yyyyMMdd-HHmmss")

$tags = @()

if (-not [string]::IsNullOrWhiteSpace($Tag)) {
  $tags += $Tag
} else {
  $tags += $branchTag
}

$tags += "sha-$shortSha"
$tags += $timeTag

$tagArgs = @()
foreach ($item in ($tags | Select-Object -Unique)) {
  $tagArgs += @("--tag", "${Image}:$item")
}

Write-Host "Builder: $Builder"
Write-Host "Image: $Image"
Write-Host "Tags: $($tags -join ', ')"

docker buildx build `
  --builder $Builder `
  --secret id=tiptap_pro_token,env=TIPTAP_PRO_TOKEN `
  --file apps/web/Dockerfile `
  @tagArgs `
  --push `
  --progress=plain `
  .
