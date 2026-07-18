---
title: "Seven Principles for Production-Grade Data Pipelines"
subtitle: "Lessons from adding a Snowflake-to-BigQuery pipeline to a GCP platform we run for an e-commerce client."
date: 2026-07-18
tags:
  - Data Engineering
  - Architecture
  - GCP
excerpt: "The data movement is the easy part. Seven principles — drawn from adding a Snowflake-to-BigQuery pipeline to a mature production platform — for everything wrapped around it: permissions, environments, deployment, and what happens when it fails at 3am."
---

Here's a thing nobody tells you early enough: the data movement is the easy part. Reading from one system, writing to another, transforming in between — that's a few hundred lines you'll get working in an afternoon. What actually takes the time, and what decides whether the thing survives, is everything wrapped around it. The permissions. The environments. How it deploys. What happens when it fails at 3am. Whether the person who has to change it in six months — usually you — can do so without breaking into a cold sweat.

Some context, because it shapes everything below. We own and run a data platform on Google Cloud for an e-commerce client — a real, lived-in estate of pipelines, service accounts, Terraform, and Cloud Composer that's been humming along in production for a while. Recently we added a new capability to it: pulling reference and dimension data out of Snowflake and into BigQuery, to feed some downstream classification and enrichment work.

And adding to a *mature* platform is a genuinely different sport from greenfield. You inherit conventions you didn't write, shared infrastructure you don't fully control, service accounts that have accumulated permissions nobody quite remembers granting, and — the big one — a production system that other people depend on and you absolutely cannot afford to knock over.

So these are the principles we lean on. They came out of this particular piece of work, but none of them are really about Snowflake or BigQuery. They apply anywhere data moves between systems on a schedule. And I've kept in the parts where the "obvious" best practice turned out to be wrong, because honestly those are the only bits worth reading twice.

---

## 1. One artifact, many behaviours — not many artifacts

The moment a pipeline sprouts a second mode — a reverse direction, a variant, a new target — there's a strong pull to build a second *everything*. Second image, second repo, second service. Don't.

You can have one container image serve several jobs, with the difference between them living at the orchestration layer instead of getting baked into separate builds. On our platform, a single image handles both directions of a bidirectional sync; the second job just overrides the entrypoint where it's defined:

```hcl
containers {
  image   = ".../pipeline-image-${env}:latest"
  command = ["python"]
  args    = ["./reverse_direction.py"]
}
```

One image is one thing to build, one thing to scan for vulnerabilities, one thing to promote from dev to prod. The behavioural difference sits in version-controlled infrastructure where anyone can see it and review it — not hidden inside two Docker builds that will, I promise you, quietly drift apart over time.

**The takeaway:** duplication in a build pipeline is a tax you pay on every single change forever after. One artifact, a runtime switch.

---

## 2. Configuration is data — so treat it like data

Everything that varies belongs in configuration, not code: the tables to move, the connection details, whether each table gets fully replaced or appended to. Our jobs pull a config document from object storage at runtime that lays all of this out.

The payoff is that adding a table becomes a one-line config change — reviewed like anything else, deployed automatically, and crucially not requiring anyone to open the actual code. The code says *how* to move a table. The config says *which* ones and *where*. Keep those apart and the routine stuff stays routine.

There's a genuine tension here worth being honest about. You can push config even further out — into a database, a UI, schema auto-discovery — and each step removes friction. But each step also removes the review checkpoint. And when you're moving a client's production data, that checkpoint is often the *point*: it's the moment a human confirms "yes, we do want to copy this table," before some pipeline quietly starts replicating a 100-million-row table nobody meant to include. The sweet spot, usually, is version-controlled config that deploys itself — not config that changes with nobody watching.

**The takeaway:** put the variable stuff in configuration, keep the review, kill the manual steps.

---

## 3. "Least privilege" only helps if it's the *correct* least privilege

Everyone nods along to least privilege. The catch is that "minimal" is defined by what your code actually *does* when it runs — which is very often more than anyone can tell from reading the config in a pull request.

This gets genuinely hairy on an inherited platform, where a service account might be leaning on some broad permission that something, somewhere, quietly needs. Ours started with project-wide write access to the warehouse. Obviously too much — and the review flagged it, rightly. So we scoped it down to read-only on the source. And it broke. Twice, in two different ways that each taught us something:

- The source tables were **views that reach into other datasets.** Views run with the caller's permissions, so read access to the dataset the view *lives* in isn't enough — you need read on everything the view touches underneath.
- The export **creates temporary staging tables in the source dataset.** So it genuinely needed to *write* somewhere. Read-only was never going to fly.

The reviewer's instinct was completely right. Our first implementation of it was wrong — because the code's real appetite was subtler than the diff let on. What actually worked: read access broad enough to cover the tangle of view dependencies, and write access penned into a dedicated spot (more on that next).

**The takeaway:** figure out permissions from what the code *does at runtime*, not from what the config looks like it does. Actually run the thing when you tighten access. And when you inherit a suspiciously broad grant, find out why it's there before you yank it.

---

## 4. The best permissions fix is often not a permissions fix at all

When something demands broad access, the reflex is to argue about the access. Often the smarter move is to change the design so the demand disappears.

Our export was writing its temporary staging tables *into the very production dataset it was reading from.* Two problems in one: it forced write access onto a dataset we only wanted to read, and it littered a dataset other people consume with throwaway tables. So instead of granting write on the production data, we just sent the temp tables somewhere else — a dedicated scratch dataset:

```hcl
resource "google_bigquery_dataset" "scratch" {
  dataset_id                  = "tmp_pipeline"
  location                    = "EU"   # must match the source region
  default_table_expiration_ms = 86400000  # 24h — junk tables clean themselves up
}
```

Now write access is confined to a purpose-built scratch dataset, the production source is strictly read-only to the pipeline, and anything a failed run leaves behind evaporates after a day. The code change was literally one line, because the temp-table location was built in exactly one place — a small, quiet reward for not having copy-pasted that logic around earlier.

**The takeaway:** "this needs too many permissions" is frequently a design smell wearing an access-control costume. Move where the work happens and the problem often just… goes away.

---

## 5. Make failures loud — and check the *shape* of your data, not just that it showed up

The failures that hurt aren't the loud ones. They're the silent ones — data arrives, the counts look about right, and something is quietly, subtly wrong.

Ours announced itself when an export landed with anonymous, positionally-named columns instead of the real names — a quirk of how the source system serialises columnar files if you don't ask it nicely. A row-count check would have sailed right past it. The rows were all there. They were just *wrong*. The fix was small; the unsettling part was how close it came to slipping through unnoticed.

Two habits keep this class of bug at bay. First, validate the *shape* — schema, column names, types — not just that rows exist. Second, reconcile source against destination and shout about any mismatch; our jobs log a per-table row-count comparison at the end of every run, so a half-finished load raises its hand immediately instead of waiting for someone downstream to notice their dashboard looks weird.

**The takeaway:** "the rows arrived" and "the data is correct" are two completely different claims. Build your checks so that when something's off, the pipeline is the one that tells you.

---

## 6. In a multi-environment setup, the state file is the thing that can take down production

Running dev and prod from one infrastructure module, with the differences derived from a single variable, is the right call. It guarantees the two environments are structurally identical, because they *are* the same code with one value flipped:

```hcl
locals {
  environment = var.environment
  project     = "client-platform-${local.environment}"
}
```

But this pattern has teeth. With Terraform specifically, the variables you pass in do **not** decide which state you're operating on — the backend init does. Point Terraform at one environment's config while it's still initialised against another environment's state, and it will cheerfully generate a plan to demolish everything in the target and rebuild it as the source. The tell is a plan stuffed with destroys and identity flips (`project = "prod" -> "dev"`). On a live client platform, you can genuinely be one `apply` away from tearing down production while fully believing you're nudging dev.

I'll be honest — the reason I know exactly what that plan looks like is that we came face to face with one. Caught it at the plan stage, reading the output before hitting apply, which is the entire reason I'm typing this from a calm place rather than an incident review. The defence is partly discipline and partly a little wrapper that welds the two settings together so they can't drift apart:

```bash
deploy() {
  local env=$1; shift
  terraform init -reconfigure -backend-config=environments/$env/backend.tf >/dev/null
  terraform "$@" -var-file=environments/$env/config.tfvars
}
# deploy dev plan   /   deploy prod apply
```

And one non-negotiable habit: actually *read* the plan's counts and identifiers before every apply. A plan that wants to destroy your buckets, your service accounts, your jobs is a stop sign — not paperwork to skim past.

**The takeaway:** in multi-environment IaC, the worst mistake available to you is operating on the wrong state. Make it structurally hard to do, and read every plan like it might be trying to ruin your afternoon.

---

## 7. Deploy only what changed

A monolithic deploy that rebuilds the world on every commit is slow, wasteful, and tangles things that have no business being tangled — a one-line schedule tweak should not rebuild a container image.

Split deployment by concern, each one triggered only by changes to the files it actually owns:

| Concern | Triggered by changes to | What it does |
|---|---|---|
| Image | app source, Dockerfile | build & push |
| Infrastructure | Terraform files | plan & apply |
| Orchestration | scheduler / DAG files | sync to the orchestrator |
| Configuration | config files | sync to runtime storage |

Each piece deploys on its own. Failures stay local instead of taking everything down with them. Builds get faster because they're doing less. And on an inherited platform there's a bonus: you get to match the shape the other pipelines already use, instead of inventing a bespoke deployment the rest of the team then has to learn.

One scar worth sharing: CI triggers read files from the *committed branch on the remote*, not from whatever's sitting on your laptop. A deploy file at the wrong path, or one you forgot to commit, fails with a blunt "file not found" no matter how perfect it looks in your editor. We lost a chunk of an afternoon to a config that was one directory level off — right file, wrong place, and the trigger simply couldn't see it. The trigger's expected path and the actual committed path have to line up exactly, on the branch the trigger is watching. Obvious in hindsight. Still cost us the afternoon.

**The takeaway:** independent concerns should deploy independently — and never forget your automation is reading the repo, not your machine.

---

## The thread running through all of it

Strip these down and they're all really saying the same two things: **build it so it's safe to change later, and build it so failures are loud instead of sneaky.**

The data movement is the easy part. The actual engineering is in the surrounding stuff — permissions that are exactly as wide as the code needs and not a millimetre wider, environments that can't be mistaken for each other, deployments that touch only what moved, checks that catch the quiet failures before anyone downstream does. And all of this gets sharper when you're extending a platform you already own and run, because the job isn't just "make it work" — it's "add to a living production system without wobbling what's already there, and do it in a shape the next engineer on the account will actually recognise."

Get it right and the third pipeline, the fourth environment, is a small and boring change. Get it wrong and every future edit turns into archaeology, performed nervously, in the dark.

Good code review is a big part of how you get there — but not by treating it as a checklist to clear. The best outcomes on this project didn't come from doing everything the reviewer suggested, and they didn't come from waving suggestions away either. They came from asking *why* each note was raised and then finding the response that genuinely fit the system — sometimes a design change nobody had proposed, sometimes keeping a decision and explaining, with an actual error message in hand, why the obvious "improvement" would have broken it.

That back-and-forth — between the tidy abstract best practice and the messy behaviour of a real system running in production — is where the actual engineering lives.
