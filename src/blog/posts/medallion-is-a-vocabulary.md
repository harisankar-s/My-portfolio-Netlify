---
title: "Medallion Architecture Is a Vocabulary, Not an Architecture"
subtitle: "Bronze, Silver, Gold tells you how mature your data is. It tells you almost nothing about how to build it."
date: 2026-08-02
tags:
  - Data Engineering
  - Architecture
  - Medallion
excerpt: "Bronze/Silver/Gold is useful for conversation, but the model does not answer the real questions about where business rules and ownership belong."
---

# Medallion Architecture Is a Vocabulary, Not an Architecture

### Bronze, Silver, Gold tells you how mature your data is. It tells you almost nothing about how to build it.

The rule was three lines of SQL, and moving it up one layer took two days.

Not two days of work. Two days of *reading* — opening model after model to reconstruct which tables it actually touched, because the design didn't say and the code was the only honest answer.

Nothing about that violated Medallion. Bronze was raw. Silver was clean. Gold was aggregated. Every box was the colour it was supposed to be, and the platform still made a three-line change expensive.

That's the gap in the Bronze/Silver/Gold diagram, and it isn't a small one.

You know the diagram. Three boxes, arrows left to right, a caption underneath: *quality and refinement increase left to right*. Sources on one side, dashboards and ML models on the other. A tool grid in the corner.

The diagram is correct.

That's the problem with it.

It's correct the way "write clean code" is correct — true, agreeable, and almost impossible to act on wrongly, because it doesn't say enough to be wrong.

Every team I've seen adopt Medallion adopted the *names* in an afternoon. Then spent eighteen months arguing about what actually goes in the middle box.

So here's the version I'd hand a team on day one, with the arguments left in.

---

## Bronze is the only layer the diagram gets unambiguously right

Raw. Append-only. Exact copy of source. Schema drift tolerated. No transformations.

Follow that literally. The moment someone "just fixes the date format" in Bronze, you've lost your ability to reprocess — and you won't find out until the day you desperately need it.

The one thing the diagram leaves out is cost.

"Keep everything forever" is warehouse-era advice being repeated in a cloud-warehouse world where storage is cheap but *scanning* isn't. On BigQuery or Snowflake, an append-only Bronze table nobody partitioned isn't an asset. It's a bill.

Bronze needs a retention policy and a partition strategy on day one. Not because storage is expensive, but because every downstream full-refresh is going to walk it.

> Immutable does not mean unmanaged.

---

## Silver is where the architecture actually lives — and the diagram says nothing about it

Here's the standard description of Silver: *cleaned, deduplicated, standardized, light business rules, joined and enriched.*

Every meaningful design decision in your platform is hiding inside the phrase "light business rules."

What counts as light?

Deduplication is obviously Silver. Currency conversion — cleaning, or business rule? Mapping seventeen source-system category codes onto one internal taxonomy? Deciding that a product with no active listing is "inactive" rather than absent?

Those aren't cleaning. Those are decisions about what the business *means*. And the medallion vocabulary offers you exactly zero guidance on where they belong.

Which points at the bigger omission:

> Medallion is a maturity gradient, not a modelling technique.

It tells you data gets more refined as it moves right. It doesn't tell you how to *model* the refined state.

Data Vault, a normalized 3NF core, one-big-table-per-domain, or a pile of denormalized joins are all "Silver" as far as the diagram is concerned. They have wildly different consequences for what it costs you to add a source next year.

<figure>
  <img src="/images/posts/medallion-is-a-vocabulary/fig1-what-medallion-leaves-to-you.png" alt="What the Medallion vocabulary specifies and what it leaves up to your team" width="100%" style="display:block;background:#fff;padding:16px;" />
  <figcaption>Solid outlines are specified by the model. Dashed outlines are your team's decision.</figcaption>
</figure>

Adopt Medallion and stop there, and you've adopted a naming convention while skipping the architecture. The layer names are your folder structure. The modelling approach is your design.

---

## The failure mode nobody puts on the infographic

The listed common mistakes — transforming in Bronze, skipping Silver, no quality checks — are real. They're also month-one mistakes.

Here's the one that gets you in year two.

A piece of business logic gets written where it's first needed. Which is usually as far downstream as possible, because that's where the requirement arrived from.

Six months later, a second consumer needs the same logic.

Now you choose: copy it, or push it upstream.

Copying is fast. The two copies diverge within a quarter.

Pushing upstream is correct and expensive — because to move the logic, you first have to work out which tables it touches. And the only honest source of truth for that is the code itself. Somebody spends two days reading models to reconstruct a lineage that should have been legible from the design.

I've watched this play out with a filtering rule that started life near the serving layer and eventually needed to move several layers up. Moving it was the right call. The two days spent reconstructing what it touched weren't the cost of the move. They were accumulated interest on logic that had been placed by convenience rather than by rule.

<figure>
  <img src="/images/posts/medallion-is-a-vocabulary/fig2-logic-placement-cost.png" alt="Cost of moving business logic across layers in a Medallion-based data platform" width="100%" style="display:block;background:#fff;padding:16px;" />
  <figcaption>Neither option is free. The cheap one is the one that costs you later.</figcaption>
</figure>

The diagram can't prevent this. "Which layer does this rule belong in" is precisely the question it declines to answer.

What prevents it is a written placement rule your team actually agrees on — something as blunt as *any rule more than one consumer could plausibly need lives no lower than Silver* — plus lineage someone can read without opening the code.

---

## Gold multiplies

Bronze grows with your sources.

Silver grows with your domains.

Gold grows with your **stakeholders** — and stakeholders are unbounded.

<figure>
  <img src="/images/posts/medallion-is-a-vocabulary/fig3-what-bounds-each-layer.png" alt="What bounds each Medallion layer: Bronze and Silver have fixed boundaries, Gold is stakeholder-driven" width="100%" style="display:block;background:#fff;padding:16px;" />
  <figcaption>Bronze and Silver have a right-hand edge. Gold does not.</figcaption>
</figure>

The diagram shows one Gold box. In practice, a healthy platform tends toward one Gold model per consumption contract. An unhealthy one tends toward one Gold table per dashboard someone requested on a Thursday.

That second pattern is spreadsheet sprawl with better tooling. It fails the same way: three tables claiming to report revenue, three different numbers, nobody able to say which is authoritative.

The counter-pressure isn't technical. Gold needs an owner who's allowed to say no, and a rule that a new Gold model either answers a genuinely new question or replaces an existing one.

---

## The tool stack is more negotiable than it looks

The canonical tool grid is Databricks-shaped — Spark, Delta, Delta Live Tables — because the terminology came from Databricks.

That's history, not a requirement.

Medallion maps perfectly well onto a warehouse-native stack. Bronze as raw landing tables in BigQuery or Snowflake. Silver and Gold as dbt models with tests at the boundaries. Orchestration wherever you already have it.

The layers are a contract about data quality, not a statement about compute engines.

If you're warehouse-first and someone tells you that you need a lakehouse to "do Medallion properly," they're selling you a lakehouse.

The one thing you genuinely need regardless of stack: enforced tests at layer boundaries. A layer that promises "trusted" but doesn't test uniqueness, referential integrity, and freshness at its edge is promising nothing.

---

## What I'd actually keep

Three things, and they're worth keeping.

**A shared vocabulary.** When an analyst asks "is that Silver or Gold?", everyone in the room understands the question. That's not nothing — most data teams lack even this.

**The prohibition on transforming in Bronze.** Follow it literally.

**The directionality.** Quality increases left to right, dependencies point one way, and you don't reach backwards. This is the actual architectural constraint in the whole model, and it's the one people break first.

Everything else — where a rule lives, how Silver is modelled, how many Gold tables are too many, what "trusted" is measured against — is your team's call. Medallion won't make it for you.

> The diagram is a good map. Just don't confuse it with having walked the ground.

---

*If you've hit the cross-layer logic problem — a rule written downstream that has to migrate up, and nobody can say which tables it touches — I'd be curious how your team decides placement. I don't think anyone has a clean answer yet.*
