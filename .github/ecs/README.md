# ECS task definitions

Source of truth for the `api-task` and `api-migrate-task` ECS
task-definition shapes. The sibling deploy workflow
(`../workflows/deploy-api.yml`) reads these files, rewrites the
container `image` to the SHA-tagged build, registers a new revision,
and updates the service.

> **Template note.** Every `REPLACE_*` value (account id, region, IAM role
> names, env-bucket, log-group family) is a placeholder. Fill them in — plus
> the `env:` block in `deploy-api.yml` — once the AWS resources exist. Until
> then the deploy workflow is inert.

`image: "REPLACED_AT_DEPLOY_TIME"` is a sentinel — `amazon-ecs-render-task-definition`
overwrites it with the freshly-built ECR image. Any other value would
work; this one just makes the intent obvious in code review.

## Editing

Edit the JSON, commit. The next deploy picks it up — the workflow
never "reads back" from AWS, so live AWS revisions are a function of
what's in git.

Changes to inspect carefully before merging:

- `stopTimeout` — must be ≥ the pg-boss `boss.stop` graceful timeout + headroom
  for the rest of Nest's shutdown. See `apps/api/src/core/queue/queue.module.ts`.
- `executionRoleArn` / `taskRoleArn` — IAM permissions; account-scoped.
- `environmentFiles` — env-var source (`s3://REPLACE_ENV_BUCKET/api.env`).
- `cpu` / `memory` — Fargate sizing.
- `logConfiguration.options.awslogs-group` — log-group name (must exist in CloudWatch).

## Why not Terraform / CDK / etc.

These are the only two AWS resources whose config changes with any
frequency. Everything else (cluster, service, ALB, target group, IAM
roles, log groups, ECR repo) is one-time setup. A full IaC toolchain
isn't worth its overhead for two JSON files; if the surface grows,
revisit.
