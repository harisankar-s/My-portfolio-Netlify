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
