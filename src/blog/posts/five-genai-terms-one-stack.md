---
title: "Agents, Reasoning Models, Vector DBs, RAG and MCP: Five Terms, One Stack"
subtitle: "They get listed as five separate buzzwords. In a real system they are five layers of the same application."
date: 2026-10-22
tags:
  - GenAI
  - Architecture
  - Explainer
excerpt: "Agentic AI, large reasoning models, vector databases, RAG and MCP are usually explained as separate ideas. Here's what each one actually does, what the popular explainers get wrong, and how they stack into one working system."
---

# Agents, Reasoning Models, Vector DBs, RAG and MCP: Five Terms, One Stack

### They get listed as five separate buzzwords. In a real system they are five layers of the same application.

Every few weeks another infographic does the rounds with these five terms in neat boxes: Agentic AI, Large Reasoning Model, Vector Database, RAG, MCP. Each box gets a definition and a couple of product names. Useful as a glossary, but it hides the most important thing: **these aren't alternatives, they're layers.** A production assistant today usually uses all five at once.

So instead of five definitions, here's how each piece works, where the common explanations oversimplify, and how they fit together.

{% figure "five-genai-terms.svg", "Five-row infographic. Agentic AI: memory, tools and goals feed an agent that takes actions on an environment and loops back through observations. Large Reasoning Model: a question passes through several internal reasoning steps before the answer, shown with an apples example. Vector Database: text, image, audio and video go through an embedding model into vectors stored in a vector database. RAG: user query goes to a retriever, which searches a knowledge base and passes relevant chunks with the query to an LLM that generates the response. MCP: a host such as Claude Desktop or an IDE runs one MCP client per MCP server, each server connecting to GitHub, Slack, a database or the filesystem.", "Five terms, five layers: the agent loop, the model that reasons, the database that finds by meaning, the retrieval pattern, and the protocol that connects tools." %}

## 1. Agentic AI: the loop, not the model

A chatbot answers one prompt and stops. An **agent** is given a goal and keeps going until the goal is met.

Under the hood it's a loop:

1. **Plan** — break the goal into steps.
2. **Act** — pick a tool (run code, query a database, search the web, edit a file) and call it.
3. **Observe** — read the result, including errors.
4. **Adjust** — if the call failed or the answer looks wrong, change the plan and try again.

The pieces that make this work are **memory** (what's been done so far), **tools** (what it's allowed to touch), and a **goal** (when to stop).

**What explainers get wrong:** "autonomous" sounds like the agent is clever on its own. It isn't. The intelligence is the model; the agent is the scaffolding around it: the loop, the tool permissions, the stopping condition. Most agent failures I see in practice are scaffolding failures (no budget on retries, tools with vague descriptions, no human checkpoint before something irreversible), not model failures.

**Real examples:** coding agents like Claude Code, Devin and Cursor's agent mode. AutoGPT was the early proof-of-concept; it showed the loop, and also showed how quickly an unbounded loop wanders off.

## 2. Large Reasoning Models: spend compute at answer time

A standard LLM produces its answer token by token straight away. A **Large Reasoning Model** (OpenAI's o-series, DeepSeek-R1, Claude with extended thinking, Gemini's thinking models) first produces a long internal chain of thought, then answers.

- **Trained to think, not prompted to.** "Let's think step by step" was a prompting trick. Reasoning models are trained with reinforcement learning to produce useful reasoning on their own, rewarded when the final answer is verifiably correct.
- **Test-time compute.** Instead of relying only on what was learned during training, they spend more compute *per question*. More thinking tokens usually means better answers on hard problems, and higher latency and cost on every one.
- **Self-correction.** Inside that reasoning the model can try an approach, notice it's wrong, backtrack and try another before you ever see the output.

The classic toy example: *"I have 10 apples, gave 2 away, ate 1. How many do I have?"* A reasoning model walks it: 10, then 8, then 7. But honestly, any modern LLM gets that right. Where reasoning models earn their cost is multi-step maths, competitive programming, debugging, and planning, which is exactly why they pair so well with agents.

**When not to use one:** classification, extraction, summarising, chat. You pay for thinking you don't need. Route easy requests to a fast model and hard ones to a reasoning model.

## 3. Vector Databases: search by meaning

SQL finds rows where `title = 'refund policy'`. A **vector database** finds documents that *mean* something close to "how do I get my money back?", even if they never use those words.

1. An **embedding model** converts text (or images, audio, video) into a long list of numbers: a vector, often 768 to 3,072 dimensions.
2. Things with similar meaning end up close together in that space.
3. At query time, the question is embedded the same way, and the database returns the nearest vectors, using a distance measure such as **cosine similarity**.

**The detail that matters:** comparing a query against every vector is too slow at scale, so vector databases use **Approximate Nearest Neighbour (ANN)** indexes like HNSW or IVF. "Approximate" is the key word: you trade a little recall for a lot of speed. Cosine similarity is the *measure*; ANN is the *search strategy*. Many explainers blur the two.

**Real examples:** Pinecone, Weaviate, Milvus, Qdrant, and increasingly vector support inside databases you already run: pgvector on Postgres, plus Snowflake, BigQuery and Databricks. For a lot of teams, "do we need a vector database?" is really "is pgvector enough?", and often it is.

## 4. RAG: give the model an open book

An LLM only knows what it was trained on. **Retrieval-Augmented Generation** lets it answer from *your* data (policies, tickets, code, contracts) without retraining.

**Ingest (once, then incrementally):**

1. Split documents into chunks.
2. Embed each chunk.
3. Store vectors plus the original text and metadata in a vector database.

**Answer (every question):**

1. The user's question goes to a **retriever**.
2. The retriever searches the knowledge base for relevant chunks.
3. The top chunks come back.
4. The question **plus** those chunks go to the LLM.
5. The LLM writes an answer grounded in that text, ideally with citations.

**What explainers get wrong:** RAG *reduces* hallucination; it doesn't remove it. If retrieval returns the wrong chunk, the model will confidently answer from the wrong chunk. In my experience, RAG quality is almost entirely a **retrieval** problem, not a generation problem. The things that move the needle:

- **Chunking** that respects document structure (headings, sections, tables), not fixed 500-token slices.
- **Hybrid search**: vector search plus keyword (BM25) search, because embeddings are bad at exact product codes, error IDs and names.
- **Reranking**: a second model rescores the top 50 results and keeps the best 5.
- **Evaluation**: a fixed set of real questions with known answers, run on every change.

The knowledge base doesn't have to be a vector store either. PDFs, a SQL database and a code repo can all be retrieval sources. That's where RAG starts to merge into agents: an agent that *decides* where to search is often called agentic RAG (I wrote about that in [Traditional AI vs Agentic AI vs Agentic RAG](/blog/traditional-ai-vs-agentic-ai-vs-agentic-rag/)).

## 5. MCP: one plug for every tool

Before the **Model Context Protocol**, every AI app wrote its own integration for every tool: one connector for GitHub in app A, another in app B. N apps × M tools. MCP, an open standard introduced by Anthropic, turns that into N + M.

The architecture:

- **Host** — the AI application: Claude Desktop, Claude Code, an IDE like Cursor or VS Code.
- **Client** — a connector inside the host. The host creates **one client per server**.
- **Server** — a small program exposing capabilities from one system: GitHub, Slack, a database, your filesystem.

Clients and servers speak **JSON-RPC**, locally over stdio or remotely over HTTP. A server can expose three kinds of things:

- **Tools** — actions the model can call (`create_issue`, `run_query`).
- **Resources** — data the app can read into context (files, records).
- **Prompts** — reusable templates the user can pick.

When a client connects, it asks the server what it offers. That **discovery** step is the real win: plug in a new server and the model can use it immediately, no custom glue code.

**On security, be careful with the marketing.** MCP gives you a clean boundary: each server is isolated, and the host decides which servers are connected and can ask the user before a tool runs. But a server is still code you're running with access to real systems. Prompt injection through tool results, over-broad tokens and unvetted community servers are real risks. Treat an MCP server like any other dependency: review it, scope its credentials, and keep a human in the loop for anything destructive.

## How the five fit together

Picture an internal "ops assistant":

1. You ask: *"Why did last night's billing job fail, and open a ticket for it?"*
2. The **agent** loop takes the goal and plans the steps.
3. A **reasoning model** does the planning and the debugging-style thinking.
4. **RAG** pulls the relevant runbook pages from a **vector database**.
5. **MCP** servers let it read the job logs, query the database, and create the ticket.
6. The agent observes each result, adjusts, and stops when the ticket exists.

| | What it is | Answers the question |
|---|---|---|
| **Agentic AI** | A plan → act → observe loop | *How does it get a multi-step job done?* |
| **Reasoning model** | An LLM trained to think before answering | *How does it solve hard problems?* |
| **Vector database** | Storage + similarity search over embeddings | *How does it find things by meaning?* |
| **RAG** | Retrieve, then generate | *How does it know my data?* |
| **MCP** | A standard protocol for tools and data | *How does it reach my systems?* |

Learn them as a stack and the buzzwords stop being buzzwords. The model thinks, retrieval gives it knowledge, MCP gives it hands, and the agent loop gives it a job to finish.
