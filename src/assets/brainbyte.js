/* BrainByte interactions: practice questions and track progress.
   Progress lives in localStorage only (a per-device convenience); every
   read/write is guarded so the page still works with storage blocked. */
(function () {
  "use strict";

  var dataEl = document.getElementById("bb-data");
  var DATA = { bytes: [], tracks: [], base: "/" };
  try { if (dataEl) DATA = JSON.parse(dataEl.textContent); } catch (e) {}

  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem("bb:" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem("bb:" + k, JSON.stringify(v)); } catch (e) {}
    }
  };

  var trackBySlug = {};
  DATA.tracks.forEach(function (t) { trackBySlug[t.slug] = t; });
  var trackUrl = function (slug) { return DATA.base.replace(/\/$/, "") + "/tracks/" + slug + "/"; };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- Correct-answer counter (nav star) ---------- */
  function cracked() { return store.get("cracked", []); }
  function renderXp() {
    var n = cracked().length;
    document.querySelectorAll("[data-bb-xp]").forEach(function (b) {
      b.hidden = n === 0;
      var c = b.querySelector("[data-bb-xp-count]");
      if (c) c.textContent = n;
    });
  }

  /* ---------- Practice questions ---------- */
  function byteId(b) { return b.track + ":" + b.q.slice(0, 40); }

  function Quiz(root) {
    var track = root.getAttribute("data-bb-track");
    this.root = root;
    this.body = root.querySelector("[data-bb-body]");
    this.showTrack = track === "all";
    // Unanswered questions first, so returning visitors see something new.
    var done = cracked();
    this.pool = DATA.bytes
      .filter(function (b) { return track === "all" || b.track === track; })
      .sort(function (a, b) {
        return (done.indexOf(byteId(a)) > -1) - (done.indexOf(byteId(b)) > -1);
      });
    this.i = 0;
    this.render();
  }

  Quiz.prototype.render = function () {
    var self = this;
    var b = this.pool[this.i];
    this.body.innerHTML = "";
    if (!b) {
      this.body.appendChild(el("p", "bb-byte-q", "More questions for this guide are on the way."));
      return;
    }

    var head = el("div", "bb-byte-head");
    var t = trackBySlug[b.track];
    head.appendChild(el("span", "bb-byte-track", this.showTrack && t ? t.title : "Question"));
    head.appendChild(el("span", "bb-byte-count", (this.i + 1) + " of " + this.pool.length));
    this.body.appendChild(head);
    this.body.appendChild(el("p", "bb-byte-q", b.q));

    var list = el("div", "bb-opts");
    var letters = ["A", "B", "C", "D", "E"];
    b.options.forEach(function (opt, oi) {
      var btn = el("button", "bb-opt");
      btn.type = "button";
      btn.appendChild(el("span", "bb-opt-key", letters[oi]));
      btn.appendChild(el("span", "bb-opt-text", opt));
      btn.addEventListener("click", function () { self.answer(oi, list, b); });
      list.appendChild(btn);
    });
    this.body.appendChild(list);
  };

  Quiz.prototype.answer = function (oi, list, b) {
    var self = this;
    if (list.classList.contains("is-answered")) return;
    list.classList.add("is-answered");
    var right = oi === b.answer;
    list.querySelectorAll(".bb-opt").forEach(function (btn, idx) {
      btn.disabled = true;
      if (idx === b.answer) btn.classList.add("is-right");
      else if (idx === oi) btn.classList.add("is-wrong");
    });

    if (right) {
      var done = cracked();
      var id = byteId(b);
      if (done.indexOf(id) === -1) { done.push(id); store.set("cracked", done); }
      renderXp();
    }

    var fb = el("div", "bb-feedback " + (right ? "is-right" : "is-wrong"));
    fb.appendChild(el("strong", null, right ? "Correct!" : "Not quite."));
    fb.appendChild(el("p", null, b.why));
    var row = el("div", "bb-feedback-row");
    var last = this.i + 1 >= this.pool.length;
    var next = el("button", "bb-btn bb-btn-primary bb-btn-sm", last ? "Start again" : "Next question →");
    next.type = "button";
    next.addEventListener("click", function () {
      self.i = last ? 0 : self.i + 1;
      self.render();
      self.root.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    row.appendChild(next);
    var t = trackBySlug[b.track];
    if (t && this.showTrack) {
      var go = el("a", "bb-text-link", "Go to this guide →");
      go.href = trackUrl(t.slug);
      row.appendChild(go);
    }
    fb.appendChild(row);
    this.body.appendChild(fb);
  };

  document.querySelectorAll("[data-bb-quiz]").forEach(function (root) { new Quiz(root); });

  /* ---------- Track progress ---------- */
  function progress(slug) { return store.get("progress:" + slug, []); }

  document.querySelectorAll("[data-bb-track-card]").forEach(function (card) {
    var total = +card.getAttribute("data-bb-modules") || 1;
    var n = progress(card.getAttribute("data-bb-track-card")).length;
    if (!n) return;
    card.classList.add("is-started");
    var bar = card.querySelector("[data-bb-bar]");
    var label = card.querySelector("[data-bb-progress-label]");
    if (bar) bar.style.width = Math.round((n / total) * 100) + "%";
    if (label) label.textContent = n >= total ? "Completed ✓" : "Continue · " + n + " of " + total + " done";
  });

  var page = document.querySelector("[data-bb-track-page]");
  if (page) {
    var slug = page.getAttribute("data-bb-track-page");
    var total = +page.getAttribute("data-bb-modules") || 1;

    var renderPage = function () {
      var done = progress(slug);
      page.querySelectorAll("[data-bb-step]").forEach(function (step) {
        var on = done.indexOf(+step.getAttribute("data-bb-step")) > -1;
        step.classList.toggle("is-done", on);
        var btn = step.querySelector("[data-bb-done]");
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.querySelector("[data-bb-done-label]").textContent = on ? "Done" : "Mark done";
      });
      var bar = page.querySelector("[data-bb-page-bar]");
      var tx = page.querySelector("[data-bb-ring-text]");
      if (bar) bar.style.width = Math.round((done.length / total) * 100) + "%";
      if (tx) tx.textContent = done.length >= total ? "Track complete. Nice work!" : done.length + " of " + total + " done";
    };

    page.querySelectorAll("[data-bb-done]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = +btn.getAttribute("data-bb-done");
        var done = progress(slug);
        var at = done.indexOf(i);
        if (at > -1) done.splice(at, 1); else done.push(i);
        store.set("progress:" + slug, done);
        renderPage();
      });
    });
    renderPage();
  }

  renderXp();
})();

/* Guide pages (src/brainbyte/guides.njk), after charliehills.ai: the first
   lesson is open, the rest unlocks when the reader signs up to the
   newsletter. A soft gate: the content is in the HTML for search engines and
   no-JS readers; this only hides it. Unlocking is remembered on this device
   for every guide ("one sign-up opens every guide"). Also wires the "Cover
   the right answers" study toggle. */
(function () {
  "use strict";
  var guide = document.querySelector("[data-bb-guide]");
  if (!guide) return;
  var KEY = "bb:guides-unlocked";

  function isUnlocked() {
    try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }
  function apply(unlocked) {
    guide.classList.toggle("is-locked", !unlocked);
    guide.querySelectorAll("[data-bb-locked-only]").forEach(function (n) { n.hidden = unlocked; });
    guide.querySelectorAll("[data-bb-unlocked-only]").forEach(function (n) { n.hidden = !unlocked; });
    var locked = guide.querySelector("[data-bb-locked]");
    if (locked) {
      if (unlocked) { locked.removeAttribute("inert"); locked.removeAttribute("aria-hidden"); }
      else { locked.setAttribute("inert", ""); locked.setAttribute("aria-hidden", "true"); }
    }
  }
  function unlock() {
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
    apply(true);
    var next = guide.querySelector("[data-bb-locked] .bg-lesson");
    if (next) setTimeout(function () { next.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
  }

  apply(isUnlocked());

  // The signup form still posts to Substack (in a new tab); unlock here too.
  guide.querySelectorAll("[data-bb-gate-form]").forEach(function (form) {
    form.addEventListener("submit", function () {
      var input = form.querySelector("input[type=email]");
      if (input && input.checkValidity()) unlock();
    });
  });
  guide.querySelectorAll("[data-bb-unlock]").forEach(function (b) {
    b.addEventListener("click", unlock);
  });

  // Study aid: blur every "Right" cell until it's tapped.
  var cover = guide.querySelector("[data-bb-cover]");
  if (cover) {
    cover.addEventListener("click", function () {
      var on = !guide.classList.contains("is-covered");
      guide.classList.toggle("is-covered", on);
      cover.setAttribute("aria-pressed", on ? "true" : "false");
      cover.textContent = on ? "Show all answers" : "Cover the right answers";
      guide.querySelectorAll(".bg-right.is-shown").forEach(function (c) { c.classList.remove("is-shown"); });
    });
    guide.addEventListener("click", function (e) {
      var cell = e.target.closest && e.target.closest(".bg-right");
      if (cell && guide.classList.contains("is-covered")) cell.classList.add("is-shown");
    });
    guide.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("bg-right") && guide.classList.contains("is-covered")) {
        e.preventDefault(); e.target.classList.add("is-shown");
      }
    });
  }
})();
