(() => {
  "use strict";
  let deferredPrompt = null;

  function makeInstallButton() {
    if (document.getElementById("pwaInstallBtn")) return;
    const b = document.createElement("button");
    b.id = "pwaInstallBtn";
    b.className = "pwa-install-button";
    b.innerHTML = "⬇ Install CapyLearn";
    b.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch {}
      deferredPrompt = null;
      b.classList.remove("show");
    });
    document.body.appendChild(b);
  }

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    makeInstallButton();
    document.getElementById("pwaInstallBtn")?.classList.add("show");
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    document.getElementById("pwaInstallBtn")?.classList.remove("show");
  });

  const okProtocol =
    location.protocol === "https:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  if ("serviceWorker" in navigator && okProtocol) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }
})();