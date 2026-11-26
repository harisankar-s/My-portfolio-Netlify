/* Hub interactions that aren't part of the sky (space.js / galaxy.js).
   The "Try one now" sample question: click or press Enter/Space on an
   option to answer it. The pick turns green when right, red when wrong (the
   right one is then shown in green), and the explanation opens. Without JS
   the "Reveal the answer" <details> still works on its own. */
(function () {
  "use strict";
  document.querySelectorAll("[data-hub-quiz]").forEach(function (quiz) {
    var opts = Array.prototype.slice.call(quiz.querySelectorAll(".hub-byte-opts li"));
    var details = quiz.querySelector("details");
    var hint = quiz.querySelector(".hub-byte-hint");
    var done = false;

    function answer(li) {
      if (done) return;
      done = true;
      var right = li.hasAttribute("data-answer");
      li.classList.add("is-picked", right ? "is-right" : "is-wrong");
      opts.forEach(function (o) {
        o.setAttribute("aria-disabled", "true");
        o.tabIndex = -1;
        if (o.hasAttribute("data-answer")) o.classList.add("is-right");
      });
      quiz.classList.add("is-answered");
      if (hint) hint.textContent = right ? "Correct. Here's why:" : "Not quite. The right answer is in green:";
      if (details) details.open = true;
    }

    opts.forEach(function (li) {
      li.addEventListener("click", function () { answer(li); });
      li.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); answer(li); }
      });
    });
  });
})();
