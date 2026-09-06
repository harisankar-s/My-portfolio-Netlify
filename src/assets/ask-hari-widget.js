(function () {
  var ENDPOINT = "/api/ask-hari";
  var MAX_HISTORY_TURNS = 6;
  var ARTICLE_TEXT_LIMIT = 4000;

  var history = [];
  var pending = false;

  function getArticleContext() {
    var body = document.querySelector(".article-body");
    if (!body) return undefined;
    var titleEl = document.querySelector(".article-title");
    var title = titleEl ? titleEl.textContent.trim() : document.title;
    var text = body.innerText.trim().slice(0, ARTICLE_TEXT_LIMIT);
    if (!text) return undefined;
    return { title: title, text: text };
  }

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

  function buildUI() {
    var root = el("div", { id: "askhari-root" });

    var toggle = el("button", { id: "askhari-toggle", type: "button" }, [
      document.createTextNode("💬 AskHari.ai"),
    ]);

    var messages = el("div", { id: "askhari-messages" });

    var form = el("form", { id: "askhari-form" });
    var input = el("textarea", {
      id: "askhari-input",
      rows: "1",
      placeholder: "Ask about Hari's experience, or this article…",
    });
    var send = el("button", { id: "askhari-send", type: "submit" }, [document.createTextNode("Send")]);
    form.appendChild(input);
    form.appendChild(send);

    var closeBtn = el("button", { id: "askhari-close", type: "button", "aria-label": "Close" }, [
      document.createTextNode("✕"),
    ]);
    var header = el("div", { id: "askhari-header" }, [
      el("div", {}, [
        el("strong", { text: "AskHari.ai" }),
        el("span", { text: "Ask about Hari's work, or this article" }),
      ]),
      closeBtn,
    ]);

    var panel = el("div", { id: "askhari-panel", hidden: "hidden" }, [header, messages, form]);

    root.appendChild(toggle);
    root.appendChild(panel);
    document.body.appendChild(root);

    return { root: root, toggle: toggle, panel: panel, messages: messages, form: form, input: input, send: send, closeBtn: closeBtn };
  }

  function addMessage(container, role, text) {
    var node = el("div", { class: "askhari-msg " + role, text: text });
    container.appendChild(node);
    container.scrollTop = container.scrollHeight;
    return node;
  }

  function formatLatency(ms) {
    if (typeof ms !== "number") return "";
    return ms < 1000 ? Math.round(ms) + "ms" : (ms / 1000).toFixed(1) + "s";
  }

  function appendMeta(container, data) {
    if (!data || typeof data.model !== "string") return;
    var label = (data.fallback ? "Fallback via " : "") + data.model;
    var text = label + (typeof data.latencyMs === "number" ? " · " + formatLatency(data.latencyMs) : "");
    container.appendChild(el("div", { class: "askhari-meta", text: text }));
    container.scrollTop = container.scrollHeight;
  }

  function init() {
    var ui = buildUI();
    var greeted = false;

    function open() {
      ui.panel.hidden = false;
      ui.toggle.setAttribute("aria-expanded", "true");
      if (!greeted) {
        greeted = true;
        addMessage(
          ui.messages,
          "assistant",
          "Hi, I'm AskHari.ai. Ask me about Hari's experience, skills, or certifications" +
            (getArticleContext() ? ", or about this article." : ".")
        );
      }
      ui.input.focus();
    }

    function close() {
      ui.panel.hidden = true;
      ui.toggle.setAttribute("aria-expanded", "false");
    }

    ui.toggle.addEventListener("click", function () {
      if (ui.panel.hidden) open();
      else close();
    });
    ui.closeBtn.addEventListener("click", close);

    ui.input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        ui.form.requestSubmit();
      }
    });

    ui.form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (pending) return;

      var text = ui.input.value.trim();
      if (!text) return;

      addMessage(ui.messages, "user", text);
      ui.input.value = "";
      pending = true;
      ui.send.disabled = true;
      var pendingNode = addMessage(ui.messages, "assistant pending", "Thinking…");

      var body = {
        message: text,
        history: history.slice(-MAX_HISTORY_TURNS),
        articleContext: getArticleContext(),
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
          addMessage(ui.messages, "assistant", data.reply);
          appendMeta(ui.messages, data);
          history.push({ role: "user", content: text });
          history.push({ role: "assistant", content: data.reply });
        })
        .catch(function () {
          pendingNode.remove();
          addMessage(
            ui.messages,
            "assistant error",
            "Sorry, AskHari.ai is temporarily unavailable. Please try again shortly."
          );
        })
        .finally(function () {
          pending = false;
          ui.send.disabled = false;
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
