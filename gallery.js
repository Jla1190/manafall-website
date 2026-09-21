(function () {
  const cfg = window.MANAFALL_SITE || {};
  const repo = cfg.githubRepo || "Jla1190/manafall-website";

  function issueNewUrl(name, caption, links) {
    const title = "[From the road] " + String(name || "Picture").slice(0, 70);
    const body = [
      "### Your name",
      "",
      name,
      "",
      "### What happened",
      "",
      caption,
      "",
      "### Picture or video links",
      "",
      links
    ].join("\n");
    return "https://github.com/" + repo + "/issues/new?labels=from-the-road&title=" +
      encodeURIComponent(title) + "&body=" + encodeURIComponent(body);
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null && text !== "") node.textContent = text;
    return node;
  }

  function mediaNode(item) {
    if (!item) return null;
    if (item.type === "youtube" && item.id) {
      const wrap = el("div", "gallery-embed");
      const iframe = document.createElement("iframe");
      iframe.title = "Player clip";
      iframe.src = "https://www.youtube.com/embed/" + encodeURIComponent(item.id);
      iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
      iframe.setAttribute("allowfullscreen", "");
      iframe.loading = "lazy";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      wrap.appendChild(iframe);
      return wrap;
    }
    if (item.type === "vimeo" && item.id) {
      const wrap = el("div", "gallery-embed");
      const iframe = document.createElement("iframe");
      iframe.title = "Player clip";
      iframe.src = "https://player.vimeo.com/video/" + encodeURIComponent(item.id);
      iframe.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
      iframe.setAttribute("allowfullscreen", "");
      iframe.loading = "lazy";
      wrap.appendChild(iframe);
      return wrap;
    }
    if (item.type === "image" && item.url) {
      const img = document.createElement("img");
      img.className = "gallery-photo";
      img.src = item.url;
      img.alt = "Player screenshot from Manafall";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("click", function () {
        openLightbox(item.url);
      });
      return img;
    }
    if (item.url) {
      const a = el("a", "gallery-link", "Open clip");
      a.href = item.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      return a;
    }
    return null;
  }

  function openLightbox(url) {
    const existing = document.getElementById("galleryLightbox");
    if (existing) existing.remove();
    const overlay = el("div", "gallery-lightbox");
    overlay.id = "galleryLightbox";
    overlay.setAttribute("role", "dialog");
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Player screenshot from Manafall";
    overlay.appendChild(img);
    overlay.addEventListener("click", function () { overlay.remove(); });
    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", onEsc);
      }
    });
    document.body.appendChild(overlay);
  }

  function renderGallery(data) {
    const grid = document.getElementById("galleryGrid");
    const empty = document.getElementById("galleryEmpty");
    if (!grid) return;
    grid.textContent = "";
    const items = (data && data.items) ? data.items : [];
    if (!items.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    items.forEach(function (item) {
      const card = el("article", "gallery-card");
      const mediaWrap = el("div", "gallery-media");
      const first = (item.media && item.media[0]) ? mediaNode(item.media[0]) : null;
      if (first) mediaWrap.appendChild(first);
      card.appendChild(mediaWrap);
      if (item.media && item.media.length > 1) {
        const rest = el("div", "gallery-more");
        item.media.slice(1).forEach(function (m) {
          const extra = mediaNode(m);
          if (extra) rest.appendChild(extra);
        });
        card.appendChild(rest);
      }
      card.appendChild(el("h3", "", item.name || "Traveler"));
      if (item.caption) card.appendChild(el("p", "", item.caption));
      grid.appendChild(card);
    });
  }

  const grid = document.getElementById("galleryGrid");
  if (grid) {
    fetch("gallery.json", { cache: "no-store" })
      .then(function (res) { return res.ok ? res.json() : { items: [] }; })
      .then(renderGallery)
      .catch(function () { renderGallery({ items: [] }); });
  }

  const form = document.getElementById("galleryForm");
  const status = document.getElementById("galleryFormStatus");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = (document.getElementById("galleryName") || {}).value || "";
      const caption = (document.getElementById("galleryCaption") || {}).value || "";
      const links = (document.getElementById("galleryLinks") || {}).value || "";
      const trimmedName = name.trim();
      const trimmedCaption = caption.trim();
      const trimmedLinks = links.trim();
      if (!trimmedName || !trimmedCaption || !trimmedLinks) {
        if (status) status.textContent = "Fill your name, what happened, and at least one https link.";
        return;
      }
      if (!/^https:\/\//im.test(trimmedLinks)) {
        if (status) status.textContent = "Use https links. YouTube, Imgur, or a picture URL all work.";
        return;
      }
      if (status) {
        status.textContent = "GitHub will open with your post filled in. Send the issue there. It stays off this page until Jean-Luc accepts it.";
      }
      window.open(issueNewUrl(trimmedName, trimmedCaption, trimmedLinks), "_blank", "noopener,noreferrer");
    });
  }

  const templateLink = document.getElementById("galleryTemplateLink");
  if (templateLink) {
    templateLink.href = "https://github.com/" + repo + "/issues/new?template=from-the-road.yml";
  }
})();
