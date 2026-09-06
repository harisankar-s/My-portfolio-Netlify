(function () {
  var ENDPOINT = "/api/ask-writing";
  var MAX_HISTORY_TURNS = 6;

  var history = [];
  var pending = false;

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Only markdown-style links to a same-site path (e.g. /blog/slug/) are
  // turned into real links — everything else in the reply stays plain,
  // escaped text, since it comes from model output we don't fully control.
  function renderReplyHtml(text) {
    var escaped = escapeHtml(text);
    var withLinks = escaped.replace(/\[([^\]]+)\]\((\/[^)\s]+)\)/g, function (match, label, href) {
      return '<a href="' + href + '" class="askwriting-link">' + label + "</a>";
    });
    return withLinks.replace(/\n/g, "<br>");
  }

  var PENDING_PHRASES = [
    "Searching the archive",
    "Reviewing relevant posts",
    "Cross-referencing sources",
    "Checking what's published",
  ];

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === "text") node.textContent = attrs[key];
        else node.setAttribute(key, attrs[key]);
      });
    }
    (children || []).forEach(function (child) {
      node.appendChild(child);
    });
    return node;
  }

  function addMessage(container, role, text, asHtml) {
    var isAssistant = role.indexOf("assistant") === 0;
    var row = el("div", { class: "askwriting-row " + (isAssistant ? "assistant" : "user") });
    if (isAssistant) row.appendChild(el("div", { class: "askwriting-avatar" }));

    var node = el("div", { class: "askwriting-msg " + role });
    if (asHtml) node.innerHTML = text;
    else node.textContent = text;
    row.appendChild(node);

    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
    return row;
  }

  function formatLatency(ms) {
    if (typeof ms !== "number") return "";
    return ms < 1000 ? Math.round(ms) + "ms" : (ms / 1000).toFixed(1) + "s";
  }

  function appendMeta(container, data) {
    if (!data || typeof data.model !== "string") return;

    var metaRow = el("div", { class: "askwriting-meta-row" });
    var badgeText = data.model + (typeof data.latencyMs === "number" ? " · " + formatLatency(data.latencyMs) : "");
    metaRow.appendChild(el("span", { class: "askwriting-modelbadge", text: badgeText }));

    if (Array.isArray(data.sources) && data.sources.length) {
      var sourcesWrap = el("div", { class: "askwriting-sources" });
      data.sources.forEach(function (s) {
        sourcesWrap.appendChild(el("a", { class: "askwriting-source-chip", href: s.url, text: s.title }));
      });
      metaRow.appendChild(sourcesWrap);
    }

    container.appendChild(metaRow);
    container.scrollTop = container.scrollHeight;
  }

  function sendMessage(ui, text) {
    if (pending || !text) return;

    addMessage(ui.messages, "user", text);
    ui.input.value = "";
    pending = true;
    ui.send.disabled = true;
    var phrase = PENDING_PHRASES[Math.floor(Math.random() * PENDING_PHRASES.length)];
    var pendingHtml = phrase + '<span class="askwriting-dots"><span></span><span></span><span></span></span>';
    var pendingNode = addMessage(ui.messages, "assistant pending", pendingHtml, true);

    var body = {
      message: text,
      history: history.slice(-MAX_HISTORY_TURNS),
    };

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Request failed");
          return data;
        });
      })
      .then(function (data) {
        pendingNode.remove();
        addMessage(ui.messages, "assistant", renderReplyHtml(data.reply), true);
        appendMeta(ui.messages, data);
        history.push({ role: "user", content: text });
        history.push({ role: "assistant", content: data.reply });
      })
      .catch(function () {
        pendingNode.remove();
        addMessage(
          ui.messages,
          "assistant error",
          "That request didn't go through. Please try again in a moment."
        );
      })
      .finally(function () {
        pending = false;
        ui.send.disabled = false;
        ui.input.focus();
      });
  }

  function init() {
    var root = document.getElementById("askwriting-root");
    if (!root) return;

    var ui = {
      messages: document.getElementById("askwriting-messages"),
      form: document.getElementById("askwriting-form"),
      input: document.getElementById("askwriting-input"),
      send: document.getElementById("askwriting-send"),
    };
    if (!ui.messages || !ui.form || !ui.input || !ui.send) return;

    addMessage(
      ui.messages,
      "assistant",
      "Hi, I'm Trench AI ⛏️. Ask me anything about what Hari's written — data platforms, GenAI, LangChain, dbt, whatever's on the blog. I'll only answer from the posts themselves."
    );

    ui.input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        ui.form.requestSubmit();
      }
    });

    ui.form.addEventListener("submit", function (event) {
      event.preventDefault();
      sendMessage(ui, ui.input.value.trim());
    });

    document.querySelectorAll(".askwriting-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        sendMessage(ui, chip.getAttribute("data-question") || chip.textContent.trim());
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
