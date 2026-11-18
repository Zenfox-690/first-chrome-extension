/**
 * OmniToolkit - Content Script Engine
 * High-performance smart dark mode, screen dimmer, blue-light filter,
 * video controller, PiP, image collector & focus reader.
 */

(() => {
  // Prevent double injection
  if (window.__omniToolkitInjected) return;
  window.__omniToolkitInjected = true;

  let currentSpeed = 1.0;
  let isDarkMode = false;
  let dimLevel = 0;
  let warmLevel = 0;
  let isReaderMode = false;
  let customTitle = null;

  // 1. Inject Stylesheets
  const styleEl = document.createElement("style");
  styleEl.id = "omni-core-styles";
  styleEl.textContent = `
    /* Smart Dark Mode */
    html.omni-smart-dark {
      filter: invert(0.92) hue-rotate(180deg) contrast(0.95) !important;
      background-color: #121212 !important;
    }
    html.omni-smart-dark img,
    html.omni-smart-dark video,
    html.omni-smart-dark canvas,
    html.omni-smart-dark svg,
    html.omni-smart-dark iframe,
    html.omni-smart-dark [style*="background-image"],
    html.omni-smart-dark .omni-no-invert {
      filter: invert(1) hue-rotate(180deg) !important;
    }

    /* Screen Dim Overlay */
    #omni-dim-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: #000000 !important;
      pointer-events: none !important;
      z-index: 2147483646 !important;
      transition: opacity 0.15s ease !important;
    }

    /* Warm Eye-Saver (Blue-Light Filter) Overlay */
    #omni-warm-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: #ff8c00 !important;
      mix-blend-mode: multiply !important;
      pointer-events: none !important;
      z-index: 2147483645 !important;
      transition: opacity 0.15s ease !important;
    }

    /* Video HUD Badge */
    .omni-video-hud {
      position: fixed;
      top: 24px;
      right: 24px;
      background: rgba(15, 23, 42, 0.88);
      color: #38bdf8;
      backdrop-filter: blur(8px);
      padding: 10px 18px;
      border-radius: 9999px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(56, 189, 248, 0.3);
      z-index: 2147483647;
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    }
    .omni-video-hud.show {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    /* Reader Mode */
    body.omni-reader-mode {
      max-width: 760px !important;
      margin: 40px auto !important;
      padding: 0 20px !important;
      line-height: 1.8 !important;
      font-size: 19px !important;
      font-family: Georgia, Cambria, "Times New Roman", Times, serif !important;
      background: #faf8f5 !important;
      color: #2b2b2b !important;
    }
  `;

  const targetHead = document.head || document.documentElement;
  if (targetHead) {
    targetHead.appendChild(styleEl);
  }

  // 2. Setup Overlays
  function ensureOverlays() {
    let dimOverlay = document.getElementById("omni-dim-overlay");
    if (!dimOverlay) {
      dimOverlay = document.createElement("div");
      dimOverlay.id = "omni-dim-overlay";
      dimOverlay.style.opacity = "0";
      (document.body || document.documentElement).appendChild(dimOverlay);
    }

    let warmOverlay = document.getElementById("omni-warm-overlay");
    if (!warmOverlay) {
      warmOverlay = document.createElement("div");
      warmOverlay.id = "omni-warm-overlay";
      warmOverlay.style.opacity = "0";
      (document.body || document.documentElement).appendChild(warmOverlay);
    }

    return { dimOverlay, warmOverlay };
  }

  // 3. Playback Speed Engine
  function applySpeed(speed) {
    currentSpeed = Math.max(0.1, Math.min(16, parseFloat(speed) || 1.0));
    const videos = document.querySelectorAll("video");
    videos.forEach((video) => {
      try {
        video.playbackRate = currentSpeed;
      } catch (e) {
        // Restricted video or DRM
      }
    });
  }

  // HUD Indicator
  let hudTimeout = null;
  function showHUD(message) {
    let hud = document.getElementById("omni-video-hud");
    if (!hud) {
      hud = document.createElement("div");
      hud.id = "omni-video-hud";
      hud.className = "omni-video-hud omni-no-invert";
      (document.body || document.documentElement).appendChild(hud);
    }

    hud.textContent = message;
    hud.classList.add("show");

    if (hudTimeout) clearTimeout(hudTimeout);
    hudTimeout = setTimeout(() => {
      hud.classList.remove("show");
    }, 1400);
  }

  // Throttled Observer for dynamic video elements
  let mutationTimer = null;
  const observer = new MutationObserver((mutations) => {
    if (mutationTimer) return;
    mutationTimer = setTimeout(() => {
      mutationTimer = null;
      if (currentSpeed !== 1.0) {
        applySpeed(currentSpeed);
      }
    }, 250);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // 4. Picture-in-Picture Support
  async function togglePictureInPicture() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        showHUD("PiP Exited");
        return { active: false };
      }

      const videos = Array.from(document.querySelectorAll("video")).filter(
        (v) => v.readyState > 0 && !v.paused
      );
      const targetVideo = videos[0] || document.querySelector("video");

      if (!targetVideo) {
        showHUD("No video found on page");
        return { success: false, message: "No video found" };
      }

      await targetVideo.requestPictureInPicture();
      showHUD("Picture-in-Picture Active");
      return { active: true };
    } catch (err) {
      console.warn("PiP Error:", err);
      showHUD("PiP not supported or blocked");
      return { success: false, error: err.message };
    }
  }

  // 5. Video Frame Capture
  function captureVideoFrame() {
    const video = document.querySelector("video");
    if (!video) {
      showHUD("No video found to capture");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || video.clientWidth || 1280;
      canvas.height = video.videoHeight || video.clientHeight || 720;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const timestamp = Math.floor(video.currentTime);
      const minutes = Math.floor(timestamp / 60);
      const seconds = timestamp % 60;
      const timeStr = `${minutes}m${seconds}s`;

      canvas.toBlob((blob) => {
        if (!blob) {
          showHUD("Capture failed");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `frame_${document.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${timeStr}.png`;
        (document.body || document.documentElement).appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showHUD("📸 Screenshot Captured!");
      }, "image/png");
    } catch (e) {
      console.warn("Frame capture error:", e);
      showHUD("Capture blocked (CORS)");
    }
  }

  // 6. In-Page Image Collector & Clean PDF / Print Exporter
  function extractPageImages() {
    const imageSet = new Set();
    const minSize = 40;

    // Standard <img> elements
    document.querySelectorAll("img").forEach((img) => {
      const src = img.currentSrc || img.src;
      if (src && !src.startsWith("data:image/svg") && img.naturalWidth >= minSize && img.naturalHeight >= minSize) {
        imageSet.add(src);
      }
    });

    // Background images
    document.querySelectorAll("*").forEach((el) => {
      const bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg.startsWith('url("http')) {
        const url = bg.slice(5, -2);
        imageSet.add(url);
      }
    });

    return Array.from(imageSet);
  }

  function openImageCollectorModal() {
    const images = extractPageImages();
    const existing = document.getElementById("omni-image-collector-modal");
    if (existing) existing.remove();

    if (images.length === 0) {
      showHUD("No major images found on page");
      return;
    }

    const modal = document.createElement("div");
    modal.id = "omni-image-collector-modal";
    modal.className = "omni-no-invert";
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    const card = document.createElement("div");
    card.style.cssText = `
      background: #ffffff;
      color: #0f172a;
      width: 90%;
      max-width: 960px;
      max-height: 85vh;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    `;

    // Header
    const header = document.createElement("div");
    header.style.cssText = `
      padding: 16px 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
    `;
    header.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:20px;">🖼️</span>
        <h2 style="margin:0; font-size:18px; font-weight:700; color:#0f172a;">Page Images (${images.length} found)</h2>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        <button id="omni-export-pdf-action" style="background:#4f46e5; color:#fff; border:none; padding:8px 14px; border-radius:8px; font-weight:600; cursor:pointer; font-size:13px; display:flex; align-items:center; gap:6px;">
          📄 Print / Save as PDF
        </button>
        <button id="omni-download-all-action" style="background:#0284c7; color:#fff; border:none; padding:8px 14px; border-radius:8px; font-weight:600; cursor:pointer; font-size:13px; display:flex; align-items:center; gap:6px;">
          ⬇️ Download All
        </button>
        <button id="omni-close-modal-btn" style="background:transparent; border:none; font-size:20px; color:#64748b; cursor:pointer; padding:4px 8px; border-radius:6px;">
          ✕
        </button>
      </div>
    `;

    // Grid Container
    const grid = document.createElement("div");
    grid.style.cssText = `
      padding: 20px;
      overflow-y: auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
      background: #f1f5f9;
      flex: 1;
    `;

    images.forEach((imgUrl, idx) => {
      const item = document.createElement("div");
      item.style.cssText = `
        background: #fff;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        display: flex;
        flex-direction: column;
        border: 1px solid #e2e8f0;
      `;
      item.innerHTML = `
        <div style="height:140px; background:#f8fafc; display:flex; align-items:center; justify-content:center; overflow:hidden;">
          <img src="${imgUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" loading="lazy">
        </div>
        <div style="padding:10px; display:flex; justify-content:space-between; align-items:center; background:#fff;">
          <span style="font-size:11px; color:#64748b;">#${idx + 1}</span>
          <a href="${imgUrl}" download="image_${idx + 1}" target="_blank" style="font-size:12px; color:#4f46e5; text-decoration:none; font-weight:600;">Save ⬇️</a>
        </div>
      `;
      grid.appendChild(item);
    });

    card.appendChild(header);
    card.appendChild(grid);
    modal.appendChild(card);
    (document.body || document.documentElement).appendChild(modal);

    // Close button
    modal.querySelector("#omni-close-modal-btn").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });

    // Download All
    modal.querySelector("#omni-download-all-action").addEventListener("click", () => {
      images.forEach((url, i) => {
        setTimeout(() => {
          const a = document.createElement("a");
          a.href = url;
          a.download = `extracted_image_${i + 1}`;
          a.target = "_blank";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }, i * 200);
      });
      showHUD(`Downloading ${images.length} images...`);
    });

    // Native PDF Export (Manifest V3 CSP compliant!)
    modal.querySelector("#omni-export-pdf-action").addEventListener("click", () => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        showHUD("Popup blocked. Please allow popups to export PDF.");
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${document.title} - Image Collection</title>
          <style>
            body { font-family: sans-serif; margin: 20px; text-align: center; background: #fff; }
            h1 { font-size: 20px; margin-bottom: 24px; color: #333; }
            .img-wrapper { margin-bottom: 30px; page-break-inside: avoid; }
            img { max-width: 90%; max-height: 80vh; object-fit: contain; border: 1px solid #ddd; border-radius: 8px; }
            @media print {
              .no-print { display: none; }
              body { margin: 0; }
              .img-wrapper { page-break-after: always; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom:20px;">
            <button onclick="window.print()" style="padding:10px 20px; font-size:16px; background:#4f46e5; color:#fff; border:none; border-radius:6px; cursor:pointer;">
              🖨️ Click Here to Print / Save as PDF
            </button>
          </div>
          <h1>Collected Images from: ${document.title}</h1>
          ${images.map((url, i) => `<div class="img-wrapper"><div><strong>#${i + 1}</strong></div><img src="${url}"></div>`).join("")}
          <script>
            setTimeout(() => { window.print(); }, 600);
          <\/script>
        </body>
        </html>
      `);
      printWindow.document.close();
    });
  }

  // 7. Load & Sync Initial State from Storage
  chrome.storage.local.get(
    {
      darkMode: false,
      dimVal: 0,
      warmVal: 0,
      speedVal: 1.0,
      readerMode: false
    },
    (settings) => {
      isDarkMode = settings.darkMode;
      dimLevel = settings.dimVal;
      warmLevel = settings.warmVal;
      currentSpeed = settings.speedVal;
      isReaderMode = settings.readerMode;

      if (isDarkMode) document.documentElement.classList.add("omni-smart-dark");
      if (isReaderMode) document.body?.classList.add("omni-reader-mode");

      const { dimOverlay, warmOverlay } = ensureOverlays();
      dimOverlay.style.opacity = dimLevel;
      warmOverlay.style.opacity = warmLevel;

      if (currentSpeed !== 1.0) {
        applySpeed(currentSpeed);
      }
    }
  );

  // 8. Message Listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const { dimOverlay, warmOverlay } = ensureOverlays();

    switch (request.action) {
      case "ping":
        sendResponse({ status: "alive", currentSpeed, isDarkMode, dimLevel, warmLevel });
        break;

      case "getStatus":
        sendResponse({
          currentSpeed,
          isDarkMode: document.documentElement.classList.contains("omni-smart-dark"),
          dimLevel,
          warmLevel,
          hasVideo: !!document.querySelector("video"),
          isPiPActive: !!document.pictureInPictureElement
        });
        break;

      case "setDark":
        isDarkMode = !!request.value;
        document.documentElement.classList.toggle("omni-smart-dark", isDarkMode);
        sendResponse({ success: true, isDarkMode });
        break;

      case "toggleDark":
        isDarkMode = !document.documentElement.classList.contains("omni-smart-dark");
        document.documentElement.classList.toggle("omni-smart-dark", isDarkMode);
        chrome.storage.local.set({ darkMode: isDarkMode });
        showHUD(isDarkMode ? "🌙 Dark Mode On" : "☀️ Light Mode On");
        sendResponse({ success: true, isDarkMode });
        break;

      case "setDim":
        dimLevel = parseFloat(request.value) || 0;
        dimOverlay.style.opacity = dimLevel;
        sendResponse({ success: true, dimLevel });
        break;

      case "setWarm":
        warmLevel = parseFloat(request.value) || 0;
        warmOverlay.style.opacity = warmLevel;
        sendResponse({ success: true, warmLevel });
        break;

      case "setSpeed":
        applySpeed(request.value);
        showHUD(`⚡ ${currentSpeed}x Speed`);
        sendResponse({ success: true, currentSpeed });
        break;

      case "adjustSpeed":
        const newSpeed = Math.round((currentSpeed + (request.delta || 0.25)) * 100) / 100;
        applySpeed(newSpeed);
        chrome.storage.local.set({ speedVal: currentSpeed });
        showHUD(`⚡ ${currentSpeed}x Speed`);
        sendResponse({ success: true, currentSpeed });
        break;

      case "togglePip":
        togglePictureInPicture().then((res) => sendResponse(res));
        return true; // async response

      case "captureFrame":
        captureVideoFrame();
        sendResponse({ success: true });
        break;

      case "openImageCollector":
      case "exportPdf":
        openImageCollectorModal();
        sendResponse({ success: true });
        break;

      case "toggleReader":
        isReaderMode = !document.body.classList.contains("omni-reader-mode");
        document.body.classList.toggle("omni-reader-mode", isReaderMode);
        chrome.storage.local.set({ readerMode: isReaderMode });
        showHUD(isReaderMode ? "📖 Reader Mode Enabled" : "Exit Reader Mode");
        sendResponse({ success: true, isReaderMode });
        break;

      case "changeTitle":
        if (request.title) {
          customTitle = request.title;
          document.title = customTitle;
          showHUD(`Page Title Renamed`);
          sendResponse({ success: true });
        }
        break;

      default:
        sendResponse({ success: false, message: "Unknown action" });
    }

    return true;
  });
})();
