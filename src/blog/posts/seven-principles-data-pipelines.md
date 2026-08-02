---
title: "Seven Principles for Production-Grade Data Pipelines"
subtitle: "Lessons — and the actual Terraform — from adding a Snowflake-to-BigQuery pipeline to a GCP platform we run for an e-commerce client."
date: 2026-07-18
tags:
  - Data Engineering
  - Architecture
  - GCP
excerpt: "The data movement is the easy part. Seven principles — with the actual Terraform for each — drawn from adding a Snowflake-to-BigQuery pipeline to a mature production platform: permissions, environments, deployment, and what happens when it fails at 3am."
---

<figure>
  <img src="/images/posts/seven-principles-data-pipelines/pipeline-principles-hero.svg?v=2" alt="A Snowflake-to-BigQuery pipeline drawn as the easy core, wrapped by the seven surrounding concerns that are the real work: one artifact, config as data, correct least privilege, loud failures, safe state, and incremental deploy." width="100%" style="display:block;background:#fff;padding:16px;" />
  <figcaption>The data movement sits in the middle — the easy part. The seven principles are everything wrapped around it.</figcaption>
</figure>

Here's a thing nobody tells you early enough: the data movement is the easy part. Reading from one system, writing to another, transforming in between — that's a few hundred lines you'll get working in an afternoon. What actually takes the time, and what decides whether the thing survives, is everything wrapped around it. The permissions. The environments. How it deploys. What happens when it fails at 3am. Whether the person who has to change it in six months — usually you — can do so without breaking into a cold sweat.

Some context, because it shapes everything below. We own and run a data platform on Google Cloud for an e-commerce client — a real, lived-in estate of pipelines, service accounts, Terraform, and Cloud Composer that's been humming along in production for a while. Recently we added a new capability to it: pulling reference and dimension data out of Snowflake and into BigQuery, to feed some downstream classification and enrichment work.

Adding to a *mature* platform is a genuinely different sport from greenfield. You inherit conventions you didn't write, shared infrastructure you don't fully control, service accounts that have accumulated permissions nobody quite remembers granting, and — the big one — a production system that other people depend on and you absolutely cannot afford to knock over.

So these are the principles we lean on, and this time I've included the *actual* Terraform for each — genericized, but structurally exactly what we run. None of it is really about Snowflake or BigQuery; it applies anywhere data moves between systems on a schedule. And I've kept in the parts where the "obvious" best practice turned out to be wrong, because those are the only bits worth reading twice.

---

## 1. One artifact, many behaviours — not many artifacts

The moment a pipeline sprouts a second mode — a reverse direction, a variant, a new target — there's a strong pull to build a second *everything*. Second image, second repo, second service. Don't.

You can have one container image serve several jobs, with the difference between them living at the orchestration layer instead of getting baked into separate builds. On our platform, a single image handles both directions of a bidirectional sync; the two jobs point at the same image and the reverse-direction one just overrides the entrypoint.

**The actual Terraform.** Two Cloud Run Jobs, one image. The first uses the image's default entrypoint; the second overrides `command`/`args` to run a different script:

```hcl
# Job A — uses the image's default CMD (forward direction)
resource "google_cloud_run_v2_job" "forward_job" {
  name     = "pipeline-forward"
  location = local.cloud_run_region
  project  = local.project

  template {
    template {
      service_account = google_service_account.pipeline_sa.email
      containers {
        image = "${local.region}-docker.pkg.dev/${local.project}/${local.shared_repo}/pipeline-image-${local.environment}:latest"
        # ... env, resources ...
      }
      vpc_access {
        connector = local.vpc_connector
        egress    = "ALL_TRAFFIC"
      }
      timeout     = "7200s"
      max_retries = 1
    }
  }
}

# Job B — same image, entrypoint overridden for the reverse direction
resource "google_cloud_run_v2_job" "reverse_job" {
  name     = "pipeline-reverse"
  location = local.cloud_run_region
  project  = local.project

  template {
    template {
      service_account = google_service_account.pipeline_sa.email
      containers {
        image   = "${local.region}-docker.pkg.dev/${local.project}/${local.shared_repo}/pipeline-image-${local.environment}:latest"
        command = ["python"]              # overrides the Dockerfile CMD
        args    = ["./reverse_direction.py"]
        # ... env, resources ...
      }
      vpc_access {
        connector = local.vpc_connector
        egress    = "ALL_TRAFFIC"
      }
      timeout     = "7200s"
      max_retries = 1
    }
  }
}
```

The behavioural difference between the two jobs is those two lines of `command`/`args`, sitting in version control where anyone can see them — not buried inside two separate Docker builds that will quietly drift apart over time.

**The takeaway:** duplication in a build pipeline is a tax you pay on every change forever after. One artifact, a runtime switch.

---

## 2. Configuration is data — so treat it like data

Everything that varies belongs in configuration, not code: the tables to move, the connection details, whether each table gets fully replaced or appended to. Our jobs pull a config document from object storage at runtime.

The payoff is that adding a table is a one-line change to a JSON file — reviewed like anything else, deployed automatically, and crucially not requiring anyone to open the actual code. The code says *how* to move a table; the config says *which* ones and *where*.

**The actual config.** A per-environment JSON document, one per direction. The `tables` array is the part that changes often; `load_type` drives the write disposition (`full` → truncate, `incremental` → append):

```json
{
  "rule_name": "reverse-sync",
  "project": "client-platform-prod",
  "bq_dataset": "staging_reference",
  "bq_temp_dataset": "tmp_pipeline",
  "snowflake_database": "PRODUCTION",
  "snowflake_schema": "REFERENCE_SCHEMA",
  "snowflake_role": "REFERENCE_READ_ROLE",
  "tables": [
    { "name": "DIM_PRODUCT",   "load_type": "full" },
    { "name": "DIM_CATEGORY",  "load_type": "full" },
    { "name": "FACT_RANKINGS", "load_type": "incremental" }
  ]
}
```

There's a genuine tension worth being honest about. You can push config even further out — into a database, a UI, schema auto-discovery — and each step removes friction. But each step also removes the review checkpoint. When you're moving a client's production data, that checkpoint is often the *point*: it's the moment a human confirms "yes, we do want to copy this table," before some pipeline quietly starts replicating a 100-million-row table nobody meant to include. The sweet spot is version-controlled config that deploys itself — not config that changes with nobody watching.

**The takeaway:** put the variable stuff in configuration, keep the review, kill the manual steps.

---

## 3. "Least privilege" only helps if it's the *correct* least privilege

Everyone nods along to least privilege. The catch is that "minimal" is defined by what your code actually *does* when it runs — which is very often more than anyone can tell from reading the config in a pull request.

This gets hairy on an inherited platform, where a service account might be leaning on some broad permission that something quietly needs. Ours started with project-wide write to the warehouse. Obviously too much — flagged in review, rightly. So we scoped it to read-only on the source. And it broke, twice:

- The source tables were **views that reach into other datasets.** Views run with the caller's permissions, so read on the dataset the view lives in isn't enough — you need read on everything it touches underneath.
- The export **creates temporary staging tables**, so it genuinely needed to *write* somewhere. Read-only was never going to fly.

The reviewer's instinct was right; our first implementation of it was wrong, because the code's real appetite was subtler than the diff let on.

**The actual Terraform.** The resolution: read scoped broadly enough for the view fan-out (project-level *read-only* — a world away from the original project-level *write*), plus write penned into a dedicated scratch dataset (principle 4). And a detail that cost us a genuine debugging session — object roles alone aren't enough:

```hcl
# Read: project-level, but READ-ONLY. Covers the sprawling view dependencies
# without granting a single byte of write to the warehouse.
resource "google_project_iam_member" "source_data_viewer" {
  project = local.project
  role    = "roles/bigquery.dataViewer"
  member  = "serviceAccount:${google_service_account.pipeline_sa.email}"
}

# Staging bucket: objectAdmin covers object read/write, BUT the pipeline calls
# get_bucket() and Snowflake needs to resolve the bucket's region — both require
# storage.buckets.get, which objectAdmin does NOT grant. legacyBucketReader adds
# exactly that. Confirmed the hard way by a runtime 403.
resource "google_storage_bucket_iam_member" "staging_object_admin" {
  bucket = google_storage_bucket.staging.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.pipeline_sa.email}"
}

resource "google_storage_bucket_iam_member" "staging_metadata_reader" {
  bucket = google_storage_bucket.staging.name
  role   = "roles/storage.legacyBucketReader"   # provides storage.buckets.get
  member = "serviceAccount:${google_service_account.pipeline_sa.email}"
}

# Job execution locked to the scheduler's service account only — not left open.
resource "google_cloud_run_v2_job_iam_member" "invoker" {
  project  = local.project
  location = local.cloud_run_region
  name     = google_cloud_run_v2_job.reverse_job.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:scheduler-sa@${local.scheduler_project}.iam.gserviceaccount.com"
}
```

That `legacyBucketReader` line is the kind of thing you only learn by watching it fail: the role that *looks* sufficient (`objectAdmin`) is missing one bucket-level permission the code quietly depends on.

**The takeaway:** derive permissions from what the code does at runtime, not what the config looks like it does. Run the thing when you tighten access. And when you inherit a broad grant, find out why it's there before you yank it.

---

## 4. The best permissions fix is often not a permissions fix at all

When something demands broad access, the reflex is to argue about the access. Often the smarter move is to change the design so the demand disappears.

Our export was writing its temporary staging tables *into the very production dataset it was reading from.* Two problems in one: it forced write access onto a dataset we only wanted to read, and it littered a consumer-facing dataset with throwaway tables. So instead of granting write on the production data, we sent the temp tables somewhere else.

**The actual Terraform.** A dedicated scratch dataset, with `dataEditor` scoped to *only* that dataset — and a 24-hour expiry so nothing lingers:

```hcl
resource "google_bigquery_dataset" "scratch" {
  project                     = local.project
  dataset_id                  = "tmp_pipeline"
  location                    = "EU"          # must match the source region
  description                 = "Scratch dataset for transient staging tables"
  default_table_expiration_ms = 86400000      # 24h — junk tables clean themselves up
}

# Write access is confined to the scratch dataset. The production source
# (principle 3) stays strictly read-only to the pipeline.
resource "google_bigquery_dataset_iam_member" "scratch_editor" {
  project    = local.project
  dataset_id = google_bigquery_dataset.scratch.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.pipeline_sa.email}"
}
```

The application change to match this was literally one line — the temp-table location was built in exactly one place, a small reward for not having copy-pasted that logic around earlier.

**The takeaway:** "this needs too many permissions" is frequently a design smell wearing an access-control costume. Move where the work happens and the problem often just… goes away.

---

## 5. Make failures loud — and check the *shape* of your data, not just that it showed up

The failures that hurt aren't the loud ones. They're the silent ones — data arrives, counts look about right, and something is quietly, subtly wrong.

Ours announced itself when an export landed with anonymous, positionally-named columns instead of real names — a quirk of how the source serialises columnar files if you don't ask it nicely. A row-count check would have sailed right past it. The rows were all there. They were just *wrong*.

**The actual fix.** It lived in how the unload was written — wrapping the source in a subquery and turning headers on so the real column names survive into the Parquet schema:

```sql
COPY INTO @stage/path/
FROM (SELECT * FROM source_table)          -- the wrapper preserves column names
FILE_FORMAT = (TYPE = PARQUET SNAPPY_COMPRESSION = TRUE)
HEADER = TRUE                              -- without this: _COL_0, _COL_1, ...
OVERWRITE = TRUE;
```

Two habits keep this class of bug at bay. First, validate the *shape* — schema, column names, types — not just that rows exist. Second, reconcile source against destination and shout about any mismatch; our jobs log a per-table row-count comparison at the end of every run, so a half-finished load raises its hand immediately instead of waiting for someone downstream to notice their dashboard looks weird.

**The takeaway:** "the rows arrived" and "the data is correct" are two completely different claims. Build your checks so that when something's off, the pipeline is the one that tells you.

---

## 6. In a multi-environment setup, the state file is the thing that can take down production

Running dev and prod from one infrastructure module, with the differences derived from a single variable, is the right call. It guarantees the two environments are structurally identical, because they *are* the same code with one value flipped.

**The actual Terraform.** The whole environment split hinges on deriving everything from one variable, and keeping the backend config *out* of the main files:

```hcl
# config.tf — everything derives from local.environment
locals {
  environment      = var.environment            # "dev" or "prod"
  project          = "client-platform-${local.environment}"
  region           = "europe-west1"
  cloud_run_region = "europe-west4"
  shared_repo      = "client-platform-${local.environment}-repository"
  vpc_connector    = "projects/${local.project}/locations/europe-west4/connectors/serverless-connector"
}

# backend.tf — the backend block is EMPTY on purpose. The bucket/prefix come
# from a per-environment file at init time.
terraform {
  backend "gcs" {}
  required_providers {
    google      = { source = "hashicorp/google",      version = ">=4.84.0" }
    google-beta = { source = "hashicorp/google-beta",  version = ">=4.84.0" }
  }
}
```

```hcl
# environments/dev/backend_config.tf
bucket = "client-platform-dev-tf-state"
prefix = "pipeline/state"

# environments/dev/config.tfvars
environment = "dev"
branch_name = "^dev$"
```

Here's the sharp edge. The variables you pass in do **not** decide which state you operate on — the backend init does. Point Terraform at one environment's config while it's still initialised against another environment's state, and it will cheerfully generate a plan to demolish everything in the target and rebuild it as the source. The tell is a plan stuffed with destroys and identity flips (`project = "prod" -> "dev"`).

I'll be honest — the reason I know exactly what that plan looks like is that we came face to face with one. Caught it at the plan stage, reading the output before hitting apply, which is the entire reason I'm typing this from a calm place rather than an incident review. The defence is a little wrapper that welds init and vars together so they can't drift apart:

```bash
deploy() {
  local env=$1; shift
  terraform init -reconfigure -backend-config=environments/$env/backend_config.tf >/dev/null
  terraform "$@" -var-file=environments/$env/config.tfvars
}
# deploy dev plan   /   deploy prod apply
```

And one non-negotiable habit: actually *read* the plan's counts and identifiers before every apply. A plan that wants to destroy your buckets, service accounts, or jobs is a stop sign — not paperwork to skim past.

**The takeaway:** in multi-environment IaC, the worst mistake available to you is operating on the wrong state. Make it structurally hard to do, and read every plan like it might be trying to ruin your afternoon.

---

## 7. Deploy only what changed

A monolithic deploy that rebuilds the world on every commit is slow, wasteful, and tangles things that have no business being tangled — a one-line schedule tweak should not rebuild a container image.

**The actual Terraform.** One trigger per concern, each scoped with `included_files` so it only fires when its own files move:

```hcl
resource "google_cloudbuild_trigger" "build_image" {
  name     = "pipeline-build-image"
  location = local.region
  substitutions = { "_ENVIRONMENT" = local.environment }
  github {
    owner = local.github_owner
    name  = local.github_repo
    push { branch = var.branch_name }
  }
  included_files = ["src/**", "deployment/docker/**"]
  filename       = "deployment/docker/cloudbuild.yaml"
}

resource "google_cloudbuild_trigger" "terraform_apply" {
  name     = "pipeline-terraform-apply"
  location = local.region
  substitutions = { "_ENVIRONMENT" = local.environment }
  github {
    owner = local.github_owner
    name  = local.github_repo
    push { branch = var.branch_name }
  }
  included_files = ["deployment/terraform/core/**"]
  filename       = "deployment/terraform/core/cloudbuild_terraform_apply.yaml"
}

resource "google_cloudbuild_trigger" "sync_configs" {
  name     = "pipeline-sync-configs"
  location = local.region
  substitutions = { "_ENVIRONMENT" = local.environment }
  github {
    owner = local.github_owner
    name  = local.github_repo
    push { branch = var.branch_name }
  }
  included_files = ["configs/**"]
  filename       = "deployment/configs/cloudbuild_configs.yaml"
}
```

Each piece deploys on its own. Failures stay local instead of taking everything down with them. Builds get faster because they're doing less. And on an inherited platform there's a bonus: you get to match the shape the other pipelines already use, instead of inventing a bespoke deployment the rest of the team then has to learn.

Note the `branch_name` in `included_files` and the `_ENVIRONMENT` substitution both derive from the environment — so the *same* trigger definitions, applied with dev vs prod tfvars, produce dev triggers watching the dev branch and prod triggers watching the prod branch. One definition, two environments, no duplication.

One scar worth sharing: CI triggers read files from the *committed branch on the remote*, not from whatever's on your laptop. A deploy file at the wrong path, or one you forgot to commit, fails with a blunt "file not found" no matter how perfect it looks in your editor. We lost a chunk of an afternoon to a config that was one directory level off — right file, wrong place, and the trigger simply couldn't see it.

**The takeaway:** independent concerns should deploy independently — and never forget your automation is reading the repo, not your machine.

---

## The thread running through all of it

Strip these down and they're all really saying the same two things: **build it so it's safe to change later, and build it so failures are loud instead of sneaky.**

The data movement is the easy part. The actual engineering is in the surrounding stuff — permissions that are exactly as wide as the code needs and not a millimetre wider, environments that can't be mistaken for each other, deployments that touch only what moved, checks that catch the quiet failures before anyone downstream does. And all of this gets sharper when you're extending a platform you already own and run, because the job isn't just "make it work" — it's "add to a living production system without wobbling what's already there, and do it in a shape the next engineer on the account will actually recognise."

Get it right and the third pipeline, the fourth environment, is a small and boring change. Get it wrong and every future edit turns into archaeology, performed nervously, in the dark.

Good code review is a big part of how you get there — but not by treating it as a checklist to clear. The best outcomes on this project didn't come from doing everything the reviewer suggested, and they didn't come from waving suggestions away either. They came from asking *why* each note was raised and then finding the response that genuinely fit the system — sometimes a design change nobody had proposed, sometimes keeping a decision and explaining, with an actual error message in hand, why the obvious "improvement" would have broken it.

That back-and-forth — between the tidy abstract best practice and the messy behaviour of a real system running in production — is where the actual engineering lives.
