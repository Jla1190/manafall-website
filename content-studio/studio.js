(function () {
  const REDIRECT_URI = "https://jla1190.github.io/manafall-website/content-studio/callback.html";
  const SCOPES = "user.info.basic,video.publish";
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const clientKeyInput = document.getElementById("clientKey");
  const accessTokenInput = document.getElementById("accessToken");
  const authStatus = document.getElementById("authStatus");
  const authDetail = document.getElementById("authDetail");
  const creatorLog = document.getElementById("creatorLog");
  const publishLog = document.getElementById("publishLog");

  clientKeyInput.value = localStorage.getItem("mf_tt_client_key") || "";
  accessTokenInput.value = sessionStorage.getItem("mf_tt_access_token") || "";

  const code = sessionStorage.getItem("mf_tt_auth_code");
  const scopes = sessionStorage.getItem("mf_tt_scopes");
  if (code) {
    authStatus.textContent = "Login Kit OK — code received";
    authStatus.classList.add("ok");
    authDetail.hidden = false;
    authDetail.textContent = "Authorization code received.\nScopes: " + (scopes || "(see portal)") + "\n\nExchange this code for an access token in Sandbox / your server, then paste the token below.\n\ncode=" + code;
  }

  document.getElementById("saveKeyBtn").addEventListener("click", function () {
    localStorage.setItem("mf_tt_client_key", clientKeyInput.value.trim());
    alert("Client key saved in this browser.");
  });

  document.getElementById("saveTokenBtn").addEventListener("click", function () {
    sessionStorage.setItem("mf_tt_access_token", accessTokenInput.value.trim());
    alert("Access token saved for this browser session.");
  });

  document.getElementById("loginBtn").addEventListener("click", function () {
    const clientKey = clientKeyInput.value.trim() || localStorage.getItem("mf_tt_client_key") || "";
    if (!clientKey) {
      alert("Paste your Sandbox client key first.");
      return;
    }
    localStorage.setItem("mf_tt_client_key", clientKey);
    const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(function (b) { return b.toString(16).padStart(2, "0"); })
      .join("");
    sessionStorage.setItem("mf_tt_oauth_state", state);
    const url = "https://www.tiktok.com/v2/auth/authorize/"
      + "?client_key=" + encodeURIComponent(clientKey)
      + "&scope=" + encodeURIComponent(SCOPES)
      + "&response_type=code"
      + "&redirect_uri=" + encodeURIComponent(REDIRECT_URI)
      + "&state=" + encodeURIComponent(state);
    window.location.href = url;
  });

  document.getElementById("creatorInfoBtn").addEventListener("click", async function () {
    const token = accessTokenInput.value.trim() || sessionStorage.getItem("mf_tt_access_token") || "";
    if (!token) {
      alert("Paste a user access token first.");
      return;
    }
    creatorLog.hidden = false;
    creatorLog.textContent = "POST /v2/post/publish/creator_info/query/ …";
    try {
      const res = await fetch("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json; charset=UTF-8"
        }
      });
      const body = await res.json();
      creatorLog.textContent = JSON.stringify(body, null, 2);
      if (body && body.data && body.data.privacy_level_options) {
        const select = document.getElementById("privacy");
        const options = body.data.privacy_level_options;
        select.innerHTML = "";
        options.forEach(function (opt) {
          const o = document.createElement("option");
          o.value = opt;
          o.textContent = opt;
          select.appendChild(o);
        });
      }
    } catch (err) {
      creatorLog.textContent = String(err);
    }
  });

  document.getElementById("publishBtn").addEventListener("click", async function () {
    const token = accessTokenInput.value.trim() || sessionStorage.getItem("mf_tt_access_token") || "";
    const fileInput = document.getElementById("videoFile");
    const file = fileInput.files && fileInput.files[0];
    const caption = document.getElementById("caption").value.trim();
    const privacy = document.getElementById("privacy").value;
    publishLog.hidden = false;
    if (!token) {
      publishLog.textContent = "Missing access token.";
      return;
    }
    if (!file) {
      publishLog.textContent = "Choose an mp4/mov file first.";
      return;
    }

    const size = file.size;
    const chunkSize = size;
    publishLog.textContent = "Init Direct Post (FILE_UPLOAD)…\nfile=" + file.name + " size=" + size;

    try {
      const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify({
          post_info: {
            title: caption,
            privacy_level: privacy,
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000
          },
          source_info: {
            source: "FILE_UPLOAD",
            video_size: size,
            chunk_size: chunkSize,
            total_chunk_count: 1
          }
        })
      });
      const initBody = await initRes.json();
      publishLog.textContent += "\n\nInit response:\n" + JSON.stringify(initBody, null, 2);
      const uploadUrl = initBody && initBody.data && initBody.data.upload_url;
      const publishId = initBody && initBody.data && initBody.data.publish_id;
      if (!uploadUrl) {
        return;
      }

      publishLog.textContent += "\n\nUploading video bytes to upload_url…";
      const bytes = await file.arrayBuffer();
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "video/mp4",
          "Content-Range": "bytes 0-" + (size - 1) + "/" + size
        },
        body: bytes
      });
      publishLog.textContent += "\nUpload HTTP " + putRes.status;

      if (publishId) {
        publishLog.textContent += "\n\nFetching publish status…";
        const statusRes = await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json; charset=UTF-8"
          },
          body: JSON.stringify({ publish_id: publishId })
        });
        const statusBody = await statusRes.json();
        publishLog.textContent += "\n" + JSON.stringify(statusBody, null, 2);
      }
    } catch (err) {
      publishLog.textContent += "\n\nError: " + String(err);
    }
  });
})();
