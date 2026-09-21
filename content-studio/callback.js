(function () {
  const params = new URLSearchParams(window.location.search);
  const log = document.getElementById("callbackLog");
  const code = params.get("code");
  const state = params.get("state");
  const scopes = params.get("scopes");
  const error = params.get("error");
  const errorDescription = params.get("error_description");
  const expected = sessionStorage.getItem("mf_tt_oauth_state");

  if (error) {
    log.textContent = "Authorization failed.\nerror=" + error + "\n" + (errorDescription || "");
    return;
  }

  if (!code) {
    log.textContent = "No authorization code in the URL. Start again from Content Studio → Connect with TikTok.";
    return;
  }

  if (expected && state && expected !== state) {
    log.textContent = "State mismatch (possible CSRF). Start Login Kit again from Content Studio.";
    return;
  }

  sessionStorage.setItem("mf_tt_auth_code", code);
  if (scopes) sessionStorage.setItem("mf_tt_scopes", scopes);

  log.textContent =
    "Login Kit success.\n\n"
    + "Granted scopes: " + (scopes || "(check portal)") + "\n"
    + "Authorization code received (stored for Content Studio).\n\n"
    + "Next: exchange this code for an access token using your Sandbox / server (client secret stays off this static site), paste the access token on Content Studio, then run Creator Info + Publish.\n\n"
    + "code=" + code;
})();
