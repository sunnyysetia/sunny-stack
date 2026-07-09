#!/usr/bin/env bash
# Upload apps/api/.env.prod -> the S3 env bucket the ECS task reads at start,
# then force a new ECS deployment so the running service picks up the new env
# on its next task start. ECS reads the env file ONCE at task start; in-flight
# tasks never re-read it, so an upload alone changes nothing until a new task
# rolls. `.env.prod` is gitignored — create it from `.env.example` with real
# production values (it holds secrets; never commit it).
#
# Pass --no-redeploy to upload without bouncing the service (stage an edit now,
# deploy later).
#
# Run from anywhere; paths resolve relative to apps/api/.
#
# TEMPLATE: fill in the REPLACE_* values (or export them as env vars) to match
# the AWS resources referenced by .github/workflows/deploy-api.yml.

set -euo pipefail

cd "$(dirname "$0")/.."

AWS_REGION="${AWS_REGION:-REPLACE_AWS_REGION}"
ENV_S3_URI="${ENV_S3_URI:-s3://REPLACE_ENV_BUCKET/api.env}"
ECS_CLUSTER="${ECS_CLUSTER:-REPLACE_ECS_CLUSTER}"
ECS_SERVICE="${ECS_SERVICE:-REPLACE_ECS_SERVICE}"

if [ ! -f .env.prod ]; then
  echo "apps/api/.env.prod not found — create it from .env.example with prod values" >&2
  exit 1
fi

echo "Uploading apps/api/.env.prod -> ${ENV_S3_URI}"
aws s3 cp .env.prod "${ENV_S3_URI}" --region "${AWS_REGION}"

if [ "${1:-}" = "--no-redeploy" ]; then
  echo "Skipped redeploy. New env applies on the next task start (force a deploy or wait for one)."
  exit 0
fi

echo "Forcing new ECS deployment"
aws ecs update-service \
  --cluster "${ECS_CLUSTER}" \
  --service "${ECS_SERVICE}" \
  --region "${AWS_REGION}" \
  --force-new-deployment \
  --no-cli-pager >/dev/null

echo "Deployment kicked off. Watch:"
echo "  aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE} --region ${AWS_REGION} --query 'services[0].deployments'"
