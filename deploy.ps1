#!/usr/bin/env pwsh
# SunSwitch — One-command deploy script (Windows PowerShell)
# Usage: .\deploy.ps1 [-Env dev|prod] [-Region ap-south-1]
# Prerequisites: AWS CLI configured, AWS SAM CLI installed

param(
    [string]$Env = "dev",
    [string]$Region = "ap-south-1"
)

$ErrorActionPreference = "Stop"
$StackName = "sunswitch-$Env"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SunSwitch Deploy  |  env=$Env  |  region=$Region" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Ensure AWS CLI & SAM CLI are in PATH if installed in standard location
if (-not (Get-Command sam -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\Program Files\Amazon\AWSSAMCLI\bin") {
        $env:PATH = "$env:PATH;C:\Program Files\Amazon\AWSSAMCLI\bin"
    }
}
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\Program Files\Amazon\AWSCLIV2") {
        $env:PATH = "$env:PATH;C:\Program Files\Amazon\AWSCLIV2"
    }
}

# 1. Install Python deps check
Write-Host "[1/4] Checking Python..." -ForegroundColor Yellow
python --version

# 2. SAM build
Write-Host "[2/4] Building SAM application..." -ForegroundColor Yellow
sam build --template infra/template.yaml
if ($LASTEXITCODE -ne 0) { Write-Host "SAM build failed!" -ForegroundColor Red; exit 1 }

# 3. SAM deploy
Write-Host "[3/4] Deploying to AWS ($Region)..." -ForegroundColor Yellow
sam deploy `
    --template-file .aws-sam/build/template.yaml `
    --stack-name $StackName `
    --region $Region `
    --capabilities CAPABILITY_IAM `
    --no-confirm-changeset `
    --resolve-s3 `
    --parameter-overrides "Environment=$Env BedrockRegion=us-east-1"
if ($LASTEXITCODE -ne 0) { Write-Host "SAM deploy failed!" -ForegroundColor Red; exit 1 }

# 4. Get outputs
Write-Host "[4/4] Stack outputs:" -ForegroundColor Yellow
$outputs = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output table
Write-Host $outputs

# Extract API URL for frontend
$apiUrl = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='ApiBaseUrl'].OutputValue" `
    --output text

Write-Host ""
Write-Host "✅ Deploy complete!" -ForegroundColor Green
Write-Host ""
Write-Host "API Base URL: $apiUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Add VITE_API_BASE=$apiUrl to frontend/.env.local"
Write-Host "  2. cd frontend && npm run build"
Write-Host "  3. Deploy frontend/dist to AWS Amplify (see docs/deploy-amplify.md)"
Write-Host ""
Write-Host "💰 REMINDER: Set a billing alarm at https://console.aws.amazon.com/billing/home#/budgets"
Write-Host ""
