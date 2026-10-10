"use strict";

const FUNCTION_URL = new URL(
  "https://svzxcffujedwylakbbla.supabase.co/functions/v1/share-photo",
);
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const elements = {
  download: document.querySelector("#download"),
  loading: document.querySelector("#loading"),
  photo: document.querySelector("#photo"),
  share: document.querySelector("#share"),
  status: document.querySelector("#status"),
};

function showUnavailable() {
  elements.loading.textContent = "Esta foto não está mais disponível.";
  elements.status.textContent = "O link pode ter expirado ou sido desativado. Peça um novo QR Code na cabine.";
}

function mediaUrl(token, action) {
  const url = new URL(FUNCTION_URL);
  url.searchParams.set("token", token);
  url.searchParams.set("action", action);
  return url.toString();
}

function setImage(previewUrl) {
  elements.photo.src = previewUrl;
  elements.photo.addEventListener("load", () => {
    elements.loading.hidden = true;
    elements.photo.hidden = false;
  }, { once: true });
  elements.photo.addEventListener("error", showUnavailable, { once: true });
}

async function shareFile(previewUrl) {
  const response = await fetch(previewUrl, { cache: "no-store", credentials: "omit" });
  if (!response.ok) throw new Error("preview_unavailable");
  const blob = await response.blob();
  return new File([blob], "foto-evento.jpg", { type: "image/jpeg" });
}

async function configureSharing(previewUrl, pageUrl) {
  if (!navigator.share) return;
  elements.share.hidden = false;
  elements.status.textContent = "Preparando o compartilhamento…";

  try {
    const file = await shareFile(previewUrl);
    if (navigator.canShare?.({ files: [file] })) {
      elements.share.disabled = false;
      elements.status.textContent = "";
      elements.share.addEventListener("click", async () => {
        try {
          await navigator.share({ files: [file], title: "Minha foto" });
        } catch (error) {
          if (error?.name !== "AbortError") {
            elements.status.textContent = "Não foi possível compartilhar a foto. Use Baixar foto.";
          }
        }
      });
      return;
    }

    elements.share.disabled = false;
    elements.status.textContent = "Seu navegador compartilhará o link da foto.";
    elements.share.addEventListener("click", () => navigator.share({ title: "Minha foto", url: pageUrl }));
  } catch {
    elements.share.hidden = true;
    elements.status.textContent = "Não foi possível preparar o compartilhamento. Use Baixar foto.";
  }
}

const token = new URL(window.location.href).searchParams.get("token")?.trim() ?? "";
if (!TOKEN_PATTERN.test(token)) {
  showUnavailable();
} else {
  const previewUrl = mediaUrl(token, "preview");
  const downloadUrl = mediaUrl(token, "download");
  const safePageUrl = new URL(window.location.href);
  safePageUrl.search = "";
  safePageUrl.searchParams.set("token", token);

  elements.download.href = downloadUrl;
  elements.download.hidden = false;
  setImage(previewUrl);
  void configureSharing(previewUrl, safePageUrl.toString());

  // Keep the token out of the address bar and out of future copied referrers.
  window.history.replaceState({}, document.title, window.location.pathname);
}
