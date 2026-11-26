---
title: "How I Passed Both Claude Certified Architect Exams (and Why the Easier One Scored Lower)"
subtitle: "Four weeks for Foundations, two for Professional, on weekends and early mornings. And one mistake I'd warn you about."
date: 2026-11-22
tags:
  - GenAI
  - Claude
  - Certification
excerpt: "I passed Claude Certified Architect Foundations and Professional in about six weeks of part-time study, and scored lower on the one that looked easier. Here's what each exam covers, the resources I used, my plan, and the mistake to avoid."
---

# How I Passed Both Claude Certified Architect Exams (and Why the Easier One Scored Lower)

### Four weeks for Foundations, two for Professional, on weekends and early mornings. And one mistake I'd warn you about.

I recently passed both of Anthropic's architect certifications: Claude Certified Architect – Foundations (CCAR-F) and Claude Certified Architect – Professional (CCAR-P). I did it with a full-time consulting job, so almost all of my study happened on weekends and in the early morning before work.

Both passes went to plan. The scores didn't: **865 on Foundations, 769 on Professional**, against a pass mark of 720 on both. I scored lower on the exam whose curriculum looked *lighter*, and the reason is the most useful thing in this post.

Since then, a lot of people have asked me how I prepared. So here's the short answer first, then the details.

## My prep in 7 steps

1. Read the exam guide first. Note each domain's weight and plan your time around it.
2. Watch the free [Anthropic Academy](https://anthropic.skilljar.com/) courses in order, with an API key open. Try every concept once.
3. Build something small: a tool-calling loop with a JSON schema, one agent, one MCP server, and a Claude Code setup with project instructions.
4. Check your coverage domain by domain with [AI Cert Guides](https://aicertguides.com/learn). Write down every topic you can't explain out loud.
5. Fix those gaps, then practise scenario questions. Read every explanation, including for the ones you got right.
6. Sit Foundations. It took me four weeks of weekends and early mornings.
7. Sit Professional within a few weeks, and prepare for it just as seriously, especially the operational topics. That's where I lost marks.

<aside class="promo-band">
  <div class="promo-band-copy">
    <span class="promo-eyebrow">Free · BrainByte</span>
    <div class="promo-title">Practise with my Claude exam questions</div>
    <p class="promo-text">160 questions for Foundations and 125 for Professional, grouped by exam domain, with an explanation for every answer.</p>
  </div>
  <a class="promo-btn" href="{{ site.portfolioUrl }}/guides/">Get the free packs</a>
</aside>

The rest of this post covers what the two exams are, what I used, how I split the time, where I went wrong, and what kind of thinking the questions reward.

## Two exams, two different questions

The easiest way to understand the pair:

- Foundations asks: "Can you build it correctly?" Agent loops, tool design, MCP, Claude Code, prompting, structured output and context management. Very hands-on.
- Professional asks: "Should you build it this way, and can you run it?" Solution design, integration, evaluation, governance and safety, stakeholder communication, and the lifecycle of a system once it's live.

Both are scenario-based multiple-choice exams (single and multiple response), delivered through Pearson VUE, online proctored or at a test centre. According to the exam guide as summarised by study sites, Foundations has about 60 questions and Professional about 63, each in 120 minutes, with a passing score of 720 out of 1,000.

The domain weights, as listed on [AI Cert Guides](https://aicertguides.com/learn) from Anthropic's exam guide:

| Foundations (CCAR-F) | Weight |
|---|---|
| Agentic Architecture & Orchestration | 27% |
| Claude Code Configuration & Workflows | 20% |
| Prompt Engineering & Structured Output | 20% |
| Tool Design & MCP Integration | 18% |
| Context Management & Reliability | 15% |

| Professional (CCAR-P) | Weight |
|---|---|
| Integration | 19% |
| Solution Design & Architecture | 17% |
| Evaluation, Testing & Optimisation | 16% |
| Governance, Safety & Risk Management | 14% |
| Stakeholder Communication & Lifecycle Management | 14% |
| Claude Models, Prompting & Context Engineering | 13% |
| Developer Productivity & Operational Enablement | 7% |

## Who can take it, and how to book

### Eligibility

Right now the Claude certifications are for people who work at a company in Anthropic's Claude Partner Network. If your employer is a partner, you get access to the Anthropic Partner Academy, and that's where you register. There's no prerequisite course or exam: you can sit Foundations directly, and Professional doesn't formally require Foundations first, though I'd strongly recommend doing them in that order. If your company isn't a partner yet, the free courses below are still worth doing; the certification just isn't open to you yet.

### Booking, step by step

1. Sign in to the [Anthropic Partner Academy](https://anthropic-partners.skilljar.com/page/faq-certifications) with your work account, find the exam (look for the code CCAR-F or CCAR-P; older guides call Foundations "CCA-F"), and pay by card. Partner-tier discounts, if your company has one, apply at checkout.
2. Follow the confirmation email to [Pearson VUE](https://www.pearsonvue.com/anthropic) and create your Pearson account.
3. Pick online proctored or a test centre, then a date and time. I took both online.
4. For online exams, run Pearson's system check on the computer you'll use, well before exam day. You need a webcam, a quiet room and a clear desk, and you'll show your ID and room on camera at check-in.
5. Results: you get a pass or fail straight away, and a score report later with your percentage for each exam objective. Read it; mine showed exactly where I'd been overconfident.

### Cost, retakes and validity

These figures are from the exam guide v1.0, as summarised by study sites.

| | Foundations | Professional |
|---|---|---|
| Price per attempt | $125 | $175 |
| Questions / time | 60 in 120 min | 63 in 120 min |
| Pass mark | 720 / 1,000 | 720 / 1,000 |

- Retakes: wait 14 days after a first failed attempt, 30 days after a second, and 90 days after a third, with at most four attempts in 12 months.
- Validity: 12 months, so plan for renewal.

> Check before you book: prices, eligibility and retake rules have changed since launch, and third-party sites don't always agree. The Partner Academy's exam guide and Pearson VUE's Anthropic page are the official sources.

Notice the shift. Over a quarter of Foundations is agentic architecture. Professional spreads its weight evenly and puts governance, evaluation and stakeholder communication on the same level as the technical domains. If you only study APIs for Professional, you'll be surprised.

## What I used

I kept it to two resources on purpose.

### 1. Anthropic Academy (free)

[Anthropic Academy](https://anthropic.skilljar.com/) was the core. I used the developer courses: Building with the Claude API, Introduction to Model Context Protocol and the Claude Code course. They explain *why* Claude behaves the way it does (tool use, context windows, prompt caching, agents), which is exactly what scenario questions test. I watched them in order and paused to try things against the API instead of just watching.

### 2. AI Cert Guides

[AI Cert Guides](https://aicertguides.com/learn) is an independent study site (not affiliated with Anthropic) that organises the material one lesson per exam task statement, grouped by domain. I used it to check coverage: after the videos, I walked through each domain's lessons and marked anything I couldn't explain out loud. The lessons are free to read; the full mock exams are a small one-time purchase.

My day job filled in the rest. I build RAG and agentic systems for clients, and I built [AskHari.ai](/ask/), the assistant on this site, on the Claude API. A lot of questions were easier because I'd already hit the problem in production.

## My plan: six weeks, part-time

### Foundations: 4 weeks

- Week 1 — Anthropic's videos on prompting, structured output and tool use. Early mornings: one video plus a small experiment. Weekend: rebuild something end to end (a tool-calling loop with a JSON schema).
- Week 2 — Agents and orchestration. This is the heaviest domain, so it got most of the weekend time.
- Week 3 — MCP and Claude Code. I wired up an MCP server and set up Claude Code with project instructions and custom commands, because reading about configuration isn't the same as doing it.
- Week 4 — Context management, then a full pass through AI Cert Guides by domain, fixing every gap I found. Exam at the end of the week.

I passed with 865, and walked out confident.

### Professional: 2 weeks

That confidence shaped what came next. I looked through the Professional content and it felt lighter: fewer API details, more design, governance and communication. So I gave it two relaxed weeks, skimmed the topics I thought I already knew from client work, and booked the exam.

I passed with 769: 96 points lower than Foundations, and only 49 above the pass mark, even though the curriculum was easier.

### Why weekends and early mornings worked

- Mornings for input. 45–60 minutes before work, one topic, no context switching. I was fresh, and the day hadn't started making demands yet.
- Weekends for building. Longer blocks to actually run code: agent loops, MCP servers, prompts that break and get fixed. That's where the understanding stuck.
- No studying after work. I tried it; nothing stayed.

## The lesson: lighter content isn't an easier exam

The score report breaks your result down by objective, and mine told a very clear story.

Where I scored full marks on Professional: translating business problems into Claude solutions, choosing architecture patterns, multi-agent design, prompting and prompt caching, defining eval metrics and datasets, diagnosing failures, guardrails, and stakeholder alignment. The design work I do every day.

Where I lost marks:

- Running systems in production. Monitoring and observability at scale, A/B testing and iterative improvement, and supporting the full lifecycle from discovery through handoff to monitoring. I scored zero on all three.
- Trade-off calls. Choosing the right Claude model for a job, and accuracy-versus-latency decisions. One in three.
- Developer productivity for teams. Configuring Claude Code and similar tools for a team, and improving developer workflows. Zero, which surprised me most, because I'd scored full marks on Claude Code configuration in Foundations.
- Security and documentation. Spotting authentication and authorisation gaps, and documenting architectures for handoff. Half.

Looking back, the reasons are clear.

- "Lighter" meant less to memorise, not less to think about. Professional has fewer facts, but every question is a judgement call between several reasonable options. You can't skim your way to good judgement.
- Setting it up for yourself isn't rolling it out to a team. Foundations asks how *you* configure Claude Code. Professional asks how you roll it out, support it and improve it across a team. I assumed the first covered the second. It doesn't.
- The "after launch" topics are the easiest to skip. Monitoring, A/B tests and lifecycle support look like common sense when you read the syllabus, so they're the first thing you skim. They're also where the scenario questions get specific.
- Confidence after Foundations made me lazy. I spent four weeks on the "hard" exam and treated the second one as a lap of honour.

Foundations had gaps too, just fewer. My weakest areas there were knowing which rules must be enforced through settings permissions or hooks rather than written in CLAUDE.md, and managing context during long codebase exploration (subagents, scratchpad files, targeted reads).

If I did it again, I'd give Professional the same discipline as Foundations: a domain-by-domain checklist, written notes on the trade-offs in each domain, and plenty of scenario practice on the operational topics. Not more weeks, just more seriousness.

## What the questions actually test

Neither exam is a memory test. The question is almost always "here's a situation, what's the *best* thing to do?", and two or three options are usually plausible. A few patterns I'd train yourself to spot:

- Make it a contract, not a request. If an answer relies on stronger prompt wording ("ONLY return JSON") and another uses a tool schema or structured output, the structural fix is usually right. Prompts lower failure rates; schemas remove failure modes.
- Know what each knob controls. `max_tokens` limits the output, not the context. Temperature changes randomness, not correctness. Many wrong options are a real feature applied to the wrong problem.
- Context is a budget. Long-running agents degrade when old tool results pile up. Compaction, context editing, subagents and caching all exist to spend that budget well.
- Agents aren't free. Subagents pay off for independent work whose raw output the main agent doesn't need. "Use more agents" is rarely the answer to a tightly coupled task.
- For Professional, think like the architect in the room. The best answer often includes evaluation before launch, a human checkpoint before irreversible actions, and a rollout plan, not just a working prototype.

## Free practice questions

While studying, I wrote my own scenario questions to test myself, and I've turned them into two free practice packs on BrainByte: 160 questions for Foundations and 125 for Professional, grouped by exam domain with an explanation for each answer.

[Get the free Claude practice packs →]({{ site.portfolioUrl }}/guides/)

If you're preparing and have a question about either exam, ask in the comments on LinkedIn or try AskHari.ai on this page. Good luck.
