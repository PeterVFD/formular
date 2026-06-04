(function () {
  const ACCESS_KEY = "vf2026";
  const SESSION_MINUTES = 15;

  // gleiche neuen Key-Namen wie in haupt/index.html
  const STORAGE_KEY = "hubProtectedAccess_v3";
  const LOGIN_KEY = "hubLoginUntil_v3";
  const DEFAULT_HUB_URL = "https://petervfd.github.io/haupt/";

  function now() {
    return Date.now();
  }

  function getLoginUntil() {
    return parseInt(localStorage.getItem(LOGIN_KEY) || "0", 10);
  }

  function isMainLoginValid() {
    return getLoginUntil() > now();
  }

  function getRepoName() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "";
    return parts[0].toLowerCase();
  }

  function normalizeRepoToPageId(repo) {
    const map = {
      "briefe": "briefe",
      "tarif": "tarif",
      "kosten": "kosten",
      "gehalt": "gehalt",
      "schicht": "schicht",
      "pflicht": "pflicht",
      "ta_su": "ta_su"
    };
    return map[repo] || repo;
  }

  function loadAccessData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveAccessData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function cleanupExpired(data) {
    const current = now();
    for (const key in data) {
      if (!data[key] || data[key] < current) {
        delete data[key];
      }
    }
    return data;
  }

  function grantAccessFromUrl(expectedPageId) {
    const params = new URLSearchParams(window.location.search);
    const access = params.get("access");
    const page = params.get("page");

    if (access === ACCESS_KEY && page === expectedPageId && isMainLoginValid()) {
      let data = loadAccessData();
      data = cleanupExpired(data);
      data[expectedPageId] = now() + SESSION_MINUTES * 60 * 1000;
      saveAccessData(data);

      // URL bereinigen
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }

  function isAllowed(expectedPageId) {
    if (!isMainLoginValid()) {
      return false;
    }

    let data = loadAccessData();
    data = cleanupExpired(data);
    saveAccessData(data);

    return !!data[expectedPageId] && data[expectedPageId] > now();
  }

  function blockPage(message) {
    const hubUrl = window.PROTECTED_HUB_URL || DEFAULT_HUB_URL;

    document.body.innerHTML = `
      <div style="
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f4f6f8;
        font-family: Arial, sans-serif;
        padding: 20px;
        box-sizing: border-box;
      ">
        <div style="
          background: white;
          max-width: 520px;
          width: 100%;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          padding: 28px;
          text-align: center;
        ">
          <h2 style="margin-top: 0; color: #1f2937;">Zugriff verweigert</h2>
          <p style="color: #6b7280; line-height: 1.5; margin-bottom: 24px;">
            ${message}
          </p>
          <a href="${hubUrl}" style="
            display: inline-block;
            background: #0066cc;
            color: white;
            text-decoration: none;
            padding: 12px 18px;
            border-radius: 8px;
            font-weight: bold;
          ">Zur Hauptseite</a>
        </div>
      </div>
    `;
    document.body.style.display = "";
  }

  function allowPage() {
    document.body.style.display = "";
  }

  function init() {
    try {
      const repoName = getRepoName();
      const expectedPageId = normalizeRepoToPageId(repoName);

      if (!expectedPageId) {
        blockPage("Seitenkennung konnte nicht ermittelt werden.");
        return;
      }

      grantAccessFromUrl(expectedPageId);

      if (isAllowed(expectedPageId)) {
        allowPage();
      } else {
        blockPage("Diese Seite darf nur über die Hauptseite mit Kennwort geöffnet werden oder die Freigabe ist abgelaufen.");
      }
    } catch (err) {
      document.body.innerHTML = `
        <div style="padding:20px;font-family:Arial,sans-serif;">
          <h2>Fehler beim Seitenschutz</h2>
          <pre style="white-space:pre-wrap;">${String(err)}</pre>
        </div>
      `;
      document.body.style.display = "";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
