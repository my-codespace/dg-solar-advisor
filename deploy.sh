#!/usr/bin/env bash
# SunSwitch — One-command deploy script (Linux/macOS)
# Usage: ./deploy.sh [dev|prod] [region]
# Prerequisites: AWS CLI configured, AWS SAM CLI installed

set -e

ENV="${1:-dev}"
REGION="${2:-ap-south-1}"
STACK_NAME="sunswitch-${ENV}"

echo ""
echo "============================================"
echo "  SunSwitch Deploy  |  env=${ENV}  |  region=${REGION}"
echo "============================================"
echo ""

echo "[1/4] Building SAM application..."
sam build --template infra/template.yaml --base-dir . --use-container false

echo "[2/4] Deploying to AWS (${REGION})..."
sam deploy \
    --template infra/template.yaml \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --capabilities CAPABILITY_IAM \
    --no-confirm-changeset \
    --resolve-s3 \
    --parameter-overrides "Environment=${ENV} BedrockRegion=us-east-1"

echo "[3/4] Stack outputs:"
aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --query "Stacks[0].Outputs" \
    --output table

API_URL=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --query "Stacks[0].Outputs[?OutputKey=='ApiBaseUrl'].OutputValue" \
    --output text)

echo ""
echo "✅ Deploy complete!"
echo ""
echo "API Base URL: ${API_URL}"
echo ""
echo "Next steps:"
echo "  1. echo 'VITE_API_BASE=${API_URL}' > frontend/.env.local"
echo "  2. cd frontend && npm run build"
echo "  3. Deploy frontend/dist to AWS Amplify"
echo ""
echo "💰 REMINDER: Set a billing alarm at https://console.aws.amazon.com/billing/home#/budgets"
