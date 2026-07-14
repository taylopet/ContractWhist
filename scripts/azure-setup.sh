#!/usr/bin/env bash
# KAN-76: One-time Azure provisioning script for Contract Whist
# Run once to create all resources. Safe to re-run (idempotent where possible).
#
# Prerequisites:
#   az login
#   az account set --subscription e5f99bc8-ff87-4870-8e46-8b215c2e0ac6
#
# After this script:
#   1. Download the App Service publish profile from the Azure portal
#      (App Service → Deployment Center → Manage publish profile → Download)
#   2. Add it as a GitHub Actions secret named AZURE_WEBAPP_PUBLISH_PROFILE
#   3. Push to main to trigger the first deploy

set -euo pipefail

SUBSCRIPTION="e5f99bc8-ff87-4870-8e46-8b215c2e0ac6"
RESOURCE_GROUP="rg-tixo-prod"
LOCATION="westeurope"
APP_PLAN="asp-tixo-prod"
APP_NAME="app-contractwhist-prod"
REDIS_NAME="redis-tixo-prod"
DNS_ZONE="tixo.com"
# DNS zone is in a separate resource group
DNS_RG="cloud-shell-storage-eastus"

echo "==> Setting subscription"
az account set --subscription "$SUBSCRIPTION"

echo "==> Creating resource group"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

echo "==> Creating App Service Plan (B1 Linux)"
az appservice plan create \
  --name "$APP_PLAN" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku B1 \
  --is-linux \
  --output none

echo "==> Creating App Service (Node.js 22)"
az webapp create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_PLAN" \
  --runtime "NODE:22-lts" \
  --output none

echo "==> Setting startup command"
az webapp config set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --startup-file "node server.js" \
  --output none

echo "==> Enforcing HTTPS"
az webapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --https-only true \
  --output none

echo "==> Creating Azure Cache for Redis (Basic C0)"
az redis create \
  --name "$REDIS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Basic \
  --vm-size c0 \
  --output none

echo "==> Waiting for Redis to be ready (this takes ~10 minutes)..."
az redis wait \
  --name "$REDIS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --created

echo "==> Fetching Redis connection details"
REDIS_HOST=$(az redis show \
  --name "$REDIS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query hostName -o tsv)

REDIS_KEY=$(az redis list-keys \
  --name "$REDIS_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query primaryKey -o tsv)

REDIS_URL="rediss://:${REDIS_KEY}@${REDIS_HOST}:6380"

echo "==> Configuring App Service environment variables"
az webapp config appsettings set \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    REDIS_URL="$REDIS_URL" \
    NODE_ENV="production" \
    NEXT_TELEMETRY_DISABLED="1" \
  --output none

echo "==> Getting App Service default hostname"
APP_HOST=$(az webapp show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query defaultHostName -o tsv)
echo "    Default URL: https://${APP_HOST}"

echo ""
echo "==> Configuring custom domain: ${DNS_ZONE}"
echo "    Getting domain verification ID..."
VERIFY_ID=$(az webapp show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query customDomainVerificationId -o tsv)

echo "    Creating DNS TXT record for domain verification"
az network dns record-set txt add-record \
  --resource-group "$DNS_RG" \
  --zone-name "$DNS_ZONE" \
  --record-set-name "asuid" \
  --value "$VERIFY_ID" \
  --output none 2>/dev/null || echo "    (TXT record may already exist — skipping)"

echo "    Creating DNS A record @ → App Service"
APP_IP=$(az webapp show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query outboundIpAddresses -o tsv | tr ',' '\n' | head -1)

az network dns record-set a add-record \
  --resource-group "$DNS_RG" \
  --zone-name "$DNS_ZONE" \
  --record-set-name "@" \
  --ipv4-address "$APP_IP" \
  --output none 2>/dev/null || echo "    (A record may already exist — skipping)"

echo "    Binding custom domain to App Service"
az webapp config hostname add \
  --webapp-name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --hostname "$DNS_ZONE" \
  --output none

echo "    Creating managed TLS certificate (free)"
az webapp config ssl create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --hostname "$DNS_ZONE" \
  --output none

CERT_THUMB=$(az webapp config ssl list \
  --resource-group "$RESOURCE_GROUP" \
  --query "[?subjectName=='${DNS_ZONE}'].thumbprint" -o tsv)

echo "    Binding TLS certificate"
az webapp config ssl bind \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --certificate-thumbprint "$CERT_THUMB" \
  --ssl-type SNI \
  --output none

echo ""
echo "======================================================"
echo " Setup complete!"
echo "======================================================"
echo ""
echo " App Service:   https://${APP_HOST}"
echo " Custom domain: https://${DNS_ZONE}/fun/  (once DNS propagates)"
echo ""
echo " Next steps:"
echo "   1. In Azure portal → App Service '${APP_NAME}'"
echo "      → Deployment Center → Manage publish profile → Download"
echo "   2. Add the file contents as GitHub secret AZURE_WEBAPP_PUBLISH_PROFILE"
echo "   3. Push to main — GitHub Actions will build and deploy"
echo ""
echo " Note: tixo.com A record points to ${APP_IP}."
echo "       If you later add Azure Front Door for other services,"
echo "       update the A record to point to the Front Door endpoint instead."
echo "======================================================"
