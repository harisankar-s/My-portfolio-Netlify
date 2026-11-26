/* Guide pages (src/guides/guide.njk), after charliehills.ai: the first
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
    guide.dispatchEvent(new CustomEvent("bb:unlocked"));
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

/* Guide pages: the reading bar (src/guides/guide.njk, .bg-navbar), active
   once the guide is unlocked.
   - Parts: when guides.json sets `parts` (Exam guide / Service guide), the
     tabs show one part at a time. Each block in the reading column belongs to
     the last section heading before it (#how-to-use = section 0, then each
     .bg-domain, whose data-part names its part).
   - Chips: one per section, sticky under the site nav, for one-tap jumps;
     the chip for the section on screen is highlighted.
   - "One section at a time": shows a single section with Previous / Next
     and a jump menu (the .bg-pager); at the end of a part, Next opens the
     next part. Remembered on this device.
   Links to any section or lesson (What's inside, back/forward, pasted
   links) switch part and section as needed. Printing shows everything. */
(function () {
  "use strict";
  var guide = document.querySelector("[data-bb-guide]");
  var bar = guide && guide.querySelector("[data-bb-navbar]");
  var pager = guide && guide.querySelector("[data-bb-pager]");
  if (!bar || !pager) return;
  var MODE_KEY = "bb:guide-sections";
  var modeBtn = bar.querySelector("[data-bb-sections]");
  var tabs = [].slice.call(bar.querySelectorAll("[data-bb-part]"));
  var chipRow = bar.querySelector("[data-bb-chips]");
  var chips = [].slice.call(bar.querySelectorAll(".bg-chip"));
  var jump = pager.querySelector("[data-bb-jump]");
  var hasParts = tabs.length > 1;
  var partIds = tabs.map(function (t) { return t.getAttribute("data-bb-part"); });

  var blocks = [], keys = [], titles = {}, partOf = {}, heads = {}, sec = null;
  guide.querySelectorAll(".bg-paper .bg-body").forEach(function (body) {
    Array.prototype.forEach.call(body.children, function (el) {
      if (el.id === "how-to-use") {
        sec = 0; titles[0] = el.textContent.trim(); partOf[0] = partIds[0] || ""; heads[0] = el; keys.push(0);
      } else if (el.classList.contains("bg-domain")) {
        sec = parseInt(el.id.replace("domain-", ""), 10);
        var h = el.querySelector(".bg-h2");
        titles[sec] = h ? h.textContent.trim() : "Section " + sec;
        partOf[sec] = el.getAttribute("data-part") || "";
        heads[sec] = el; keys.push(sec);
      }
      if (sec === null || el === pager || el.matches(".bg-toolbar, .bg-gate")) return;
      blocks.push({ el: el, sec: el.classList.contains("bg-end") ? "end" : sec });
    });
  });
  if (keys.length < 2) return;

  var state = { sections: false, part: partIds[0] || "", current: 0 };
  function inPart(k) { return !hasParts || partOf[k] === state.part; }
  function partKeys() { return keys.filter(inPart); }
  function unlocked() { return !guide.classList.contains("is-locked"); }

  function render() {
    var pk = partKeys();
    if (pk.indexOf(state.current) < 0) state.current = pk[0];
    var lastK = pk[pk.length - 1];
    var lastPart = !hasParts || partIds.indexOf(state.part) === partIds.length - 1;
    blocks.forEach(function (b) {
      var show = b.sec === "end"
        ? lastPart && (!state.sections || state.current === lastK)
        : inPart(b.sec) && (!state.sections || b.sec === state.current);
      b.el.classList.toggle("bb-sec-hide", !show);
    });
    tabs.forEach(function (t) { t.setAttribute("aria-selected", t.getAttribute("data-bb-part") === state.part ? "true" : "false"); });
    chips.forEach(function (c) { c.hidden = !inPart(parseInt(c.getAttribute("data-sec"), 10)); });
    modeBtn.setAttribute("aria-pressed", state.sections ? "true" : "false");
    var long = state.sections ? (hasParts ? "Show the whole part" : "Show the whole guide") : "One section at a time";
    modeBtn.innerHTML = '<span class="bg-mode-long">' + long + '</span><span class="bg-mode-short">' + (state.sections ? "Show all" : "1 at a time") + "</span>";
    // Pager (section mode only)
    pager.hidden = !state.sections;
    var i = pk.indexOf(state.current);
    var prev = pager.querySelector("[data-bb-prev]"), next = pager.querySelector("[data-bb-next]");
    var nextPart = hasParts && i === pk.length - 1 ? partIds[partIds.indexOf(state.part) + 1] : null;
    prev.disabled = i === 0;
    next.disabled = i === pk.length - 1 && !nextPart;
    pager.querySelector("[data-bb-prev-label]").textContent = i > 0 ? titles[pk[i - 1]] : "Previous";
    pager.querySelector("[data-bb-next-label]").textContent = i < pk.length - 1 ? titles[pk[i + 1]]
      : nextPart ? "Go to the " + tabs[partIds.indexOf(nextPart)].querySelector("b").textContent : "Next";
    pager.querySelector("[data-bb-count]").textContent = (i + 1) + " of " + pk.length;
    if (jump) {
      jump.querySelectorAll("option").forEach(function (o) { o.hidden = !inPart(parseInt(o.value, 10)); });
      jump.querySelectorAll("optgroup").forEach(function (g) { g.hidden = !g.querySelector("option:not([hidden])"); });
      jump.value = String(state.current);
    }
    highlight();
  }

  // Sticky offsets: the site nav's height, then the bar's own height.
  var siteNav = document.querySelector(".pf-nav");
  function measure() {
    var top = siteNav ? siteNav.offsetHeight : 0;
    guide.style.setProperty("--bb-top", top + "px");
    guide.style.setProperty("--bb-stick", (top + bar.offsetHeight) + "px");
  }
  // Highlight the chip of the section being read, and keep it in view.
  var ticking = false;
  function highlight() {
    ticking = false;
    var stick = (siteNav ? siteNav.offsetHeight : 0) + bar.offsetHeight + 24;
    var on = state.current;
    if (!state.sections) {
      partKeys().forEach(function (k) { if (heads[k] && heads[k].getBoundingClientRect().top <= stick) on = k; });
    }
    chips.forEach(function (c) {
      var hit = parseInt(c.getAttribute("data-sec"), 10) === on;
      if (hit && !c.classList.contains("is-on") && chipRow) {
        var l = c.offsetLeft - chipRow.offsetLeft, r = l + c.offsetWidth;
        if (l < chipRow.scrollLeft || r > chipRow.scrollLeft + chipRow.clientWidth) chipRow.scrollLeft = l - 24;
      }
      c.classList.toggle("is-on", hit);
    });
    bar.classList.toggle("is-stuck", bar.getBoundingClientRect().top <= (siteNav ? siteNav.offsetHeight : 0) + 1);
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(highlight); } }, { passive: true });
  window.addEventListener("resize", measure);

  function scrollTo(el) {
    if (!el) return;
    measure();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  // Which section holds an element id (#domain-3, #lesson-3-2, #how-to-use).
  function sectionFor(id) {
    var el = id && document.getElementById(id);
    if (!el) return null;
    for (var j = 0; j < blocks.length; j++) {
      if (blocks[j].el === el || blocks[j].el.contains(el)) return blocks[j].sec === "end" ? null : blocks[j].sec;
    }
    return null;
  }
  function go(k, targetId, smooth) {
    if (hasParts) state.part = partOf[k];
    state.current = k;
    render();
    var el = document.getElementById(targetId) || heads[k];
    if (smooth === false) { measure(); if (el) el.scrollIntoView({ block: "start" }); } else scrollTo(el);
  }
  function openPart(id) {
    state.part = id; state.current = partKeys()[0];
    render();
    scrollTo(bar.getBoundingClientRect().top < 0 ? heads[state.current] : null);
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      openPart(t.getAttribute("data-bb-part"));
      if (history.replaceState) history.replaceState(null, "", "#" + t.getAttribute("data-bb-part"));
    });
  });
  modeBtn.addEventListener("click", function () {
    if (!state.sections) {   // start from the section on screen
      var on = chips.filter(function (c) { return c.classList.contains("is-on"); })[0];
      if (on) state.current = parseInt(on.getAttribute("data-sec"), 10);
    }
    state.sections = !state.sections;
    try { localStorage.setItem(MODE_KEY, state.sections ? "1" : "0"); } catch (e) {}
    render();
    scrollTo(heads[state.current]);
  });
  pager.querySelector("[data-bb-prev]").addEventListener("click", function () {
    var pk = partKeys(); go(pk[pk.indexOf(state.current) - 1]);
  });
  pager.querySelector("[data-bb-next]").addEventListener("click", function () {
    var pk = partKeys(), i = pk.indexOf(state.current);
    if (i < pk.length - 1) go(pk[i + 1]);
    else if (hasParts) openPart(partIds[partIds.indexOf(state.part) + 1]);
  });
  if (jump) jump.addEventListener("change", function () { go(parseInt(jump.value, 10)); });

  // Any in-page link to a section or lesson: switch part/section first.
  guide.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || !unlocked()) return;
    var id = decodeURIComponent(a.getAttribute("href").slice(1));
    var k = sectionFor(id);
    if (k === null) return;
    e.preventDefault();
    go(k, id);
    if (history.replaceState) history.replaceState(null, "", "#" + id);
  });
  function fromHash(smooth) {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return false;
    if (hasParts && partIds.indexOf(id) >= 0) { openPart(id); return true; }
    var k = sectionFor(id);
    if (k === null) return false;
    go(k, id, smooth);
    return true;
  }
  window.addEventListener("hashchange", function () { if (unlocked()) fromHash(false); });

  function start() {
    try { state.sections = localStorage.getItem(MODE_KEY) === "1"; } catch (e) {}
    measure();
    if (!fromHash(false)) render();
  }
  if (unlocked()) start();
  guide.addEventListener("bb:unlocked", start);
})();

/* Exam prep library (src/guides/index.njk): filter chips over one grid.
   Each card lists its tags in data-gl-tags ("claude", "google-cloud",
   "soon"); the chosen filter is kept in the URL hash (#claude) so it can
   be shared. Without JS every card shows. */
(function () {
  "use strict";
  var root = document.querySelector("[data-gl]");
  if (!root) return;
  var buttons = [].slice.call(root.querySelectorAll("[data-gl-filter]"));
  var cards = [].slice.call(root.querySelectorAll("[data-gl-tags]"));
  var count = root.querySelector("[data-gl-count]");
  function set(f, push) {
    if (!buttons.some(function (b) { return b.getAttribute("data-gl-filter") === f; })) f = "all";
    var shown = 0;
    cards.forEach(function (c) {
      var hit = f === "all" || c.getAttribute("data-gl-tags").split(" ").indexOf(f) >= 0;
      c.hidden = !hit; if (hit) shown++;
    });
    buttons.forEach(function (b) {
      var on = b.getAttribute("data-gl-filter") === f;
      b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (count) count.textContent = shown + (shown === 1 ? " guide" : " guides");
    if (push && history.replaceState) history.replaceState(null, "", f === "all" ? location.pathname : "#" + f);
  }
  buttons.forEach(function (b) { b.addEventListener("click", function () { set(b.getAttribute("data-gl-filter"), true); }); });
  set(decodeURIComponent(location.hash.slice(1)) || "all", false);
})();

/* Free resources (src/resources/resource.njk): a Copy button on every prompt
   and command block, and "Save as PDF", which opens the print dialog (print
   styles in guides.css drop the sky, nav and footer). */
(function () {
  "use strict";
  document.querySelectorAll("[data-rs-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var code = btn.closest(".rs-paste").querySelector("pre");
      var text = code ? code.innerText : "";
      var done = function () {
        btn.textContent = "Copied";
        btn.classList.add("is-done");
        setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("is-done"); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { select(code, btn); });
      } else { select(code, btn); }
    });
  });
  // No clipboard access: select the text so Ctrl/Cmd+C copies it.
  function select(node, btn) {
    btn.textContent = "Selected";
    setTimeout(function () { btn.textContent = "Copy"; }, 1600);
    var range = document.createRange();
    range.selectNodeContents(node);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  document.querySelectorAll("[data-rs-print]").forEach(function (btn) {
    btn.addEventListener("click", function () { window.print(); });
  });
})();
