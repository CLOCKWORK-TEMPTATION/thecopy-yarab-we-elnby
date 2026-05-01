param(
  [string]$Builder = $env:DOCKER_BUILDX_BUILDER,
  [string]$Namespace = $env:THE_COPY_IMAGE_NAMESPACE,
  [string]$Tag = $env:THE_COPY_IMAGE_TAG,
  [switch]$PlanOnly
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Builder)) {
  $Builder = "cloud-mohamedaminrad-thecopy"
}

if ([string]::IsNullOrWhiteSpace($Namespace)) {
  $Namespace = "docker.io/mohamedaminrad"
}

$shortSha = (git rev-parse --short=12 HEAD).Trim()
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
$branchTag = $branch -replace "[^A-Za-z0-9_.-]", "-"
$timeTag = "manual-{0}" -f (Get-Date -Format "yyyyMMdd-HHmmss")

$tags = @()

if (-not [string]::IsNullOrWhiteSpace($Tag)) {
  $tags += $Tag
} else {
  $tags += "codex-e2e-production-readiness"
  $tags += $branchTag
}

$tags += "sha-$shortSha"
$tags += $timeTag
$tags = $tags | Select-Object -Unique

$images = @(
  @{
    Name = "web"
    Repository = if ($env:THE_COPY_WEB_IMAGE_REPOSITORY) { $env:THE_COPY_WEB_IMAGE_REPOSITORY } else { "$Namespace/the-copy-web" }
    Dockerfile = "apps/web/Dockerfile"
    Context = "."
    RequiresTiptapSecret = $true
  },
  @{
    Name = "backend"
    Repository = if ($env:THE_COPY_BACKEND_IMAGE_REPOSITORY) { $env:THE_COPY_BACKEND_IMAGE_REPOSITORY } else { "$Namespace/the-copy-backend" }
    Dockerfile = "apps/backend/Dockerfile"
    Context = "."
    RequiresTiptapSecret = $false
  },
  @{
    Name = "postgres"
    Repository = if ($env:THE_COPY_POSTGRES_IMAGE_REPOSITORY) { $env:THE_COPY_POSTGRES_IMAGE_REPOSITORY } else { "$Namespace/the-copy-postgres" }
    Dockerfile = "docker/postgres/Dockerfile"
    Context = "docker/postgres"
    RequiresTiptapSecret = $false
  },
  @{
    Name = "redis"
    Repository = if ($env:THE_COPY_REDIS_IMAGE_REPOSITORY) { $env:THE_COPY_REDIS_IMAGE_REPOSITORY } else { "$Namespace/the-copy-redis" }
    Dockerfile = "docker/redis/Dockerfile"
    Context = "docker/redis"
    RequiresTiptapSecret = $false
  },
  @{
    Name = "weaviate"
    Repository = if ($env:THE_COPY_WEAVIATE_IMAGE_REPOSITORY) { $env:THE_COPY_WEAVIATE_IMAGE_REPOSITORY } else { "$Namespace/the-copy-weaviate" }
    Dockerfile = "docker/weaviate/Dockerfile"
    Context = "docker/weaviate"
    RequiresTiptapSecret = $false
  }
)

Write-Host "Builder: $Builder"
Write-Host "Tags: $($tags -join ', ')"

foreach ($image in $images) {
  Write-Host ""
  Write-Host "Image: $($image.Name)"
  Write-Host "Repository: $($image.Repository)"
  Write-Host "Dockerfile: $($image.Dockerfile)"
  Write-Host "Context: $($image.Context)"

  if ($PlanOnly) {
    continue
  }

  $tagArgs = @()
  foreach ($item in $tags) {
    $tagArgs += @("--tag", "$($image.Repository):$item")
  }

  $secretArgs = @()
  if ($image.RequiresTiptapSecret) {
    if ([string]::IsNullOrWhiteSpace($env:TIPTAP_PRO_TOKEN)) {
      throw "TIPTAP_PRO_TOKEN is required for the web image build."
    }

    $secretArgs += @("--secret", "id=tiptap_pro_token,env=TIPTAP_PRO_TOKEN")
  }

  docker buildx build `
    --builder $Builder `
    --file $image.Dockerfile `
    --pull `
    @secretArgs `
    @tagArgs `
    --push `
    --progress=plain `
    $image.Context
}
