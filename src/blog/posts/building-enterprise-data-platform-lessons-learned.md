---
title: "Building an Enterprise Data Platform from Scratch: What I Learned Over 9 Months"
subtitle: "An honest account of modernizing a legacy data stack — the wins, the chaos, and the lessons that stuck."
date: 2026-02-10
tags:
  - Data Engineering
  - Architecture
  - AWS
excerpt: "Nine months, twenty thousand jobs, petabytes of data. Here's what I learned building an enterprise data platform from scratch — the architecture decisions, the human dynamics, and six lessons I'd tell myself at the start."
---

## The Call

Nine months ago, I walked into an engagement that looked straightforward on paper: help a large retail company migrate off a legacy Cloudera platform and build something modern in its place. Twenty thousand jobs. Petabytes of data. Dozens of source systems.

What followed was one of the most formative experiences of my career.

This article isn't a tech spec. It's a reflection — on architecture decisions, on the human dynamics of a complex delivery, and on what I'd do differently. If you're a data engineer, architect, or consultant who's ever stared down a greenfield platform build inside a politically complex organization, I hope this is useful.

---

## Why the Company Was Building This

The company was at an inflection point. Years of operating separate systems for stores, e-commerce, and customer data had left them with fragmented insights and a growing inability to compete on personalization. Their north star goals were clear:

- Modernize the brand by becoming genuinely data-driven
- Deliver customer-centric insights across all channels
- Create a seamless, integrated shopping experience — online and in-store

They didn't just need a data warehouse refresh. They needed a platform that could unify data across touchpoints, support both batch and streaming patterns, enable fast iterations, and be trusted by the business. That last part — *trusted* — turned out to be the hardest one to solve.

---

## What We Built

At the architecture level, we went with a hybrid stack: AWS for infrastructure, Snowflake as the data warehouse, and open-source tooling (Spark, Hudi, Airflow, Great Expectations, DataHub) to fill the gaps. Data lived in an S3-based data lake (Parquet + Hudi for Data Science use cases) and flowed into Snowflake for enterprise reporting.

{% diagram "enterprise_data_platform_architecture.html", "Enterprise data platform architecture diagram", "End-to-end data platform architecture — from raw sources through lake layers to warehouse and consumption.", 440, "enterprise-data-platform" %}

The core pillars of the platform:

**1. Flexible Ingestion**
We built a framework to handle Files, RDBMS, NoSQL, Kafka, and REST APIs — all under a unified model. The key design decision here was configuration-driven pipelines rather than bespoke code per source. This made onboarding new sources dramatically faster.

**2. Data Quality — Beyond Checking Boxes**
We integrated Great Expectations for quality checks and built a custom layer to publish results into DataHub. Each dataset got a quality score. Trend analysis was visible in the catalog. This made quality a *visible, ongoing conversation* rather than a one-time exercise.

**3. End-to-End Lineage**
Column-level lineage in the warehouse, dataset-level lineage in the lake — all surfaced in DataHub. When something broke, the team could trace impact in minutes rather than hours.

**4. Observability That Actually Helped**
Grafana dashboards gave near-real-time visibility into pipeline health and AWS service status. Alerts went to both email and MS Teams. This sounds obvious, but it was a meaningful shift from the "check the logs when something's on fire" culture that preceded it.

**5. Infrastructure as Code — First of Its Kind Here**
The entire platform was deployed using Terraform and Terragrunt. For this organization, this was genuinely new territory. We wrote unit and integration tests for infrastructure. Deployments became reproducible across environments. This alone saved weeks of debugging down the line.

**6. Cost-Conscious from Day One**
We supported EMR Serverless, EMR on EKS, and EMR on EC2, with Spot Instances for heavy workloads. Karpenter handled dynamic auto-scaling on EKS. The philosophy was: don't over-provision, let the workload tell you what it needs.

**7. Governance as a First-Class Concern**
We launched DataHub as the central metadata platform and built a *Data Producer Playbook* — a practical guide covering responsibilities, SLAs, governance checkpoints, and step-by-step onboarding flows. This wasn't just documentation; it was the mechanism for scaling the platform beyond our team.

<figure>
  <img src="/images/posts/enterprise-data-platform/tech_stack_grid.svg?v=2" alt="Tech stack grid — AWS, DevOps, Snowflake, and open-source tooling" />
  <figcaption>The hybrid tech stack — combining AWS managed services, open-source tooling, and a cloud data warehouse.</figcaption>
</figure>

---

## How We Structured the Code

One thing I'm genuinely proud of from this engagement is how we approached the codebase itself. A platform of this scale — ingesting TBs daily across a dozen source types — can easily become an unmaintainable tangle if you don't make deliberate structural choices early. We made a few that paid off significantly.

<figure>
  <img src="/images/posts/enterprise-data-platform/repo_structure_diagram.svg?v=2" alt="Monorepo structure diagram showing module layout" />
  <figcaption>Monorepo structure — each module owns its pipeline concern, with shared logging and job control across the platform.</figcaption>
</figure>

**A monorepo with clear module boundaries**

The entire platform lived in a single repository, organized into discrete, independently testable modules — each owning its own `src/` and `tests/` tree:

- `ingestion/` — framework for pulling data from RDBMS, NoSQL (Cassandra, Astra), Kafka, REST APIs, and flat files, all through a single `IngestionDriver` entry point
- `transformation/` — Bronze → Silver → Gold layer processing using PySpark, with a `JobFactory` pattern that dynamically loads the right transformer per source
- `quality/` — Great Expectations checks per layer, plus a custom DataHub emitter to publish quality scores to the catalog
- `orchestration/` — Airflow DAGs organized by domain (customer, master, CRM, etc.), wired to dbt for the warehouse layers
- `governance/` — DataHub recipes, business glossary YAML, metadata ingestion scripts for Snowflake and Athena
- `catalog/` — DDL generation utilities (CSV schema definitions → environment-specific SQL scripts)
- `devsecops/` — secrets management, security scanning, EKS Spark pod config, MWAA utilities
- `dl_monitor/` and `logger/` — shared job control and structured ETL logging, imported across all modules
- `event_trigger/` — Lambda functions for S3-based file arrival triggers

The four patterns that mattered most in practice:

{% diagram "coding_patterns_snippet_1_factory.html", "Four code patterns: Factory, Config-driven, ETL logging, Spark testing", "Four patterns that kept the codebase clean across 19 months and multiple contributors.", 1600, "enterprise-data-platform" %}

**Pattern 1 — Factory + dynamic module loader.** `JobFactory` dispatches to the right job type, and `DynamicMod` imports the correct `Transformer` class at runtime by convention (`src.source.{source_name}.src.transformer.{dataset}_transform`). The framework never imports source-specific code directly. Adding a new dataset meant dropping a new `Transformer` class in the right folder — the core stayed untouched.

**Pattern 2 — Config-driven ingestion.** A single `IngestionDriver` handles Oracle, Cassandra, Kafka, REST APIs, and files. The `source_type` comes from job arguments, not from branching codebases. Kafka stream settings — schema registry IDs, batch intervals, output formats — live in per-environment `.conf` files. Nothing is hardcoded.

**Pattern 3 — Structured ETL logging.** Every log line carries `job_run_id`, `pipeline_id`, `domain_name`, `source_name`, `stage`, and the Spark `app_id`. When something failed in production at 2am, the on-call engineer could correlate the log to an exact DAG run, Spark execution, and pipeline step in seconds. This wasn't optional — it was part of the `IngestionDriver` and `TransDriver` contracts from day one.

**Pattern 4 — Spark-aware testing.** A shared `SparkTestBase` spun up a real local Spark session per test suite, with actual Parquet/Hudi jars. S3 was mocked using `moto`. Row-level DataFrame diffing (`assert_df_equals`) caught schema drift early. Unit and integration tests were separated by markers so CI could run unit tests on every commit without needing AWS credentials.

---

## The Challenges No One Talks About

Here's where things get real.

### Technical Curveball: Great Expectations + DataHub + Spark

Out of the box, there was no clean integration between Great Expectations and DataHub for Spark datasources. This meant quality check results couldn't be published to the catalog automatically.

We could have accepted the limitation. Instead, we extended the open-source library and built a custom API integration to push results into DataHub. It took time, but it meant quality was *visible* in the catalog — which mattered for trust.

The lesson: when a gap in the OSS ecosystem blocks a core capability, evaluate whether the effort to bridge it is worth it. In our case, it was — because quality visibility was non-negotiable.

### PII in Shared Pipelines

Some source systems mixed PII and non-PII data. The naive solution would have been separate pipelines. Instead, we built configuration-driven handling into a single pipeline that enforced strict access controls at both processing and consumption layers based on data classification.

This reduced duplication and made governance consistent. The tradeoff was more upfront framework complexity — which required stronger documentation and onboarding discipline.

### Business Stakeholders Were Absent (At First)

This was the most frustrating challenge. Without active business involvement, deciding which use case to actually demonstrate the platform on took months of back-and-forth. We eventually worked with client delivery and technical leadership to land on a customer domain use case — but the time lost was real.

If I were doing this again: push harder, earlier, for a named business sponsor with decision-making authority. Platform builds without a business anchor drift into "technically impressive but organizationally irrelevant" territory fast.

### Scope Creep on a Fixed-Bid Engagement

The goalposts moved. Repeatedly. What started as an MVP conversation gradually inflated toward "full-scale enterprise-ready platform." On a fixed bid, this is existential.

We managed it through a combination of:

- Educating the client on platform extensibility ("you don't need us to build everything; the platform is designed to let your team do this")
- Working with their vendor partners to evaluate what was already solved
- Transparent negotiation — being flexible on the long-term relationship while holding firm on scope

There's no silver bullet here. It takes constant alignment, clear documentation of what's in/out, and the willingness to have uncomfortable conversations early rather than late.

### Transition and Upskilling

We weren't just building a platform — we were handing it over to a team that would need to run and extend it. That required a structured transition plan covering the tech stack, software development best practices, IaC, and DevOps fundamentals.

The depth of coverage had to be calibrated to actual skill levels, not assumed ones. We learned this the hard way: a session pitched too high leaves people nodding without understanding; too low and it feels patronizing. Assessing skill gaps honestly before designing the transition content made a big difference.

---

## What I'd Tell Myself at the Start

**1. Invest in the business case early.** A platform without a business stakeholder is an engineering project, not a data product.

**2. Design for handover from day one.** Documentation, playbooks, and runbooks aren't afterthoughts — they're how the platform outlives your engagement.

**3. OSS gaps are expected; budget for them.** Assume you'll need to build a few custom bridges. It's not a failure; it's the cost of using a diverse, best-of-breed stack.

**4. Scope discipline is a form of client care.** Saying yes to everything feels helpful. It's usually the opposite.

**5. Visibility builds trust faster than correctness alone.** Lineage, quality scores, dashboards — making data *understandable* to the business mattered as much as making it accurate.

**6. Structure your code like you'll hand it to strangers.** Because you will. The Factory pattern, config-driven design, shared logging contracts, and co-located tests weren't academic — they were what made the handover survivable.

---

## Closing Thought

Nine months is a long time to spend on a single platform. But looking back, the work that mattered most wasn't the Terraform modules or the Snowflake schemas — it was the moments where the team made the invisible visible: quality scores surfaced in a catalog, lineage traced across hundreds of jobs, pipelines monitored in near real-time.

Data platforms earn trust slowly and lose it quickly. The technical decisions are important, but they're in service of something more fundamental: giving people the confidence to act on data.

That's worth building carefully.

---

*If you've been through a similar migration or platform build, I'd love to hear what your biggest lessons were — drop a comment or connect with me on [LinkedIn](https://www.linkedin.com/in/harisankarsivankutty/).*
