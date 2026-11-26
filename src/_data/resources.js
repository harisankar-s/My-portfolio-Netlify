// Free resources vault (/resources/ and /resources/{slug}/ on the apex),
// after charliehills.ai/free-resources: short, practical how-to guides with
// paste-ready prompts, a "check" after each step and a fix table at the end.
// Written in our own words; install lines and commands are copied from each
// tool's own README, so re-check them when a tool changes.
//
// Text fields (p, note, check, table cells, steps) go through the `rich`
// filter: `backticks` become <code>, [text](https://...) becomes a link.
// Prompt and code blocks are shown as written, with a Copy button.
//
// Block types: p, note, check, steps, table, prompt, code, h3.
// Add a resource by adding an object to `list`; set `status: "draft"` to
// keep it off the site while you write it.

const fs = require("fs");
const path = require("path");

const p = (text) => ({ t: "p", text });
const note = (text, label) => ({ t: "note", text, label });
const check = (text, label = "The check") => ({ t: "check", text, label });
const steps = (items) => ({ t: "steps", items });
const table = (head, rows) => ({ t: "table", head, rows });
const prompt = (label, text) => ({ t: "prompt", label, text: text.trim() });
const code = (label, text) => ({ t: "code", label, text: text.trim() });
const h3 = (text, meta) => ({ t: "h3", text, meta });

const categories = [
  { slug: "claude", name: "Claude & Claude Code", icon: "spark", color: "amber" },
  { slug: "video", name: "AI image & video", icon: "play", color: "violet" },
  { slug: "learn", name: "Learn AI", icon: "course", color: "green" },
  { slug: "models", name: "Models & tool stacks", icon: "db", color: "blue" },
];

// The look line used by every shot in the short-film guide.
const LOOK = `Photoreal short film, shot on 35mm anamorphic lenses. Natural skin texture, light film grain, soft glow on bright lights, shallow depth of field, slight handheld movement, real motion blur. Calm, believable acting. Never CGI, never a cartoon or a video game, never plastic or glossy. No readable text, no logos, no brand names, no number plates, no on-screen UI.`;

const list = [
  // ---------------------------------------------------------------- 1
  {
    slug: "four-rules-that-stop-claude-overbuilding",
    title: "Four rules that stop Claude overbuilding",
    seoTitle: "Four Rules That Stop Claude Overbuilding (Free CLAUDE.md)",
    description:
      "One free CLAUDE.md file makes Claude ask before it guesses, keep code small, touch only what you named and prove it works. Two install lines, a Claude app version and a 2-minute test.",
    category: "claude",
    added: "2026-11-26",
    minutes: 5,
    pitch:
      "Claude is quick, but left alone it guesses what you meant, adds things you never asked for and says done before anything proves it. One small rules file, based on Andrej Karpathy's notes on how AI coding goes wrong, fixes all four habits. Here is how to switch it on in Claude Code and in the Claude app, and a 2-minute test to see the difference.",
    startHere:
      "Claude Code: run the two lines in step 2, about a minute. Claude app: paste the short version in step 3 into a Project, about two minutes. Then run the test in step 4.",
    sections: [
      {
        title: "What the four rules change",
        blocks: [
          p("The file is a `CLAUDE.md`: a plain text file of instructions that Claude Code reads before every task. This one holds four rules. Each one targets a habit you have probably already seen."),
          table(
            ["The habit", "The rule", "What you see instead"],
            [
              ["It fills the gaps with its own guesses", "1. Think before coding", "It lists what it assumed and asks before it builds"],
              ["A small job comes back huge", "2. Simplicity first", "The smallest change that does the job, nothing extra"],
              ["It \"tidies\" code you never mentioned", "3. Surgical changes", "It edits only what you named and tells you about the rest"],
              ["It says fixed when nothing was checked", "4. Goal-driven execution", "It says how it will check, then shows you the check"],
            ]
          ),
        ],
      },
      {
        title: "Install it in Claude Code",
        blocks: [
          p("Open Claude Code and paste these two lines, one at a time. The plugin then applies to every project on your machine."),
          code("Paste into Claude Code", `
/plugin marketplace add forrestchang/andrej-karpathy-skills
/plugin install andrej-karpathy-skills@karpathy-skills`),
          p("Then ask it to prove the rules loaded:"),
          prompt("Paste into Claude Code", `Which rules are you following in this project? One line each.`),
          check("A good answer names all four: think first, keep it simple, change only what was asked, and verify before saying done. If it lists none, restart Claude Code and ask again."),
          p("Only want it in one project? Run this inside that project's folder instead. It downloads the file as the project's `CLAUDE.md`."),
          code("Terminal, inside your project folder", `curl -o CLAUDE.md https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md`),
          note("Already have a `CLAUDE.md`? Do not overwrite it with the line above. Paste the rules at the bottom of your own file instead."),
        ],
      },
      {
        title: "No Claude Code? Use it in the Claude app",
        blocks: [
          steps([
            "Open claude.ai and create a new Project.",
            "Open the Project's instructions.",
            "Paste the short version below (or the full file from the repo).",
            "Every chat inside that Project now follows the four rules.",
          ]),
          prompt("Paste into the Project instructions", `
Follow these four rules on every task.

1. Think before you build. Write down what you are assuming. If my request could mean two things, show me both and ask. If something is unclear, stop and ask instead of guessing. If there is a simpler way, say so.

2. Keep it simple. Build only what I asked for. No extra features, settings or "just in case" code. If the answer could be half as long, make it half as long.

3. Change only what I named. Do not reformat, rename or "improve" anything I did not mention. If you spot something else worth fixing, tell me and leave it alone.

4. Prove it before you say done. Before you start, tell me how you will check the result. When you finish, show me that check. For bigger jobs, give me a short plan with a check for each step.

If my own instructions disagree with these rules, mine win.`),
          note("This is a short version in our own words. The full file in the repo has more detail and is MIT licensed, so you can paste that instead."),
        ],
      },
      {
        title: "A 2-minute test",
        blocks: [
          p("Paste this with the rules on. Claude should answer the three questions and stop, before it writes any code."),
          prompt("Paste into Claude", `
I want a small script that loads yesterday's orders CSV into a Postgres table every night.

Before you write anything, tell me:
1. What you are assuming about my setup.
2. The questions you need answered first.
3. How you will check it works before you tell me it is done.`),
          check("You get assumptions (file location, table name, what happens to duplicates), a few questions and a test plan, and no code yet. If it jumps straight to a script, the rules did not load."),
        ],
      },
      {
        title: "The rules on real jobs",
        blocks: [
          table(
            ["You ask", "Without the rules", "With the rules"],
            [
              ["Build a dashboard for our weekly sales numbers", "Invents column names, picks a chart library and fills it with fake data", "Asks where the data lives, which numbers matter and who reads it"],
              ["Add a discount column to the orders model", "Adds the column, a config system for discounts and three helper functions", "Adds the column and the one line that fills it"],
              ["Rename the date field in this SQL query", "Renames it, then reformats the whole query and rewrites two joins", "Renames the field. Mentions the joins look slow and leaves them"],
              ["Fix the failing nightly load", "Says fixed. It fails again tonight", "Says fixed means a test run loads all rows, runs it and shows the row count"],
            ]
          ),
        ],
      },
      {
        title: "Make it a habit",
        blocks: [
          steps([
            "**Ask for the plan first.** Say \"give me a 3-step plan with a check for each step\" before any big job.",
            "**Scope small edits out loud.** \"Only change the headline. Tell me anything else you notice.\" Rule 3 does the rest.",
            "**Say when speed matters more.** For a typo, say \"small job, just do it\". The rules lean towards caution on purpose.",
            "**Add your own rules underneath.** Your style guide, naming rules or brand voice go below the four rules in the same file.",
          ]),
        ],
      },
    ],
    fixes: [
      ["`/plugin` is not recognised", "You are in the Claude app, not Claude Code. Use the Project route in step 3."],
      ["It still never asks questions", "Ask the check question from step 2. If it cannot list the rules, restart Claude Code inside the project folder."],
      ["It asks too many questions on tiny jobs", "That is the trade-off. Say \"small job, just do it\" for quick fixes."],
      ["You already have a `CLAUDE.md`", "Do not replace it. Paste the four rules at the bottom by hand."],
      ["Your rules and these disagree", "Add a first line: \"If my rules and these rules disagree, mine win.\""],
    ],
    next: [
      "Install it in Claude Code, or paste the short version into a Project.",
      "Run the 2-minute test.",
      "Use \"plan first, with a check per step\" on your next real job.",
    ],
    sources:
      "Rules file: [github.com/forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) (MIT licence), built from Andrej Karpathy's public notes on LLM coding mistakes. The short version above is our own wording.",
  },

  // ---------------------------------------------------------------- 2
  {
    slug: "free-ai-courses-on-github",
    title: "7 free AI courses on GitHub, and which one to start with",
    seoTitle: "7 Free AI Courses on GitHub and Where to Start",
    description:
      "Seven free AI courses on GitHub, from your first agent to building an LLM from scratch. Which one fits you, the lesson to open first, what each costs to run and a prompt that turns Claude into your tutor.",
    category: "learn",
    added: "2026-11-26",
    minutes: 6,
    pitch:
      "Some of the best AI courses are free, sitting on GitHub, and look like a wall of files if you have never used it. This guide picks the right one for where you are, names the exact lesson to open first, says what it costs to run, and gives you a prompt that turns Claude into a patient tutor for any of them.",
    startHere:
      "Find your line in the table below. Open that course's first lesson, paste the tutor prompt from step 4 into Claude next to it, and finish that one course before you start another.",
    sections: [
      {
        title: "Pick your starting point",
        blocks: [
          table(
            ["If this is you", "Start with", "Why"],
            [
              ["You use ChatGPT or Claude daily but have never built an agent", "AI Agents for Beginners (Microsoft)", "Short lessons, each with text and code, most with a video"],
              ["You want a certificate at the end", "Hugging Face Agents Course", "Structured units that end in a project you can get certified on"],
              ["You mostly use Claude and want to go past the chat box", "Anthropic Courses", "Anthropic's own path from prompting to tool use"],
              ["Your agent works in demos and breaks in real use", "12-Factor Agents (HumanLayer)", "Twelve short principles for agents that hold up. Reading only"],
              ["You need to put an agent in front of customers", "Agents Towards Production (Nir Diamant)", "Hands-on tutorials on memory, security and deployment"],
              ["You use Claude Code or Codex every day", "Learn Harness Engineering (WalkingLabs)", "How to make coding agents reliable on real projects"],
              ["You want to know how the model works inside", "LLMs From Scratch (Sebastian Raschka)", "Build a small GPT-style model, chapter by chapter"],
            ]
          ),
          note("Data engineers: Anthropic Courses then 12-Factor Agents is a good pair. The first teaches you to drive the model, the second how to build agents you can run in production without babysitting them."),
        ],
      },
      {
        title: "The 7 courses, and the lesson to open first",
        blocks: [
          h3("1. AI Agents for Beginners", "Microsoft · [github.com/microsoft/ai-agents-for-beginners](https://github.com/microsoft/ai-agents-for-beginners)"),
          p("**For:** anyone who has never built an agent. **Open first:** lesson 1, the introduction to agents and their use cases. Lessons 3 (design patterns) and 4 (tool use) are where it clicks."),
          p("**Cost:** reading is free. The code samples are built for Microsoft's Azure AI services, so running them needs an Azure account; the setup page lists other providers some samples work with."),
          h3("2. Hugging Face Agents Course", "[github.com/huggingface/agents-course](https://github.com/huggingface/agents-course)"),
          p("**For:** people who want structure and a finish line. **Open first:** unit 1, the introduction to agents. Unit 2 compares a few agent frameworks: pick one and stay with it."),
          p("**Cost:** free with a free Hugging Face account. Expects basic Python."),
          h3("3. Anthropic Courses", "[github.com/anthropics/courses](https://github.com/anthropics/courses)"),
          p("**For:** Claude users. Five courses, from API basics through prompt engineering, real-world prompting, evaluations and tool use. **Open first:** the interactive prompt engineering tutorial. It is the friendliest one if you do not code."),
          p("**Cost:** reading is free; running the exercises needs a Claude API key. The courses were written for older, cheaper Claude models, so check the current model names in Anthropic's docs."),
          h3("4. 12-Factor Agents", "HumanLayer · [github.com/humanlayer/12-factor-agents](https://github.com/humanlayer/12-factor-agents)"),
          p("**For:** anyone whose agent works most of the time and falls over on the rest. **Open first:** factor 2, own your prompts. It is the one people skip and the one that fixes most of the mess."),
          p("**Cost:** free, nothing to install. Treat it as principles, not a list of current tools."),
          h3("5. Agents Towards Production", "Nir Diamant · [github.com/NirDiamant/agents-towards-production](https://github.com/NirDiamant/agents-towards-production)"),
          p("**For:** taking an agent from demo to something customers rely on. **Open first:** the tutorials folder. Pick the topic that hurts most right now: memory, security or deployment."),
          p("**Cost:** tutorials are free. Many use outside services (vector stores, GPU hosts, search APIs) that charge past their free tier."),
          h3("6. Learn Harness Engineering", "WalkingLabs · search GitHub for \"learn harness engineering\""),
          p("**For:** daily Claude Code or Codex users. The idea: give the agent a small set of files that say what to do, what is done and how to check it, so every session starts from the same place. **Open first:** the quick start, which works on a project you already have."),
          p("**Cost:** free. You need a coding agent you already pay for."),
          h3("7. LLMs From Scratch", "Sebastian Raschka · [github.com/rasbt/LLMs-from-scratch](https://github.com/rasbt/LLMs-from-scratch)"),
          p("**For:** the curious. The code for his book on building a large language model. **Open first:** the setup folder, then chapter 2 on working with text. Chapter 1 has no code."),
          p("**Cost:** the code is free and runs on a normal laptop. The book is paid, but you can follow the notebooks without it."),
        ],
      },
      {
        title: "Never used GitHub? Read a course in your browser",
        blocks: [
          p("You do not need to install anything to read these. Setup only matters when you want to run the code."),
          steps([
            "Open the course link.",
            "Scroll past the list of files. The course itself is the page underneath, called the README.",
            "Click the first lesson link named above.",
            "Read it like a web page. Code blocks are examples; you can read past them.",
            "When you want to run something, go back to the course's setup page.",
          ]),
        ],
      },
      {
        title: "Turn Claude into your tutor",
        blocks: [
          p("Open the lesson in one tab and Claude in another. Paste this, with your own role in the first line. It works for all seven courses."),
          prompt("Paste into Claude", `
I'm a [your role, e.g. data engineer / teacher / product manager], and I'm working through [course name].
This is the lesson I'm on: [paste the lesson link or the lesson text]

1. Explain the main idea in plain English, in five lines or fewer.
2. Give me one example of it from my kind of work.
3. Ask me three short questions to check I understood. Wait for my answers before you carry on.
4. Give me one thing I can try today in under 15 minutes.`),
          check("You get a short explanation, an example from your job and three questions, and then it stops and waits. If it carries on without waiting, reply: \"Stop. Ask me the questions first.\""),
        ],
      },
      {
        title: "Your first four weeks",
        blocks: [
          table(
            ["Week", "Do this"],
            [
              ["1", "Pick your course from the table. Open the first lesson and run the tutor prompt on it."],
              ["2", "Do the next two lessons. Write down one idea from each that you could use at work."],
              ["3", "Do one exercise for real, or the 15-minute task Claude gives you."],
              ["4", "Finish the course or reach its first project. Only then pick the next one."],
            ]
          ),
        ],
      },
    ],
    fixes: [
      ["The repo is a wall of files", "Scroll down. The README under the file list is the course."],
      ["A code sample asks for a key you do not have", "Read past it. Come back to setup once you want to run things."],
      ["The model names in a lesson look old", "Courses age faster than the ideas. Swap in the current model name from the provider's docs."],
      ["You keep starting new courses", "Finish one first. The four-week plan above is there for that."],
    ],
    next: [
      "Pick your line in the table.",
      "Open that course's first lesson and run the tutor prompt.",
      "Block 30 minutes, three times a week, for four weeks.",
    ],
    sources:
      "Every course belongs to its authors and is free on GitHub. Course structure and costs change, so check each README before you start.",
  },

  // ---------------------------------------------------------------- 3
  {
    slug: "add-3d-animations-to-your-videos-with-claude",
    title: "Add 3D animations to your videos with Claude Code",
    seoTitle: "Add 3D Animations to Your Videos With Claude Code",
    description:
      "Drop a recording in a folder, paste one prompt into Claude Code, and every key word you say gets a 3D object built in three.js and timed to the word. The prompt, a 5-minute first test, storyboard notes and fixes.",
    category: "video",
    added: "2026-11-26",
    minutes: 5,
    pitch:
      "Talking-head videos are easy to record and hard to make interesting. Claude Code can cut your recording to the best take and add a real 3D object, built in three.js, on every key word, landing on the exact word. You approve a storyboard first, so nothing is built until it looks right.",
    startHere:
      "Do the 5-minute test in step 3 first, in an empty folder. If the 3D looks good there, run the full editing prompt on a real recording.",
    sections: [
      {
        title: "The three steps",
        blocks: [
          steps([
            "**Put your recording in a folder.** Open Claude Code on that folder and pick the strongest model in the menu (Opus 5.5 or Fable 5.2 if your plan has it).",
            "**Paste the editing prompt.** It cuts the video and plans a 3D moment for each key word.",
            "**Review the storyboard.** Give notes on the stills, one at a time, then say yes and it builds the video.",
          ]),
        ],
      },
      {
        title: "The editing prompt",
        blocks: [
          p("Paste this into Claude Code from inside the folder with your recording."),
          prompt("Paste into Claude Code", `
Here is my recording. Cut it to the best take and remove long pauses and repeated lines.
Then add a 3D animation built in three.js on each key word I say, timed to land on the exact word, using the word timings from a transcript.
Before you build anything, show me a storyboard: one still per scene, with the word each one lands on. Wait for my yes.`),
          note("Claude Code will need ffmpeg and Node to turn scenes into a video. If it asks to install them, say yes."),
        ],
      },
      {
        title: "Try one 3D object first",
        blocks: [
          p("About five minutes. Paste this into a fresh Claude Code session in an empty folder, then open `index.html` in your browser. It shows you the quality to expect before you touch a real video."),
          prompt("Paste into Claude Code", `
Build one self-contained HTML file that uses three.js (loaded from https://unpkg.com/three@0.160.0 with an import map) to show a glowing 3D globe at night.
Thin arcs of light fly between cities like data moving between servers, each arc leaving a fading trail. Add a soft atmosphere glow around the globe, a slow starfield behind it, and let me drag to orbit the camera.
Make it look cinematic, not like a demo. Save it as index.html.`),
          check("Arcs leave the surface, travel and fade. If they are flat lines on the globe, ask: \"lift the arcs above the surface and give each one a trail that fades out.\""),
        ],
      },
      {
        title: "Notes that improve the storyboard",
        blocks: [
          p("Send one note per round, so each round changes one thing and you can see what it did."),
          table(
            ["Fix", "Say this"],
            [
              ["Timing", "Scene 3: land the object on the word \"pipeline\", not before it."],
              ["Size", "Make every object larger. It should fill the top half of the frame."],
              ["Your face", "Keep my face in a card at the bottom while I talk, with the 3D scene above it."],
              ["Realism", "The cube looks like a plain box. Give it a real material, soft studio light and a floor shadow."],
            ]
          ),
          check("Every scene in the storyboard names the word it lands on. If one does not, ask: \"which word does scene 4 land on? Move it to that word.\""),
        ],
      },
      {
        title: "What you should get back",
        blocks: [
          steps([
            "A cut of your recording, with pauses and repeated takes removed.",
            "A storyboard: one still per scene, each with the word it lands on.",
            "After your yes, the finished video with the 3D objects in it.",
          ]),
        ],
      },
    ],
    fixes: [
      ["It describes the scenes but makes no video", "Say: \"The finished mp4 is the deliverable. Build it now.\""],
      ["Objects arrive early or late", "It timed them to sentences. Say: \"Time every object to the exact word from the transcript timings.\""],
      ["Black frames where the 3D should be", "Say: \"Wait for each three.js frame to render before capturing it, then check 10 frames by eye.\""],
      ["It asks to install ffmpeg or Node", "Say yes. They turn the scenes into a video file."],
      ["Your preferred model is not in the menu", "Update Claude Code, or pick the best model you have. The prompt is the same."],
    ],
    next: [
      "Run the 5-minute globe test.",
      "Put tonight's recording in a folder and paste the editing prompt.",
      "Give one storyboard note at a time, then say yes.",
    ],
    sources: "three.js is free and open source: [threejs.org](https://threejs.org).",
  },

  // ---------------------------------------------------------------- 4
  {
    slug: "claude-connectors-worth-adding",
    title: "8 Claude connectors most people never add",
    seoTitle: "8 Claude Connectors Most People Never Add",
    description:
      "Eight Claude connectors that change real work: live web research, site analytics, social stats, a website voice agent, AI video, animated explainers, scraping and current code docs. Setup, a prompt and a check for each.",
    category: "claude",
    added: "2026-11-26",
    minutes: 8,
    pitch:
      "Most people connect Gmail, Slack and Notion to Claude and stop there. These eight do more: they let Claude research the live web, read your analytics, pull your social numbers, build a voice agent, make video, scrape public pages and read current docs. Each comes with the setup, one prompt to paste and how to tell it worked.",
    startHere:
      "Add Exa, Apify and Metricool first; together they take about five minutes. Then paste the first prompt in step 2. Three ideas with sources means everything is live.",
    sections: [
      {
        title: "The 8 at a glance",
        blocks: [
          table(
            ["Connector", "What Claude can do with it", "How to add it"],
            [
              ["Exa", "Search the live web and read whole pages, not just links", "Claude's directory"],
              ["PostHog", "Answer questions about your website analytics, with charts", "Claude's directory"],
              ["Metricool", "Your social stats, best posting times and competitors", "Claude's directory"],
              ["ElevenLabs", "Build a voice or chat agent that answers questions on your site", "Claude's directory"],
              ["Higgsfield", "AI images and video from a prompt or a product photo", "Custom connector"],
              ["HyperFrames", "Animated slides, explainers and motion graphics, by HeyGen", "Claude's directory"],
              ["Apify", "Ready-made scrapers for public sites and profiles", "Claude's directory"],
              ["Context7", "Current docs for any library, so Claude stops writing old code", "Claude's directory"],
            ]
          ),
        ],
      },
      {
        title: "The first thing to try",
        blocks: [
          p("Three connectors in one request. It proves they all work together before you set up the rest."),
          prompt("Paste into a new chat", `
Use Exa to find the 5 most discussed articles from the last 30 days about [your topic].
Use Apify to pull the last 30 posts from [a competitor's public Instagram or LinkedIn URL].
Use Metricool to pull my own posts from the last 90 days.

Then give me 3 post ideas that the articles cover, the competitor has not posted about, and that match the formats that worked best for me. Show the source for each idea.`),
          check("Three ideas, each naming the article it came from, confirming the competitor has not covered it, and naming which of your formats it follows."),
        ],
      },
      {
        title: "How to add them",
        blocks: [
          p("**Seven are in Claude's directory.**"),
          steps([
            "In Claude, open Customize, then Connectors.",
            "Click the + next to Connectors.",
            "Search for the name, open it, then click Connect.",
            "Sign in to that tool.",
            "In a chat, click + at the bottom left, hover Connectors and switch it on.",
          ]),
          p("**Higgsfield is added by its address.**"),
          steps([
            "In Claude, open Customize, then Connectors.",
            "Click + Add, then Add custom connector.",
            "Name it Higgsfield and paste `https://higgsfield.ai/mcp` as the remote MCP server URL. Click Continue.",
            "Sign in to Higgsfield, then click Add.",
            "Switch it on in a chat, as above.",
          ]),
          note("On the Free plan you can add one custom connector, so Higgsfield uses your one slot."),
          p("Check each connector loaded with this. It does not run anything."),
          prompt("Paste into a new chat", `What tools do you have from [connector name]? List them. Do not run any.`),
        ],
      },
      {
        title: "One Project that knows all 8",
        blocks: [
          p("Make a Project called Growth desk, switch the eight connectors on, and paste this into its instructions. The cost and approval rules matter: several of these tools spend credits."),
          prompt("Paste into the Project instructions", `
You have these connectors: Exa (web research), PostHog (my site analytics), Metricool (my social stats and scheduling), ElevenLabs (voice agents), Higgsfield (images and video), HyperFrames (animated explainers), Apify (scraping), Context7 (current code docs).

Before any task, say which connectors you will use and why.
Never publish, schedule, send or spend credits without asking me first.
Show me the cost before any run that uses credits.
Show the source and date for anything you found on the web.`),
          check("Ask: \"Which connectors would you use to find my best LinkedIn post this month?\" A working Project names Metricool. A broken one says it cannot see your social data."),
        ],
      },
      {
        title: "Each connector, one prompt",
        blocks: [
          h3("1. Exa", "Claude's directory · needs an Exa sign-in"),
          prompt("Paste this", `Use Exa to find the 10 best articles from the last 30 days about [your topic]. For each, give me the title, link, date and its single most useful line. Then tell me one angle none of them cover.`),
          check("Open two links. The quoted line should be on the page, word for word."),
          h3("2. PostHog", "Claude's directory · needs PostHog tracking your site"),
          prompt("Paste this", `Using PostHog, show me the funnel from first visit to sign-up for the last 30 days. Name the step where most people drop off, show it as a chart, and list what those visitors did just before they left.`),
          check("The visitor count should match your PostHog dashboard for the same 30 days."),
          h3("3. Metricool", "Claude's directory · needs your profiles connected in Metricool"),
          prompt("Paste this", `Using Metricool, pull my LinkedIn and Instagram posts from the last 90 days. Rank the top 10 by engagement rate, tell me what they have in common, and give me my best day and hour to post on each network.`),
          check("Pick your top post from the table and check its numbers in Metricool. They should match."),
          h3("4. ElevenLabs", "Claude's directory · needs an ElevenLabs account; agents bill per use"),
          prompt("Paste this", `Using ElevenLabs, create a voice agent for my website. It answers questions about [your offer] using this page: [URL]. It asks every caller three questions: their role, their budget and their timeline. Give me the shareable widget link when it is ready.`),
          check("Open the link and ask something only your page answers. It should answer from your page."),
          h3("5. Higgsfield", "Custom connector · needs a Higgsfield account with credits"),
          prompt("Paste this", `Using Higgsfield, make a 5-second cinematic video of [your product] on a desk at golden hour, with a slow push in. Tell me the credit cost before you generate anything.`),
          check("Claude stops and shows the cost before it spends anything. If it does not, add the Project rules from step 4."),
          h3("6. HyperFrames", "Claude's directory · needs a HeyGen sign-in"),
          prompt("Paste this", `Using HyperFrames, turn these 5 points into a 20-second animated explainer, 1080x1920, in my brand colours [hex codes]: [paste your points]`),
          check("Watch it once with the sound off. Every point should be readable before the next one appears."),
          h3("7. Apify", "Claude's directory · needs an Apify account; runs use credit"),
          prompt("Paste this", `Using Apify, scrape the last 50 posts from [competitor's public profile URL]. Give me a table with the post, date, likes and comments, then their 3 best formats and how often they post.`),
          check("Open their profile and spot-check two posts. The numbers should be close to what you see."),
          h3("8. Context7", "Claude's directory · needs a Context7 sign-in"),
          prompt("Paste this", `Use Context7 to get the current docs for [library, e.g. Stripe Checkout or the Databricks SDK], then write the code to [what you need]. Tell me which docs version you read.`),
          check("The version Claude names should match the latest on the library's own docs site."),
        ],
      },
      {
        title: "Four workflows that chain them",
        blocks: [
          h3("Competitor gap", "Apify + Metricool"),
          prompt("Paste this", `Using Apify, pull the last 50 posts from [competitor profile URL]. Using Metricool, pull my last 50. Give me a table of the topics and formats they post that I never have, ranked by their engagement.`),
          h3("Fix the leaky page", "PostHog + Exa"),
          prompt("Paste this", `Using PostHog, find the page where most visitors leave before signing up. Then use Exa to find 5 pages from well-known brands that handle the same step well. Give me 3 changes to make, easiest first.`),
          h3("Launch video", "Higgsfield + HyperFrames + Metricool"),
          prompt("Paste this", `Using Higgsfield, make a 5-second shot of [product] and show me the cost first. Then use HyperFrames to build a 20-second explainer around that shot with these 3 points: [points]. Draft it in Metricool for [day and time] and wait for my yes before scheduling.`),
          h3("What callers keep asking", "ElevenLabs"),
          prompt("Paste this", `Using ElevenLabs, read last week's conversations with my website agent. Give me the 5 questions people asked most, in their exact words.`),
        ],
      },
    ],
    fixes: [
      ["Claude says it has no tool for that", "The connector is off in this chat. Click + at the bottom left, hover Connectors and switch it on."],
      ["Higgsfield is not in the directory", "It is not listed there. Add it as a custom connector with `https://higgsfield.ai/mcp`."],
      ["You can only add one custom connector", "That is the Free plan limit. Use it for Higgsfield; the other seven are in the directory."],
      ["PostHog comes back empty", "PostHog is not tracking your site yet, or the wrong project is picked. Name the project in your prompt."],
      ["An Apify run stops halfway", "You ran out of credit or the profile is private. Check your credit or pick a public profile."],
      ["ElevenLabs will not make a voiceover", "This connector builds agents, not voiceovers. Make voiceovers in the ElevenLabs app."],
      ["Claude spent credits without asking", "Nothing told it to ask. Add the Project instructions from step 4."],
    ],
    next: [
      "Add Exa, Apify and Metricool from the directory.",
      "Paste the first prompt and check the sources.",
      "Make the Growth desk Project with its instructions.",
      "Add the other five one at a time, running each prompt once.",
    ],
    sources:
      "Connector names and menus change often. If a menu has moved, search the directory by name. Only connect tools you already trust with your data.",
  },

  // ---------------------------------------------------------------- 5
  {
    slug: "github-repos-for-claude-code",
    title: "15 GitHub repos that make Claude Code better",
    seoTitle: "15 GitHub Repos for Claude Code: Every Install Line",
    description:
      "Fifteen free GitHub repos for Claude Code, sorted by job: code, memory and context, design, writing and research, and safety. The link, the install line, the first thing to type and what each one needs.",
    category: "claude",
    added: "2026-11-26",
    minutes: 10,
    pitch:
      "Claude Code gets noticeably better with the right skills and plugins, and noticeably worse with a pile of them. Here are fifteen free repos sorted by the job they do. Each has its link, the install line from its own README, the first thing to type, and what it needs on your machine. Install one for the job you do most, not all fifteen.",
    startHere:
      "Pick one repo for the job you do most. Before you install a skill you have never used, scan it with SkillSpector (step 2). Most installs take under a minute.",
    sections: [
      {
        title: "The 15 at a glance",
        blocks: [
          table(
            ["Job", "Repo", "What it does"],
            [
              ["Code", "mattpocock/skills", "Matt Pocock's own skills for real engineering work"],
              ["Code", "superpowers", "Makes the agent brainstorm and plan before it writes code"],
              ["Code", "ECC", "Plans, tests changes, reviews its own work and remembers what matters"],
              ["Code", "ponytail", "Writes only what the task needs and reuses existing code first"],
              ["Code", "agent-skills", "Production-grade engineering skills by Addy Osmani"],
              ["Memory", "graphify", "Turns your project into a knowledge graph Claude can query"],
              ["Memory", "claude-mem", "Takes notes while Claude works so the next session starts informed"],
              ["Memory", "headroom", "Compresses logs and tool output so Claude reads fewer tokens"],
              ["Memory", "repomix", "Packs a whole repository into one AI-friendly file"],
              ["Design", "taste-skill", "Pushes Claude towards real-company website quality"],
              ["Design", "impeccable", "A design vocabulary: polish, critique, audit, catch AI-looking work"],
              ["Writing", "humanizer", "Makes AI-written text read like a person wrote it"],
              ["Research", "last30days", "Researches a topic across the last 30 days of Reddit, X and more"],
              ["Marketing", "marketingskills", "Skills for copy, SEO, conversion and analytics"],
              ["Safety", "SkillSpector", "NVIDIA's scanner for risky patterns in agent skills"],
            ]
          ),
        ],
      },
      {
        title: "Scan before you install",
        blocks: [
          p("A popular repo is not automatically a safe one. A skill runs with your access to your files and terminal, so read its README and scan it first. SkillSpector is the last repo on this list and the first one to install."),
          code("Terminal, after installing SkillSpector (repo 15)", `skillspector scan https://github.com/obra/superpowers --no-llm`),
          check("You get a risk score and a list of findings. Read every HIGH finding before you install. Without `--no-llm` it runs a deeper check using your own model key."),
        ],
      },
      {
        title: "Code",
        lead: "Five repos that make Claude plan, test and review like a careful senior engineer.",
        blocks: [
          h3("1. mattpocock/skills", "[github.com/mattpocock/skills](https://github.com/mattpocock/skills)"),
          code("Install (pick one route)", `
claude plugin install mattpocock-skills@claude-plugins-official
# or
npx skills@latest add mattpocock/skills -a <agent>`),
          p("**First thing to type:** `/setup-matt-pocock-skills`, once per repo. Then try `/grill-me` on your next plan or `/tdd` for a new feature. **Needs:** one install route only, or every skill appears twice."),
          h3("2. superpowers", "[github.com/obra/superpowers](https://github.com/obra/superpowers)"),
          code("Install (pick one route)", `
/plugin install superpowers@claude-plugins-official
# or
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace`),
          p("**First thing to type:** nothing special. Ask it to build something and the brainstorming skill starts before any code. **Needs:** nothing extra."),
          h3("3. ECC", "[github.com/affaan-m/ECC](https://github.com/affaan-m/ECC)"),
          code("Install (pick one route)", `
npx ecc-universal@latest setup
# or
/plugin marketplace add https://github.com/affaan-m/ECC
/plugin install ecc@ecc`),
          p("**First thing to type:** `/ecc:plan \"Add authentication\"`. **Needs:** Node.js 18+. The plugin route also needs Git. Check the README for the current setup version."),
          h3("4. ponytail", "[github.com/DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)"),
          code("Install (two separate prompts)", `
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail`),
          p("**First thing to type:** `/ponytail full`, then `/ponytail-review` on your last change. **Needs:** install it only from that exact account; look-alike copies exist."),
          h3("5. agent-skills", "Addy Osmani · [github.com/addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)"),
          code("Install (pick one route)", `
/plugin marketplace add addyosmani/agent-skills
/plugin install agent-skills@addy-agent-skills
# or
npx skills add addyosmani/agent-skills`),
          p("**First thing to type:** `/spec`, then `/plan`, `/build`, `/test`, `/review` and `/ship`. If a name clashes with a built-in command, use `/agent-skills:review`."),
        ],
      },
      {
        title: "Memory and context",
        lead: "Four repos that give Claude more of your project in fewer tokens, and carry it into tomorrow.",
        blocks: [
          h3("6. graphify", "[github.com/Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify)"),
          code("Terminal (not inside Claude)", `
uv tool install graphifyy
graphify install`),
          p("**First thing to type:** `/graphify .` in Claude Code. It writes a `graphify-out` folder with a clickable map. **Needs:** Python 3.11+ and uv. The package name has two y's. Full walkthrough: [Give Claude a map of your codebase](/resources/give-claude-a-map-of-your-codebase/)."),
          h3("7. claude-mem", "[github.com/thedotmack/claude-mem](https://github.com/thedotmack/claude-mem)"),
          code("Install", `
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem`),
          p("**First thing to type:** nothing. Restart Claude Code and it runs on its own; ask about past work and it searches its notes. **Needs:** Node.js 20+. Anonymous usage analytics are on by default, so read the README's privacy section."),
          h3("8. headroom", "[github.com/headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom)"),
          code("Terminal (not inside Claude)", `
uv tool install --python 3.13 "headroom-ai[all]"
headroom wrap claude`),
          p("**Then:** `headroom dashboard` shows what it saved; `headroom unwrap claude` undoes it. **Needs:** Python 3.11+. Apple Silicon Macs and Linux; Intel Macs use the Docker install in the README."),
          h3("9. repomix", "[github.com/yamadashy/repomix](https://github.com/yamadashy/repomix)"),
          code("Install", `
/plugin marketplace add yamadashy/repomix
/plugin install repomix-mcp@repomix
/plugin install repomix-commands@repomix`),
          p("**First thing to type:** `/repomix-commands:pack-local`, or pack someone else's repo with `/repomix-commands:pack-remote yamadashy/repomix`. **Needs:** install `repomix-mcp` first."),
        ],
      },
      {
        title: "Design",
        lead: "Two repos that stop Claude building pages that look AI-made.",
        blocks: [
          h3("10. taste-skill", "[github.com/Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)"),
          code("Install", `
/plugin marketplace add Leonxlnx/taste-skill
/plugin install taste-skill@taste-skill`),
          p("**First thing to type:** just ask, e.g. \"Build a homepage for [your company]. [One line on what you do.]\" **Needs:** Node 22+ and a Chromium-based browser. No API keys."),
          h3("11. impeccable", "[github.com/pbakaus/impeccable](https://github.com/pbakaus/impeccable)"),
          code("Install", `npx impeccable install`),
          p("**First thing to type:** `/impeccable init` once per project, then e.g. `/impeccable critique the pricing cards`. **Needs:** nothing extra for the basic checks."),
        ],
      },
      {
        title: "Writing and research",
        lead: "Three repos for text that sounds like you, current research and marketing copy.",
        blocks: [
          h3("12. humanizer", "[github.com/blader/humanizer](https://github.com/blader/humanizer)"),
          code("Install", `
/plugin marketplace add blader/humanizer
/plugin install humanizer@humanizer`),
          p("**First thing to type:** `/humanizer [paste your text]`. **Good to know:** it is for readability, not for fooling AI detectors, and its own README says so."),
          h3("13. last30days", "[github.com/mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill)"),
          code("Install", `
/plugin marketplace add mvanhorn/last30days-skill
/plugin install last30days`),
          p("**First thing to type:** `/last30days [your topic]`. **Needs:** Reddit and arXiv work with no key; some other sources need their own."),
          h3("14. marketingskills", "[github.com/coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills)"),
          code("Install", `
/plugin marketplace add coreyhaines31/marketingskills
/plugin install marketing-skills`),
          p("**First thing to type:** `/seo-audit`, `/cro` or `/emails`, or just \"Write homepage copy for my product.\""),
        ],
      },
      {
        title: "Safety",
        lead: "The one to install before all the others.",
        blocks: [
          h3("15. SkillSpector", "NVIDIA · [github.com/NVIDIA/SkillSpector](https://github.com/NVIDIA/SkillSpector)"),
          code("Terminal (not inside Claude)", `uv tool install --python 3.13 git+https://github.com/NVIDIA/skillspector.git`),
          p("**First thing to type:** `skillspector scan https://github.com/user/some-skill`. Add `--no-llm` for a scan that needs no API key. **Needs:** Python 3.12 or 3.13."),
        ],
      },
    ],
    fixes: [
      ["`/plugin` is not a command", "You are in Claude on the web or the desktop chat. Run it in the Claude Code CLI in a terminal."],
      ["Permission denied (publickey) during install", "Git is trying SSH. Set Git to use HTTPS for GitHub, as the agent-skills README explains."],
      ["Every skill shows up twice", "You installed one repo by two routes. Remove one and keep the `/plugin` route."],
      ["graphify, headroom or skillspector: command not found", "These install in your terminal, not inside Claude. Install uv first, then open a new terminal window."],
      ["A Python version error", "graphify and headroom need 3.11+, SkillSpector 3.12 or 3.13. `uv` can install the right one for you."],
      ["A new skill does nothing", "Claude Code has not reloaded. Restart it and try the skill's first command."],
    ],
    next: [
      "Install SkillSpector and scan the first repo you want.",
      "Install one repo for the job you do most and run its first command.",
      "Add a second one a week later, once the first has stuck.",
    ],
    sources:
      "Install lines are taken from each repo's own README in November 2026. READMEs change often: if a line fails, open the repo and check its install section. Every repo belongs to its authors.",
  },

  // ---------------------------------------------------------------- 6
  {
    slug: "free-repos-for-better-claude-videos",
    title: "6 free repos for Claude videos that do not look AI-made",
    seoTitle: "6 Free GitHub Repos for Better Claude Code Videos",
    description:
      "Six free GitHub skills that turn Claude Code into a video maker: product promos from your site, narrated explainers, kinetic typography, smoother Remotion motion, painted music videos and hand-drawn explainers.",
    category: "video",
    added: "2026-11-26",
    minutes: 6,
    pitch:
      "Ask Claude Code for a video and you usually get something that moves like a slide deck. These six free repos teach it real motion design: camera moves, eased timing, style briefs, hand-drawn strokes. Each one gets its link, what it makes, what you give it and one prompt you can paste. All six run on your own computer.",
    startHere:
      "Open Claude Code in an empty folder and paste the Bang Motion prompt (repo 3). It needs no keys and no voice, so it is the quickest way to see what these repos do. Then pick the one that matches what you make.",
    sections: [
      {
        title: "The 6 at a glance",
        blocks: [
          table(
            ["Repo", "What it makes", "You give it"],
            [
              ["Video Shotcraft", "A cinematic promo built from your real web pages", "Your website link"],
              ["Anything2Explainer", "A narrated explainer with diagrams and subtitles", "A topic"],
              ["Bang Motion", "Openers, promos and kinetic typography", "A topic and a style"],
              ["Claude Remotion Skill", "Smoother motion graphics with proper timing", "A topic or a script"],
              ["Paint MV", "A hand-painted music video", "A song and its lyrics"],
              ["Hand-Drawn Explainer", "A hand sketching every picture, stroke by stroke", "Your script"],
            ]
          ),
          note("Every prompt below starts with \"Install\" and the repo link. Claude Code clones the repo, reads its instructions and makes the video in the same session. Swap the part in [brackets] for your own.", "How the prompts work"),
        ],
      },
      {
        title: "The six repos",
        blocks: [
          h3("1. Video Shotcraft", "[github.com/Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) · Apache-2.0"),
          p("Captures your real website and turns it into a launch-style promo with camera moves across the pages. Good for a product launch, a feature reveal or a homepage hero clip."),
          prompt("Paste into Claude Code", `Install this skill: https://github.com/Vincentwei1021/video-shotcraft
Then capture my website [https://your-site.com] and make a 15-second cinematic product promo with smooth 2.5D camera moves.`),
          check("The promo shows your real pages. If it shows a generic site, it never captured yours: give it the full link with https."),
          h3("2. Anything2Explainer", "[github.com/Vincentwei1021/anything2explainer](https://github.com/Vincentwei1021/anything2explainer)"),
          p("Topic in, narrated explainer out: it writes the script, draws diagrams in code, adds voice-over, subtitles and a chapter bar. Good for the concept your audience keeps asking about."),
          prompt("Paste into Claude Code", `Install https://github.com/Vincentwei1021/anything2explainer and make a 30-second English explainer on [e.g. what a data lakehouse is], using a free voice.`),
          check("Every line of voice-over has a picture under it. If a shot is just text on black, ask it to draw that line as a diagram."),
          h3("3. Bang Motion", "[github.com/bangtutorial/bang-motion](https://github.com/bangtutorial/bang-motion) · MIT"),
          p("Turns Claude into a motion designer. It writes a style brief first (palette, fonts, one signature move), then builds openers, promos and kinetic typography that move like video, not slides."),
          prompt("Paste into Claude Code", `Install https://github.com/bangtutorial/bang-motion. Write the style brief first and show it to me. Then make a 15-second kinetic typography video on [your topic] and export it as an MP4.`),
          check("You see the style brief before any animation. If it skipped straight to code, ask for the brief and approve it first. The brief is what stops it looking generic."),
          h3("4. Claude Remotion Skill", "[github.com/haidrrrry/claude-remotion-skill](https://github.com/haidrrrry/claude-remotion-skill) · MIT"),
          p("Teaches Claude real motion rules for Remotion videos: eased springs, staggered entrances, quicker exits, one hero colour per frame and proper holds."),
          prompt("Paste into Claude Code", `Install the remotion-motion-graphics skill from https://github.com/haidrrrry/claude-remotion-skill and make a 15-second motion graphics clip on [your topic]. Check the frames before you hand it over.`),
          check("Nothing snaps in at full size. If elements still pop with no easing, tell it to apply the skill's timing rules to every entrance."),
          h3("5. Paint MV", "[github.com/lintsinghua/paint-mv-skills](https://github.com/lintsinghua/paint-mv-skills)"),
          p("Takes a song and its lyrics and paints an animated music video frame by frame, in a storybook style. Good for a lyric video or a story told to music."),
          prompt("Paste into Claude Code", `Install https://github.com/lintsinghua/paint-mv-skills. Here are my song and its lyrics. Make a hand-painted music video of the first 15 seconds.
[attach the mp3]
[paste the lyrics]`),
          note("Painting is slow: a full song can take the better part of an hour to render. Start with 15 seconds.", "Good to know"),
          h3("6. Hand-Drawn Explainer", "[github.com/hi-nikola/hand-drawn-explainer-video-nikola](https://github.com/hi-nikola/hand-drawn-explainer-video-nikola) · Apache-2.0"),
          p("Give it a script and a hand draws every picture on screen, stroke by stroke, like a live whiteboard sketch. The kind of explainer people actually watch to the end."),
          prompt("Paste into Claude Code", `Install https://github.com/hi-nikola/hand-drawn-explainer-video-nikola. Turn this script into a stroke-by-stroke hand-drawn explainer in English, as a silent video: [your script]`),
          note("The repo's docs are in Chinese, but English prompts work. Its default voice is a paid service, so ask for a silent video and add your own voice, or ask for a free voice.", "Good to know"),
        ],
      },
    ],
    fixes: [
      ["\"node\" or \"npm\" not found", "Most of these render with Node. Install it from nodejs.org, then run the prompt again."],
      ["\"ffmpeg\" not found", "The MP4 export needs ffmpeg. Ask Claude Code: \"install ffmpeg for me\"."],
      ["It asks for a voice API key", "The default voice is a paid service. Ask for a free voice or a silent video."],
      ["The render is very slow", "Painted and hand-drawn frames are heavy. Make 15 seconds first, then the full length."],
      ["It still looks generic", "It skipped the repo's own rules. Say: \"Follow the skill's instructions exactly, step by step.\""],
    ],
    next: [
      "Run the Bang Motion prompt on a topic you post about. About ten minutes.",
      "Pick the one repo that matches what you make: promo, explainer or music video.",
      "Use it on your next real post, and keep the prompt that worked in a notes file.",
    ],
    sources:
      "All six repos belong to their authors and are free on GitHub. Check each repo's licence before using its output commercially.",
  },

  // ---------------------------------------------------------------- 7
  {
    slug: "run-gemini-inside-claude-code",
    title: "Run Gemini as a second builder inside Claude Code",
    seoTitle: "How to Run Gemini Inside Claude Code (Setup + Prompts)",
    description:
      "Install the Gemini CLI, give it the same rules as Claude, and let Claude Code hand it builds to run side by side. Setup, three checks that prove it worked, and five build prompts to compare the two models.",
    category: "models",
    added: "2026-11-26",
    minutes: 8,
    pitch:
      "Two strong models are better than one when you can compare their work. With the Gemini CLI installed, Claude Code can hand a build to Gemini, read the result, check what it cost and merge the best of both. Set it up once in about 15 minutes, then race the two on any prompt.",
    startHere:
      "Do steps 1 to 4 once, about 15 minutes. Then paste one of the five build prompts at the end and run it on Gemini and on Claude, side by side.",
    sections: [
      {
        title: "1. Install the Gemini CLI",
        blocks: [
          p("You need Node.js. Then open a terminal:"),
          code("Terminal", `npm install -g @google/gemini-cli`),
          p("Start it once in an empty folder, naming the model you want (use Google's current top model; `gemini-4-neon` was it when this was written):"),
          code("Terminal", `gemini -m gemini-4-neon`),
          p("Sign in with Google, or paste an API key from Google AI Studio. Say yes when it asks to trust the folder."),
          check("Type: \"Which model are you?\" It should name the model you picked."),
        ],
      },
      {
        title: "2. Give Gemini the same rules as Claude",
        blocks: [
          p("Claude Code reads `CLAUDE.md`. Gemini reads `GEMINI.md`. Out of the box, Gemini ignores everything you taught Claude. Link the two so one edit updates both:"),
          prompt("Paste into Claude Code", `In this project folder, make Gemini follow the same rules as you. Create GEMINI.md as a symbolic link to CLAUDE.md, so when I edit one, both models get the change. Show me the link when it is done.`),
          check("Ask Gemini: \"What rules are you following?\" It should repeat one of your Claude rules."),
        ],
      },
      {
        title: "3. Turn up its thinking",
        blocks: [
          prompt("Paste into Claude Code", `Open ~/.gemini/settings.json. Add a model override for gemini-4-neon that sets thinkingLevel to HIGH and includeThoughts to true. Keep everything else in the file as it is, and show me the change before you save it.`),
          note("Check Gemini CLI's own docs if the settings keys have changed; Claude will tell you if it cannot find them."),
        ],
      },
      {
        title: "4. Let Claude Code hand builds to Gemini",
        blocks: [
          prompt("Paste into Claude Code", `
Make a new empty folder called gemini-build. Inside it, run Gemini as a second builder with:
gemini -m gemini-4-neon --approval-mode auto_edit --output-format json -p "<MY PROMPT>"
Save what it prints to run.json. When it finishes, tell me which files it made, open the main one, and work out what it cost from the token counts in run.json.

MY PROMPT: [paste one of the build prompts below]`),
          note("`auto_edit` lets Gemini write files without asking, but it still asks before running commands. Only use `--yolo` (no approvals at all) in a throwaway folder with nothing you care about.", "Good to know"),
        ],
      },
      {
        title: "5. Run the same prompt on Claude and compare",
        blocks: [
          p("Run the same build prompt in Claude Code inside a `claude-build` folder. Then:"),
          prompt("Paste into Claude Code", `Open gemini-build and claude-build. Compare the two builds feature by feature against the original prompt. Tell me which one does each part better, then build a third version that keeps the best of both.`),
        ],
      },
      {
        title: "6. Three checks that it really worked",
        blocks: [
          h3("Did it really use the model you picked?"),
          prompt("Paste into Claude Code", `Read gemini-build/run.json and list every model name under stats. I only want to see gemini-4-neon.`),
          h3("What did it cost?"),
          prompt("Paste into Claude Code", `Read the input, cached and output token counts in gemini-build/run.json. Look up Google's current price for gemini-4-neon and work out this run's cost in dollars. Show the sum.`),
          h3("Did it finish?"),
          prompt("Paste into Claude Code", `Check gemini-build for out.mp4. Tell me how long the video is and whether it plays. If it is missing, read the end of the run log and tell me why it stopped.`),
        ],
      },
      {
        title: "Five build prompts to race",
        lead: "Each one is a hard, visual task, so the differences between models show. Every prompt ends by recording a 20-second video, so you can compare them side by side.",
        blocks: [
          h3("The Taj Mahal in 3D"),
          prompt("Paste this", `Build the Taj Mahal in 3D with three.js in one HTML file: the mausoleum, the four minarets, the long reflecting pool, the gardens and the gateway. Add a panel to switch camera views, time of day (dawn, noon, sunset, full moon) and detail level, with the pool reflecting the building. Save everything in this folder. Then record a 20-second video of it running in Google Chrome that shows every feature and export it as out.mp4 here (ffmpeg and Chrome are installed). Wait for the export to finish before you reply.`),
          check("Switch to full moon. The sky, the marble's colour and the reflection in the pool should all change."),
          h3("A data pipeline you can watch"),
          prompt("Paste this", `Build a 3D animated data pipeline in one HTML file with three.js: event sources on the left, a streaming queue, a processing cluster, a warehouse and a dashboard on the right. Glowing packets flow through each stage at a speed I can change with a slider. Add a "fail a node" button that turns one processor red, piles up packets in the queue behind it, then recovers. Show live counters for events in, processed and lag. Save everything in this folder. Then record a 20-second video of it running in Google Chrome that shows every feature and export it as out.mp4 here (ffmpeg and Chrome are installed). Wait for the export to finish before you reply.`),
          check("Press \"fail a node\". The lag counter should rise while it is down and fall back after it recovers."),
          h3("An engine in exploded view"),
          prompt("Paste this", `Build a detailed four-cylinder car engine in 3D in one HTML file with three.js, made of separate parts: block, pistons, crankshaft, camshaft, valves and head. The pistons and crankshaft move together at the right timing. Add modes for the assembled engine, an X-ray view, a cutaway, an exploded view and a parts layout, with a live part count. Save everything in this folder. Then record a 20-second video of it running in Google Chrome that shows every mode and export it as out.mp4 here (ffmpeg and Chrome are installed). Wait for the export to finish before you reply.`),
          check("The part count should stay the same in every mode."),
          h3("A working pendulum clock"),
          prompt("Paste this", `Build a pendulum wall clock in 3D in one HTML file with three.js, made of separate parts: pendulum, escapement, gear train, hands, dial and case. The gears turn at the right ratios and drive the hands, and the clock shows my computer's real time. Add modes for the finished clock, a glass case view and an exploded view, with a live part count. Save everything in this folder. Then record a 20-second video of it running in Google Chrome that shows every mode and export it as out.mp4 here (ffmpeg and Chrome are installed). Wait for the export to finish before you reply.`),
          check("Leave it open for a minute. The minute hand should match your computer's clock."),
          h3("A motion designer's showreel"),
          prompt("Paste this", `Make a 15-second motion graphics video that shows off what a brilliant motion designer you are, as if it were your showreel. Go all out. Save everything in this folder, then export the final video as out.mp4 here (ffmpeg and Chrome are installed). Wait for the export to finish before you reply.`),
          check("Watch it with the sound off and count distinct scenes. One effect on repeat is not a showreel."),
        ],
      },
    ],
    fixes: [
      ["\"Retrying… fetch failed\"", "A long reply from Google dropped and Gemini retries by itself. If it ends with \"terminated\" and no files, run it again."],
      ["A long run stopped overnight", "Your Mac went to sleep. Start long runs with `caffeinate -i` in front."],
      ["\"Tool execution denied by policy\"", "Gemini's own safety rules blocked a command. If it stalls, run that step in Claude Code instead."],
      ["It asks to trust the folder every time", "The folder was never trusted. Say yes once."],
      ["gemini: command not found", "The install did not finish or Node.js is missing. Install Node.js, then repeat step 1."],
    ],
    next: [
      "Do steps 1 to 4 once.",
      "Race one build prompt on both models.",
      "Keep the comparison prompt from step 5 for real work, not just demos.",
    ],
    sources:
      "Gemini CLI is Google's open-source command-line agent: [github.com/google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli). Model names change often; use Google's current one.",
  },

  // ---------------------------------------------------------------- 8
  {
    slug: "give-claude-a-map-of-your-codebase",
    title: "Give Claude a map of your codebase with graphify",
    seoTitle: "Give Claude a Map of Your Code: graphify Setup and Prompt",
    description:
      "graphify reads your code locally and builds a map of what calls what. Claude reads the map before it opens a file. Three install commands, the exact prompt, three more ways to use the map and how to keep it fresh.",
    category: "claude",
    added: "2026-11-26",
    minutes: 7,
    pitch:
      "On a big codebase Claude wastes time searching file after file before it understands anything. graphify reads your code once, on your laptop with no AI, and turns it into a map: which files call which, what imports what, and the few places everything flows through. Claude reads the map first, then opens only the files that matter. Free and open source.",
    startHere:
      "Run the three commands in step 1 inside one of your projects, then open `graphify-out/graph.html` in your browser. In about two minutes you are clicking through a map of your own code.",
    sections: [
      {
        title: "The guide at a glance",
        blocks: [
          table(
            ["Step", "What you get", "Time"],
            [
              ["1. Install it and map your code", "A map of your project in `graphify-out`", "About 2 minutes"],
              ["2. Click through the map", "Your whole project on one page", "About 2 minutes"],
              ["3. The exact prompt", "Claude checks the map before opening files", "Every task"],
              ["4. Three more ways to use it", "Onboard, trace a bug, check a big change", "A few minutes each"],
              ["5. Keep the map fresh", "A map that changes when your code does", "Seconds"],
            ]
          ),
        ],
      },
      {
        title: "1. Install it and map your code",
        blocks: [
          p("You need `uv` first. Skip this if `uv --version` already works."),
          code("Terminal", `
# Mac
brew install uv
# Windows
winget install astral-sh.uv`),
          p("Then, in a terminal inside your project's folder:"),
          code("Terminal, inside your project", `
uv tool install graphifyy
graphify claude install --project
graphify update .`),
          note("The package is `graphifyy` with two y's; the command is still `graphify`. Other packages with similar names on PyPI are not the official one."),
          p("You get a line like \"Rebuilt: 5031 nodes, 11340 edges\" and a `graphify-out` folder with `graph.html` (the map), `GRAPH_REPORT.md` (the summary Claude reads first) and `graph.json` (the full map Claude queries). The code map is built on your machine with no AI, so it costs nothing and your code stays local."),
          check("Open `graphify-out/GRAPH_REPORT.md`. It should name your own files and functions."),
        ],
      },
      {
        title: "2. Click through the map",
        blocks: [
          p("Open `graphify-out/graph.html` in any browser. Each dot is a file, function or class; each line is a call, an import or an inheritance."),
          steps([
            "Type a file name in the search box. The map jumps to it.",
            "Click the dot. The panel shows how many things link to it.",
            "Click a name under its neighbours to walk to the next file.",
          ]),
          p("The biggest, most connected dots are the parts everything flows through. `GRAPH_REPORT.md` lists them as god nodes. On a data platform that is often the shared config loader or the base pipeline class."),
          check("Find the file you edit most. If it has many lines, any change there touches a lot of your project. Worth knowing before Claude edits it."),
        ],
      },
      {
        title: "3. The exact prompt",
        blocks: [
          p("Open Claude Code in the same folder and paste this, with your own task in the middle. Write the task the way you would say it to a colleague."),
          prompt("Paste into Claude Code", `Before you open any file, read graphify-out/GRAPH_REPORT.md. Then use graphify query, graphify path and graphify explain to find the parts of this code that matter for this task: [your task, e.g. add a --dry-run flag to the backfill command]. List the files you would change and why, then open only those.`),
          check("The first thing Claude does is read `GRAPH_REPORT.md`, not search your files. If it searches first, start a new session and paste the prompt again."),
        ],
      },
      {
        title: "4. Three more ways to use the map",
        blocks: [
          p("These use graphify's three commands: `query` asks a question, `path` traces how two things connect, `explain` shows everything linked to one thing."),
          h3("Learn a codebase you did not write"),
          prompt("Paste into Claude Code", `Read graphify-out/GRAPH_REPORT.md. Explain this project to me as if I just joined the team: the main parts, what each does and how they connect. Run graphify explain on the three most connected parts. Then give me the five files to read first, in order, with one line on why for each.`),
          h3("Trace a bug from symptom to cause"),
          prompt("Paste into Claude Code", `I see this problem: [what goes wrong and where]. Use graphify path to trace how [the part where I see it] connects to [the part I suspect], and graphify query to find anything else on that path. Show me the chain hop by hop, name the hop most likely to cause the bug, and open only the files on that chain.`),
          h3("Check a big change before you make it"),
          prompt("Paste into Claude Code", `I want to change [function, class or file]. Before editing anything, run graphify explain on it and list everything that depends on it, grouped by file. Tell me what could break, which tests cover it and the safest order to make the change. Wait for my yes before you edit.`),
          check("Each answer names real files from your project and says which graphify command it ran. If it names files that do not exist, run `graphify update .` and ask again."),
        ],
      },
      {
        title: "5. Keep the map fresh",
        blocks: [
          p("The map is a snapshot. Refresh it after a big change or a `git pull`:"),
          code("Terminal", `graphify update .`),
          p("Or have Git rebuild it on every commit and branch switch, once per project:"),
          code("Terminal", `graphify hook install`),
          note("`graphify update .` maps code only. To add docs, PDFs and images, type `/graphify .` inside Claude Code; that part uses your Claude session."),
          check("Rename a function, commit, then run `graphify explain` on the new name. It should be found."),
        ],
      },
      {
        title: "Worth knowing",
        blocks: [
          table(
            ["", ""],
            [
              ["Cost", "Free and open source. The code map is built locally with no AI."],
              ["Privacy", "Your code is read on your machine and does not leave it."],
              ["Where it helps most", "Bigger codebases. On a small project Claude can read most of it anyway."],
            ]
          ),
        ],
      },
    ],
    fixes: [
      ["graphify: command not found", "Run `uv tool update-shell`, then open a new terminal window."],
      ["Claude still searches file after file", "Use the prompt in step 3. Check the project has a `.claude` folder from `graphify claude install --project`, then restart Claude Code."],
      ["The map shows groups, not files", "Big projects are grouped. Search for one file, or ask about it with `graphify explain`."],
      ["graphify explain lists several matches", "The name matched more than one thing. Pick one from the list and run it again."],
      ["Claude names files that moved", "The map is out of date. Run `graphify update .` and ask again."],
      ["You want it gone", "`graphify claude uninstall` removes it from Claude Code; `graphify uninstall --purge` also deletes `graphify-out`."],
    ],
    next: [
      "Run the three commands in your biggest project.",
      "Open `graph.html` and find the file everything flows through.",
      "Use the step 3 prompt on your next real task, and run `graphify hook install`.",
    ],
    sources: "graphify: [github.com/Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) (open source).",
  },

  // ---------------------------------------------------------------- 9
  {
    slug: "which-ai-model-should-you-use",
    title: "Which AI model should you use? The 2-model test",
    seoTitle: "Which AI Model Should You Use? A Simple 2-Model Test",
    description:
      "Leaderboards tell you what most people prefer, not what works for your job. How to read the LMArena leaderboard, which category matches which job, and three prompts to test two models blind on your own work.",
    category: "models",
    added: "2026-11-26",
    minutes: 6,
    pitch:
      "The top spot on the AI leaderboards changes hands every few weeks, and the gaps at the top are tiny. Chasing the No. 1 model is a waste of time. A better habit: use the leaderboard to shortlist two models for your job, then run a quick blind test on your own work. Three prompts, about 20 minutes.",
    startHere:
      "Use step 2 to find the right leaderboard category for your job, take the top two models there, then run the test in step 4 on a real task. Swap every [WORD IN BRACKETS] for your own.",
    sections: [
      {
        title: "1. How to read a leaderboard",
        blocks: [
          p("The best-known public one is [LMArena](https://lmarena.ai/leaderboard). Four things to know before you trust it:"),
          steps([
            "**Scores come from blind votes.** People ask a question, see two answers from hidden models and pick the better one. The score is how often a model wins.",
            "**Small gaps are ties.** A few points apart can swap next week. Treat the top two or three as equals.",
            "**New models wobble.** A model with few votes often starts high and settles lower after a few weeks.",
            "**It measures preference, not your job.** Votes reward answers people like at first glance. Your job might need accuracy, your tone or exact numbers instead.",
          ]),
        ],
      },
      {
        title: "2. Which leaderboard fits which job",
        blocks: [
          table(
            ["Your job", "Check this leaderboard"],
            [
              ["Hard reasoning, tricky questions", "Text: Hard prompts"],
              ["Writing code, SQL, debugging", "Text: Coding"],
              ["Building web apps and pages", "WebDev"],
              ["Emails, posts, stories, copy", "Text: Creative writing"],
              ["Maths, numbers, analysis", "Text: Math"],
              ["Following a strict format or rules", "Text: Instruction following"],
              ["Long documents and big inputs", "Text: Longer query"],
              ["Back-and-forth over many turns", "Text: Multi-turn"],
            ]
          ),
          note("Price and speed are not on the leaderboard. When two models tie on quality for your job, pick the cheaper or faster one."),
        ],
      },
      {
        title: "3. Turn your job into a test",
        blocks: [
          prompt("Paste into any chat", `
I need to pick an AI model for this job. Help me set up a fair test.
The job: [e.g. "turn my meeting notes into a client follow-up email" or "write dbt models from a source table description"]
How often I do it: [e.g. 10 times a week]

1. Tell me which LMArena category fits best: Overall, Hard prompts, Coding, Creative writing, Math, Instruction following, Longer query, Multi-turn, or the separate WebDev board. One line on why.
2. Name the one thing that decides a good result for this job, e.g. "keeps my tone" or "never invents a number".
3. Write 3 to 5 pass/fail lines I can check just by looking at the output.`),
          check("Every pass/fail line is something you can see or count. If a line says \"good\", \"clear\" or \"accurate\", reply: \"Rewrite every line as something I can see or count.\""),
        ],
      },
      {
        title: "4. The 2-model test",
        blocks: [
          steps([
            "Take the top two models in your category from the leaderboard.",
            "Run the same job on both with prompt A.",
            "Judge them blind with prompt B, then swap the labels and judge again.",
            "Use the winner for that job. Re-test when a new model reaches the top three.",
          ]),
          h3("Prompt A: run the same job on two models", "Two new chats, one per model"),
          prompt("Do this", `
Paste exactly the same job prompt into two new chats, one on each model. Do not change a word between them.

[YOUR JOB PROMPT]

Save the answers in a note as "Answer A" and "Answer B". Write down which model is which somewhere you will not see while judging.`),
          check("If one word differs between the two chats, the test is off. Start both again."),
          h3("Prompt B: judge them blind", "A third, new chat"),
          prompt("Paste into a new chat", `
Below are two answers to the same job, labelled A and B. Do not try to guess which model wrote them.

The job: [paste your job prompt]
The checks:
[paste the pass/fail lines from step 3]

Answer A:
[paste]

Answer B:
[paste]

For each check, mark A and B as PASS or FAIL and quote the part that proves it.
Then pick the better answer for this job in one line, and name the one thing that decided it.
If both fail the same check, say so: the prompt needs fixing before the model does.`),
          check("Every PASS has a quote. If not, ask: \"Quote the proof for every PASS.\" Then run it again with A and B swapped. If the winner changes, call it a tie."),
        ],
      },
    ],
    fixes: [
      ["Both answers fail the same check", "Your prompt is missing that instruction. Add it and run both again."],
      ["The winner changes when you swap A and B", "Too close to call. Pick the cheaper or faster model."],
      ["The model you want is not on the leaderboard", "It is too new. Test it against the current No. 1 for your category."],
      ["The leaderboard has changed since you tested", "It will, every few weeks. Re-test only when a new model enters the top three for your category."],
    ],
    next: [
      "Pick one job you do every week.",
      "Find its leaderboard category and turn it into checks (step 3).",
      "Test the top two with prompts A and B.",
      "Write the winner down, and re-test when the top three changes.",
    ],
    sources:
      "Leaderboard: [lmarena.ai/leaderboard](https://lmarena.ai/leaderboard). Rankings change every few weeks, so check today's order before you shortlist.",
  },

  // ---------------------------------------------------------------- 10
  {
    slug: "make-a-cinematic-short-film-starring-you",
    title: "Make a 30-second cinematic film starring you",
    seoTitle: "Make a Cinematic AI Short Film Starring You (Step by Step)",
    description:
      "One photo of you, no footage. Claude writes the story and shot list, an image model makes the stills, Seedance 2.5 turns them into film and joins the shots, and Claude Code checks every frame and cuts it together.",
    category: "video",
    added: "2026-11-26",
    minutes: 12,
    pitch:
      "You need one clear photo of yourself and no footage at all. Claude writes the story and the shot list. An image model turns your photo into a still for each shot. Seedance 2.5 turns each still into film and blends the shots so you never see a cut. Claude Code checks every frame and edits it together. Six steps, every prompt ready to paste, and a full worked example. Expect to redo a few shots.",
    startHere:
      "Do step 1, then make only the first shot using steps 2 and 3: your face in beat one, as a 5-second clip. About 20 minutes, and it shows whether your face holds up before you spend anything on the rest.",
    sections: [
      {
        title: "What you need",
        blocks: [
          table(
            ["For", "Use"],
            [
              ["Your face", "One clear daylight photo, looking at the camera"],
              ["The story and shot list", "Claude"],
              ["The stills", "An image model that accepts a reference photo (ChatGPT and Gemini both do)"],
              ["The video", "Seedance 2.5 image-to-video, in an app or API that takes a start image and an end image (fal.ai, Together AI and ComfyUI all offer it)"],
              ["The checks and the edit", "Claude Code with ffmpeg (optional, but it saves hours)"],
            ]
          ),
          note("Use your own face, or someone who has agreed. Keep characters, cars and places original: no real brands, logos, celebrities or characters from existing games and films."),
        ],
      },
      {
        title: "The six steps at a glance",
        blocks: [
          table(
            ["Step", "What you get", "Time"],
            [
              ["1. Write the story and shot list", "Six beats, a cast list and one look line", "About 10 minutes"],
              ["2. Make a still for every shot", "Six matching frames with your face", "About 30 minutes"],
              ["3. Turn each still into film", "A 5-second clip per beat", "About 5 minutes a shot"],
              ["4. Join the shots with no cut", "One continuous film", "About 10 minutes a join"],
              ["5. Draft cheap, check every frame", "A list of every fault before you pay for full quality", "About 15 minutes"],
              ["6. Cut it together", "A finished 1920x1080 film with titles and fades", "About 15 minutes"],
            ]
          ),
        ],
      },
      {
        title: "1. Write the story and shot list",
        blocks: [
          p("Start with the story, not the pictures. A wordless 30-second film works best as six beats of about five seconds, each with one thing that moves."),
          prompt("Paste into Claude", `
I want to make a 30-second wordless film that looks like a big-budget action trailer, starring me.
The story: [e.g. a data engineer races across a neon city at 3 a.m. to fix a broken pipeline before the CEO's morning dashboard loads].
Write it as 6 beats of about 5 seconds. For each beat give me: what we see, where the camera is, the light, and the ONE thing that moves.
Use original characters, vehicles and places only. No real brands, logos, number plates or characters from existing films or games.

Then give me:
1. A cast list: each character's face, clothes and vehicle, one line each, with exact colours.
2. One look line I can paste into every shot so they all match.
3. Where up to 2 on-screen titles should go.`),
          note("Put the exact colours in the cast list and paste them into every prompt. That is what stops a red bike turning orange halfway through."),
          check("Read the six beats out loud. If you cannot picture one in a single sentence, ask: \"Make beat [n] one simple shot.\""),
        ],
      },
      {
        title: "2. Make a still for every shot",
        blocks: [
          p("Every video shot starts from a still. Make all six first and fix anything that does not match before you make any video. Stills are cheap; video is not."),
          p("First, a reference sheet for each character and vehicle, so they look the same everywhere. Attach your photo for yours:"),
          prompt("Paste into the image model", `Make a character sheet of the person in this photo. Keep their face exactly. Front, side and three-quarter views, wearing [clothes from the cast list], on a plain grey background, photoreal.`),
          p("Then one still per beat. Attach your photo and your sheets, and paste the look line followed by the beat:"),
          prompt("Paste into the image model", `
${LOOK}

Keep the face of the person in image 1 exactly. Their vehicle is the one in image 2: same colour and shape.
[Paste the beat from step 1: what we see, the camera, the light.]
16:9 landscape. This is the first frame of a film shot.`),
          check("Put all six stills in one folder and look at them together. Cover the faces and look only at the vehicles and the light. Remake any that stand out before you go on."),
        ],
      },
      {
        title: "3. Turn each still into film",
        blocks: [
          p("Give Seedance 2.5 the still as the start image and tell it the one thing that moves. Paste the look line every time."),
          prompt("Paste into Seedance 2.5 (image-to-video)", `
${LOOK}

Start exactly on the image. [The one thing that moves, e.g. the matte-red motorbike races towards camera down the wet neon street.]
The camera [tracks alongside / pushes in slowly / drops in behind]. The vehicle is clearly moving, with motion blur and spray from the road. It never looks parked.
Sound: realistic sound effects only. No music, no score, no narration.`),
          note("Ask for no music. You add the soundtrack at the end, and the model's own music will fight it."),
          check("Pause on the last frame. Is it still your face? Is the vehicle the same colour? If not, remake the shot before you build on it."),
        ],
      },
      {
        title: "4. Join the shots so there is no cut",
        blocks: [
          p("This is what makes it feel like one film. Give a shot a start image and an end image and Seedance fills in the move between them. Use the last frame of one shot and the first frame of the next."),
          code("Terminal (or ask Claude Code to do it)", `
ffmpeg -sseof -0.1 -i shotA.mp4 -frames:v 1 shotA-last.png
ffmpeg -i shotB.mp4 -frames:v 1 shotB-first.png`),
          p("Then make a bridge shot with `shotA-last.png` as the start image and `shotB-first.png` as the end image:"),
          prompt("Paste into Seedance 2.5 (start + end image)", `
${LOOK}

Start exactly on the start image and end exactly on the end image. One continuous camera move between them: [e.g. the camera rises off the street and glides up the glass tower to a single lit window].
Keep the same speed, light and setting throughout. No cuts.`),
          check("Play shot A, the bridge and shot B back to back and watch only the joins. If the colour jumps, cover it with a short fade in step 6."),
        ],
      },
      {
        title: "5. Draft cheap, check every frame, then finish",
        blocks: [
          p("Make every shot at 480p first, then check it frame by frame: a wrong colour or a stray frame is easy to miss at full speed. Only render 1080p when the draft is right."),
          code("Terminal: contact sheets, 4 frames a second, 36 per sheet", `ffmpeg -i draft.mp4 -vf "fps=4,scale=320:-1,tile=6x6" sheet-%02d.png`),
          prompt("Paste into Claude Code", `
Read every contact sheet in this folder against my shot list below. Each sheet covers 9 seconds at 4 frames a second. List every fault with its time: the face changing, a vehicle in the wrong colour, the wrong setting, garbled text on a sign, a flashing frame, and any join where the colour or light jumps. Do not fix anything yet.

[paste the shot list from step 1]`),
          note("If your app can upscale or finalise a draft, use that: the shot stays the same. If it re-renders from scratch at 1080p, keep the same images, prompt and seed, and check the sheets again."),
          check("Fix every fault on the list, rebuild and make the sheets again. Ship only when the list comes back empty."),
        ],
      },
      {
        title: "6. Cut it together",
        blocks: [
          p("Claude Code can do the whole edit with ffmpeg, as a script you can re-run each time you swap a shot. Put the 1080p clips in one folder, numbered in order:"),
          prompt("Paste into Claude Code", `Join the clips in this folder, in order, into one film. Use a 0.3-second fade at each join (ffmpeg xfade). Add the title "03:00" over clip 1 and "08:59" over clip 6, white, centred, fading in and out. Export 1920x1080, H.264, yuv420p, 24fps, with the clips' own sound only. Write it as a script I can re-run, then show me 6 frames from the result.`),
          note("Add music when you post, using the platform's own music library. A song you do not own baked into the file can get the video muted or removed."),
          check("Watch it once on your phone with the sound off. If a join still jumps, ask Claude Code to lengthen that one fade."),
        ],
      },
      {
        title: "Worked example: The 3 a.m. pipeline",
        lead: "One whole film planned out, so you can see the pattern before you write your own. Copy it to practise, or swap in your own story.",
        blocks: [
          h3("The cast"),
          table(
            ["Who", "Look"],
            [
              ["You", "The person in your photo. Charcoal hoodie, black jeans, white trainers, a lanyard with a blank badge."],
              ["Your bike", "A matte-red naked motorbike with a round headlight, no badges."],
              ["The city", "An original rain-soaked city at night: teal and magenta signs with no readable text, wet streets, glass towers."],
              ["The control room", "A dark office floor with one wall of screens, every chart flashing red."],
            ]
          ),
          h3("The six beats"),
          table(
            ["Beat", "What we see", "The one thing that moves", "Join to next"],
            [
              ["1 · 0-5s", "Your dark bedroom, 3 a.m. A phone on the bedside table lights the ceiling red.", "The phone buzzes; your hand grabs it", "Start + end image"],
              ["2 · 5-10s", "You pull on the hoodie and run down a narrow stairwell.", "You take the stairs two at a time", "0.3s fade"],
              ["3 · 10-15s", "The red bike bursts out of an alley onto a wide neon street.", "The bike races towards camera through spray", "Bridge shot"],
              ["4 · 15-20s", "Low tracking shot alongside the bike, city lights streaking past.", "The camera keeps pace, then overtakes", "Bridge shot up the tower"],
              ["5 · 20-25s", "The control room. You drop into a chair in front of the red wall.", "One by one the charts turn green", "Start + end image"],
              ["6 · 25-30s", "Dawn through the window. You lean back with a coffee as the dashboard loads.", "Steam rises; you exhale and smile", "End on the still"],
            ]
          ),
          h3("Beat 3, written out in full"),
          prompt("Still prompt (image model)", `
${LOOK}

Night. A wide, rain-soaked city street with teal and magenta signs that have no readable text, glass towers behind. The person in image 1, in a charcoal hoodie and black jeans, rides the matte-red motorbike from image 2 out of a narrow alley onto the street, headlight on. Low camera at street level, 24mm, puddles in the foreground reflecting the signs.
16:9 landscape. This is the first frame of a film shot.`),
          prompt("Video prompt (Seedance 2.5)", `
${LOOK}

Start exactly on the image. The matte-red motorbike accelerates out of the alley and races towards the camera down the wet street, spray kicking up from the back wheel. The camera stays low and pulls back as the bike gains on it. The rider's face stays the same throughout.
Sound: realistic engine, rain and tyre sounds only. No music.`),
          note("Every other beat follows the same pattern: the look line, then the beat, then the one thing that moves. Paste the cast list colours each time."),
        ],
      },
    ],
    fixes: [
      ["Your face changes between shots", "Attach your photo and your character sheet to every still, and say \"keep the face of the person in image 1 exactly\"."],
      ["A vehicle changes colour", "Paste the exact colour from the cast list into every prompt, stills and video."],
      ["Shots look like a video game", "Paste the full look line every time. It is what keeps the grain, lenses and natural light."],
      ["A visible jump at a join", "Make a bridge shot (step 4) or add a short fade (step 6)."],
      ["Garbled text appears on signs", "Add \"no readable text\" to the still prompt and remake that still."],
      ["The model added its own music", "Say \"realistic sound effects only, no music\" in every video prompt."],
    ],
    next: [
      "Write your six beats with the step 1 prompt.",
      "Make beat one only, as a still then a 5-second clip.",
      "If your face holds, make the other five, draft cheap and check every frame.",
    ],
    sources:
      "Seedance 2.5 is ByteDance's video model, available through several apps and APIs. Check the terms of the app you use for commercial use and for using your own likeness.",
  },
];

// Section numbers: if any title starts with "1. ", the numbers come from the
// titles (unnumbered sections like "What you need" get none); otherwise the
// sections are numbered in order. Text that says "step 3" relies on this.
const numberSections = (sections) => {
  const explicit = sections.some((s) => /^\d+\.\s/.test(s.title));
  return sections.map((s, i) => {
    const m = s.title.match(/^(\d+)\.\s+(.*)$/);
    const n = explicit ? (m ? Number(m[1]) : null) : i + 1;
    const title = m ? m[2] : s.title;
    const id = n ? `step-${n}` : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return { ...s, n, title, id };
  });
};

// Newest first; each resource gets its category object and a count of the
// paste-ready blocks (prompts + commands) for the cards and header pills.
const live = list
  .filter((r) => r.status !== "draft")
  .map((r) => ({
    ...r,
    sections: numberSections(r.sections),
    cat: categories.find((c) => c.slug === r.category),
    // card image drawn by scripts/build-guide-covers.js (add the slug to RS there)
    cover: r.cover || (fs.existsSync(path.join(__dirname, "..", "images", "cards", `rs-${r.slug}-v2.svg`)) ? `/images/cards/rs-${r.slug}-v2.svg` : ""),
    promptCount: r.sections.reduce(
      (n, s) => n + s.blocks.filter((b) => b.t === "prompt" || b.t === "code").length, 0),
  }))
  .sort((a, b) => (a.added < b.added ? 1 : a.added > b.added ? -1 : 0));

module.exports = { categories, list: live };
