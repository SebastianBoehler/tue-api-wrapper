#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 4 ]]; then
  echo "Usage: $0 <gcp-project> <region> <image> <portal-api-base-url> [service-name]"
  exit 1
fi

PROJECT_ID="$1"
REGION="$2"
IMAGE="$3"
PORTAL_API_BASE_URL="$4"
SERVICE_NAME="${5:-tue-study-hub-chatgpt}"
DEPLOY_JSON="/tmp/${SERVICE_NAME}-cloudrun-deploy.json"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

gcloud builds submit "${APP_DIR}" \
  --project "${PROJECT_ID}" \
  --config "${APP_DIR}/cloudbuild.yaml" \
  --substitutions "_IMAGE=${IMAGE}"

gcloud run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --image "${IMAGE}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "PORTAL_API_BASE_URL=${PORTAL_API_BASE_URL}" \
  --format json >"${DEPLOY_JSON}"

SERVICE_URL="$(DEPLOY_JSON="${DEPLOY_JSON}" python - <<'PY'
import json
import os
from pathlib import Path

data = json.loads(Path(os.environ["DEPLOY_JSON"]).read_text())
print(data["status"]["url"])
PY
)"

gcloud run services update "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --update-env-vars "APP_BASE_URL=${SERVICE_URL}"

echo "Cloud Run service deployed."
echo "Service URL: ${SERVICE_URL}"
echo "MCP endpoint: ${SERVICE_URL}/mcp"
