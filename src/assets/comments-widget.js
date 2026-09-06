(function () {
  var ENDPOINT = "/api/comments";

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

  function safeStorage() {
    try {
      var testKey = "__cw_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    } catch (e) {
      return null;
    }
  }

  function getVoterId(storage) {
    var key = "cw-voter-id";
    var existing = storage && storage.getItem(key);
    if (existing) return existing;
    var id =
      window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : "v-" + Date.now() + "-" + Math.random().toString(36).slice(2, 11);
    if (storage) storage.setItem(key, id);
    return id;
  }

  function upvoteIcon() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    var path = document.createElementNS(ns, "path");
    path.setAttribute("d", "M12 4l8 8h-5v8h-6v-8H4z");
    svg.appendChild(path);
    return svg;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "";
    }
  }

  function buildUI() {
    var upvoteCount = el("span", { class: "cw-upvote-count", text: "0" });
    var upvoteBtn = el(
      "button",
      { type: "button", class: "cw-upvote-btn", "aria-pressed": "false", "aria-label": "Upvote this article" },
      [upvoteIcon(), el("span", { class: "cw-upvote-label", text: "Upvote" }), upvoteCount]
    );
    var upvoteSection = el("div", { class: "cw-section" }, [upvoteBtn]);

    var nameInput = el("input", { type: "text", placeholder: "Name (optional)", maxlength: "60" });
    var textInput = el("textarea", { placeholder: "Share a thought or question…", maxlength: "1500" });
    var website = el("input", {
      type: "text",
      class: "cw-website",
      name: "website",
      tabindex: "-1",
      autocomplete: "off",
      "aria-hidden": "true",
    });
    var submit = el("button", { type: "submit", class: "cw-submit", text: "Post comment" });
    var status = el("span", { class: "cw-status" });
    var form = el("form", { class: "cw-form" }, [
      nameInput,
      textInput,
      website,
      el("div", { class: "cw-form-footer" }, [submit, status]),
    ]);

    var countLabel = el("h2", { text: "Comments" });
    var list = el("div", { class: "cw-list" });
    var commentsSection = el("div", { class: "cw-section" }, [countLabel, form, list]);

    return {
      upvoteBtn: upvoteBtn,
      upvoteCount: upvoteCount,
      form: form,
      nameInput: nameInput,
      textInput: textInput,
      website: website,
      submit: submit,
      status: status,
      countLabel: countLabel,
      list: list,
      sections: [upvoteSection, commentsSection],
    };
  }

  function renderUpvote(ui, count, upvoted) {
    ui.upvoteCount.textContent = String(count);
    ui.upvoteBtn.classList.toggle("cw-upvote-active", !!upvoted);
    ui.upvoteBtn.setAttribute("aria-pressed", upvoted ? "true" : "false");
  }

  function renderComments(ui, comments) {
    ui.countLabel.textContent = "Comments (" + comments.length + ")";
    ui.list.textContent = "";
    if (!comments.length) {
      ui.list.appendChild(el("p", { class: "cw-empty", text: "Be the first to comment." }));
      return;
    }
    comments.forEach(function (comment) {
      var head = el("div", { class: "cw-comment-head" }, [
        el("span", { class: "cw-comment-name", text: comment.name || "Anonymous" }),
        el("span", { class: "cw-comment-date", text: formatDate(comment.createdAt) }),
      ]);
      var body = el("p", { class: "cw-comment-text", text: comment.text });
      ui.list.appendChild(el("div", { class: "cw-comment" }, [head, body]));
    });
  }

  function prependComment(ui, comment) {
    if (ui.list.querySelector(".cw-empty")) ui.list.textContent = "";
    var head = el("div", { class: "cw-comment-head" }, [
      el("span", { class: "cw-comment-name", text: comment.name || "Anonymous" }),
      el("span", { class: "cw-comment-date", text: formatDate(comment.createdAt) }),
    ]);
    var body = el("p", { class: "cw-comment-text", text: comment.text });
    ui.list.insertBefore(el("div", { class: "cw-comment" }, [head, body]), ui.list.firstChild);
  }

  function setStatus(ui, message, isError) {
    ui.status.textContent = message || "";
    ui.status.classList.toggle("cw-status-error", !!isError);
  }

  function init() {
    var root = document.getElementById("comments-widget");
    if (!root) return;
    var slug = root.getAttribute("data-slug");
    if (!slug) return;

    var storage = safeStorage();
    var voterId = getVoterId(storage);
    var upvotedKey = "cw-upvoted-" + slug;
    var nameKey = "cw-name";
    var ownUpvoted = !!(storage && storage.getItem(upvotedKey));
    var upvotePending = false;

    var ui = buildUI();
    ui.sections.forEach(function (section) {
      root.appendChild(section);
    });

    var savedName = storage && storage.getItem(nameKey);
    if (savedName) ui.nameInput.value = savedName;

    renderUpvote(ui, 0, ownUpvoted);

    fetch(ENDPOINT + "?slug=" + encodeURIComponent(slug))
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Request failed");
          return data;
        });
      })
      .then(function (data) {
        renderUpvote(ui, data.upvotes.count, ownUpvoted);
        renderComments(ui, data.comments);
      })
      .catch(function () {
        renderComments(ui, []);
        setStatus(ui, "Comments are temporarily unavailable.", true);
      });

    ui.upvoteBtn.addEventListener("click", function () {
      if (upvotePending) return;
      upvotePending = true;
      ui.upvoteBtn.disabled = true;

      fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: slug, action: "upvote", voterId: voterId }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.error || "Request failed");
            return data;
          });
        })
        .then(function (data) {
          ownUpvoted = data.upvoted;
          if (storage) {
            if (ownUpvoted) storage.setItem(upvotedKey, "1");
            else storage.removeItem(upvotedKey);
          }
          renderUpvote(ui, data.count, ownUpvoted);
        })
        .catch(function () {
          setStatus(ui, "Couldn't save your upvote. Please try again.", true);
        })
        .finally(function () {
          upvotePending = false;
          ui.upvoteBtn.disabled = false;
        });
    });

    ui.form.addEventListener("submit", function (event) {
      event.preventDefault();
      var text = ui.textInput.value.trim();
      if (!text) return;
      var name = ui.nameInput.value.trim();

      ui.submit.disabled = true;
      setStatus(ui, "Posting…");

      fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: slug, action: "comment", name: name, text: text, website: ui.website.value }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.error || "Request failed");
            return data;
          });
        })
        .then(function (data) {
          prependComment(ui, data.comment);
          ui.countLabel.textContent = "Comments (" + (ui.list.querySelectorAll(".cw-comment").length) + ")";
          ui.textInput.value = "";
          if (storage && name) storage.setItem(nameKey, name);
          setStatus(ui, "Posted.");
        })
        .catch(function (err) {
          setStatus(ui, err.message || "Couldn't post your comment. Please try again.", true);
        })
        .finally(function () {
          ui.submit.disabled = false;
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
