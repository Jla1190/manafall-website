(function () {
  const cfg = window.MANAFALL_SITE || {};
  const repo = cfg.githubRepo || "Jla1190/manafall-website";
  const TOKEN_KEY = "manafall-gallery-token";

  const tokenInput = document.getElementById("reviewToken");
  const status = document.getElementById("reviewStatus");
  const list = document.getElementById("reviewList");
  const loadBtn = document.getElementById("reviewLoad");
  const forgetBtn = document.getElementById("reviewForget");

  if (tokenInput) tokenInput.value = sessionStorage.getItem(TOKEN_KEY) || "";

  function setStatus(text, kind) {
    if (!status) return;
    status.textContent = text;
    status.className = "review-status" + (kind ? " " + kind : "");
  }

  function headers() {
    const token = (tokenInput && tokenInput.value || "").trim();
    const h = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    if (token) h.Authorization = "Bearer " + token;
    return h;
  }

  function api(path, options) {
    return fetch("https://api.github.com/repos/" + repo + path, Object.assign({
      headers: headers()
    }, options || {})).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) {
          const msg = body && body.message ? body.message : ("GitHub error " + res.status);
          throw new Error(msg);
        }
        return body;
      });
    });
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null && text !== "") node.textContent = text;
    return node;
  }

  function urlsFrom(text) {
    const found = [];
    const re = /https:\/\/[^\s<>)"']+/gi;
    let m;
    while ((m = re.exec(String(text || ""))) && found.length < 8) {
      found.push(m[0].replace(/[.,;:]+$/, ""));
    }
    return found;
  }

  function section(body, heading) {
    const re = new RegExp("###\\s*" + heading + "\\s*\\n([\\s\\S]*?)(?=\\n###\\s|$)", "i");
    const m = String(body || "").match(re);
    return m ? m[1].trim() : "";
  }

  function renderIssue(issue) {
    const card = el("article", "review-card");
    const name = section(issue.body, "Your name") || issue.user.login;
    const caption = section(issue.body, "What happened") || issue.title;
    const mediaText = section(issue.body, "Picture or video links") || issue.body;
    card.appendChild(el("h3", "", name));
    card.appendChild(el("p", "review-meta", "#" + issue.number + " · " + (issue.user && issue.user.login ? issue.user.login : "player")));
    card.appendChild(el("p", "", caption));
    const media = el("div", "review-media");
    urlsFrom(mediaText).forEach(function (url) {
      const lower = url.toLowerCase();
      if (/\.(png|jpe?g|gif|webp|avif)(\?|$)/.test(lower) || /imgur|discordapp|user-attachments|githubusercontent/.test(lower)) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = "Submitted picture";
        img.referrerPolicy = "no-referrer";
        media.appendChild(img);
      } else {
        const a = el("a", "", url);
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        media.appendChild(a);
      }
    });
    card.appendChild(media);
    const actions = el("div", "review-actions");
    const open = el("a", "btn ghost", "Open on GitHub");
    open.href = issue.html_url;
    open.target = "_blank";
    open.rel = "noopener noreferrer";
    const approve = el("button", "btn primary", "Approve");
    approve.type = "button";
    approve.addEventListener("click", function () { decide(issue.number, "gallery-approved", approve, deny); });
    const deny = el("button", "btn deny", "Deny");
    deny.type = "button";
    deny.addEventListener("click", function () { decide(issue.number, "gallery-denied", approve, deny); });
    actions.appendChild(open);
    actions.appendChild(approve);
    actions.appendChild(deny);
    card.appendChild(actions);
    return card;
  }

  function decide(number, label, approveBtn, denyBtn) {
    const token = (tokenInput && tokenInput.value || "").trim();
    if (!token) {
      setStatus("Paste your GitHub token first. Approve and deny need write access to Issues on this repo.", "bad");
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, token);
    approveBtn.disabled = true;
    denyBtn.disabled = true;
    setStatus("Sending " + (label === "gallery-approved" ? "approve" : "deny") + " for #" + number + "…");
    api("/issues/" + number + "/labels", {
      method: "POST",
      body: JSON.stringify({ labels: [label] })
    }).then(function () {
      setStatus("Saved. GitHub will post approved pictures to the public page in about a minute.", "ok");
      loadQueue();
    }).catch(function (err) {
      approveBtn.disabled = false;
      denyBtn.disabled = false;
      setStatus(err.message, "bad");
    });
  }

  function loadQueue() {
    const token = (tokenInput && tokenInput.value || "").trim();
    if (!token) {
      setStatus("Paste a GitHub token to load the waiting pile. Waiting posts stay off the public page.", "bad");
      if (list) list.textContent = "";
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, token);
    setStatus("Loading waiting posts…");
    api("/issues?labels=from-the-road&state=open&per_page=50")
      .then(function (issues) {
        const pending = (issues || []).filter(function (issue) {
          const names = (issue.labels || []).map(function (l) { return l.name; });
          return names.indexOf("gallery-approved") < 0 && names.indexOf("gallery-denied") < 0;
        });
        if (list) {
          list.textContent = "";
          if (!pending.length) {
            list.appendChild(el("p", "panel-copy", "Nothing waiting. New player posts show up here."));
          } else {
            pending.forEach(function (issue) { list.appendChild(renderIssue(issue)); });
          }
        }
        setStatus(pending.length ? (pending.length + " waiting.") : "Queue is empty.", "ok");
      })
      .catch(function (err) {
        setStatus(err.message, "bad");
      });
  }

  if (loadBtn) loadBtn.addEventListener("click", loadQueue);
  if (forgetBtn) {
    forgetBtn.addEventListener("click", function () {
      sessionStorage.removeItem(TOKEN_KEY);
      if (tokenInput) tokenInput.value = "";
      if (list) list.textContent = "";
      setStatus("Token cleared from this browser tab.");
    });
  }
  if (tokenInput && tokenInput.value) loadQueue();
})();
