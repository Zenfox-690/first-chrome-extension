/**
 * OmniToolkit Pro - Popup Controller
 * Manages UI interactions, live controls, messaging, and storage synchronization.
 */

document.addEventListener("DOMContentLoaded", async () => {
  // DOM Elements
  const activeDomainDisplay = document.getElementById("activeDomainDisplay");
  const openSettingsBtn = document.getElementById("openSettingsBtn");

  // Tabs
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  // Display Controls
  const darkModeToggle = document.getElementById("darkModeToggle");
  const dimSlider = document.getElementById("dimSlider");
  const dimValueBadge = document.getElementById("dimValueBadge");
  const warmSlider = document.getElementById("warmSlider");
  const warmValueBadge = document.getElementById("warmValueBadge");
  const toggleReaderBtn = document.getElementById("toggleReaderBtn");

  // Media Controls
  const speedSlider = document.getElementById("speedSlider");
  const speedValueBadge = document.getElementById("speedValueBadge");
  const speedChips = document.querySelectorAll(".chip-btn");
  const pipBtn = document.getElementById("pipBtn");
  const captureFrameBtn = document.getElementById("captureFrameBtn");

  // Tools Controls
  const exportPDFBtn = document.getElementById("exportPDFBtn");
  const changeTitleBtn = document.getElementById("changeTitleBtn");
  const clearCacheBtn = document.getElementById("clearCacheBtn");
  const saveSessionBtn = document.getElementById("saveSessionBtn");
  const loadSessionBtn = document.getElementById("loadSessionBtn");

  // Notes Controls
  const notesDomainName = document.getElementById("notesDomainName");
  const quickNoteTextarea = document.getElementById("quickNoteTextarea");
  const noteWordCount = document.getElementById("noteWordCount");
  const copyNoteBtn = document.getElementById("copyNoteBtn");
  const clearNoteBtn = document.getElementById("clearNoteBtn");

  // Footer Controls
  const resetBtn = document.getElementById("resetBtn");
  const toastContainer = document.getElementById("toastContainer");

  let activeTab = null;
  let currentDomain = "";

  // 1. Toast Notification Helper
  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }

  // 2. Debounce Utility
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // 3. Tab Switching
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;
      tabBtns.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      tabPanes.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      document.getElementById(targetTab)?.classList.add("active");
    });
  });

  // 4. Safe Active Tab Messaging
  async function sendMessageToActiveTab(message) {
    if (!activeTab?.id) return null;
    if (activeTab.url?.startsWith("chrome://") || activeTab.url?.startsWith("chrome-extension://")) {
      showToast("Features restricted on internal Chrome pages");
      return null;
    }

    try {
      return await chrome.tabs.sendMessage(activeTab.id, message);
    } catch (err) {
      // Content script may not be loaded yet; inject dynamically if possible
      try {
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ["content.js"]
        });
        return await chrome.tabs.sendMessage(activeTab.id, message);
      } catch (innerErr) {
        console.warn("Could not communicate with tab:", innerErr);
        return null;
      }
    }
  }

  // 5. Initialize Active Tab Info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTab = tab;

  if (activeTab && activeTab.url) {
    try {
      const urlObj = new URL(activeTab.url);
      if (urlObj.protocol.startsWith("http")) {
        currentDomain = urlObj.hostname.replace(/^www\./, "");
        activeDomainDisplay.textContent = `🌐 ${currentDomain}`;
        notesDomainName.textContent = currentDomain;
      } else {
        currentDomain = "system";
        activeDomainDisplay.textContent = "⚙️ System Page";
        notesDomainName.textContent = "System Page";
      }
    } catch (e) {
      activeDomainDisplay.textContent = "Unknown Tab";
    }
  }

  // 6. Sync UI with Chrome Storage & Live Tab State
  chrome.storage.local.get(
    {
      darkMode: false,
      dimVal: 0,
      warmVal: 0,
      speedVal: 1.0,
      speedMin: 0.25,
      speedMax: 4.0,
      showDarkMode: true,
      showBrightness: true,
      showWarmFilter: true,
      showPlayback: true,
      showSaveImageAsPdf: true,
      showClearCache: true,
      showChangeTitle: true,
      showSession: true,
      siteNotes: {}
    },
    (data) => {
      // Visibility toggles
      const setVisibility = (id, visible) => {
        const el = document.getElementById(id);
        if (el) el.style.display = visible ? "" : "none";
      };
      setVisibility("darkModeControl", data.showDarkMode);
      setVisibility("brightnessControl", data.showBrightness);
      setVisibility("warmFilterControl", data.showWarmFilter);
      setVisibility("speedControl", data.showPlayback);
      setVisibility("exportPDFBtn", data.showSaveImageAsPdf);
      setVisibility("clearCacheBtn", data.showClearCache);
      setVisibility("changeTitleBtn", data.showChangeTitle);

      // Display values
      darkModeToggle.checked = !!data.darkMode;

      dimSlider.value = data.dimVal;
      dimValueBadge.textContent = `${Math.round(data.dimVal * 100)}%`;

      warmSlider.value = data.warmVal;
      warmValueBadge.textContent = `${Math.round(data.warmVal * 100)}%`;

      // Speed limits & value
      speedSlider.min = data.speedMin;
      speedSlider.max = data.speedMax;
      speedSlider.value = data.speedVal;
      speedValueBadge.textContent = `${parseFloat(data.speedVal).toFixed(2)}x`;
      updateSpeedChips(data.speedVal);

      // Load Site Notes
      if (currentDomain && currentDomain !== "system") {
        const existingNote = data.siteNotes[currentDomain] || "";
        quickNoteTextarea.value = existingNote;
        updateWordCount(existingNote);
      }
    }
  );

  // 7. Event Listeners - Display Tab
  darkModeToggle.addEventListener("change", (e) => {
    const isDark = e.target.checked;
    chrome.storage.local.set({ darkMode: isDark });
    sendMessageToActiveTab({ action: "setDark", value: isDark });
  });

  dimSlider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    dimValueBadge.textContent = `${Math.round(val * 100)}%`;
    chrome.storage.local.set({ dimVal: val });
    sendMessageToActiveTab({ action: "setDim", value: val });
  });

  warmSlider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    warmValueBadge.textContent = `${Math.round(val * 100)}%`;
    chrome.storage.local.set({ warmVal: val });
    sendMessageToActiveTab({ action: "setWarm", value: val });
  });

  toggleReaderBtn.addEventListener("click", () => {
    sendMessageToActiveTab({ action: "toggleReader" });
  });

  // 8. Event Listeners - Media Tab
  function updateSpeedChips(speed) {
    const rounded = Math.round(parseFloat(speed) * 100) / 100;
    speedChips.forEach((chip) => {
      const chipSpeed = parseFloat(chip.dataset.speed);
      chip.classList.toggle("active", Math.abs(chipSpeed - rounded) < 0.05);
    });
  }

  speedSlider.addEventListener("input", (e) => {
    const speed = parseFloat(e.target.value);
    speedValueBadge.textContent = `${speed.toFixed(2)}x`;
    updateSpeedChips(speed);
    chrome.storage.local.set({ speedVal: speed });
    sendMessageToActiveTab({ action: "setSpeed", value: speed });
  });

  speedChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const speed = parseFloat(chip.dataset.speed);
      speedSlider.value = speed;
      speedValueBadge.textContent = `${speed.toFixed(2)}x`;
      updateSpeedChips(speed);
      chrome.storage.local.set({ speedVal: speed });
      sendMessageToActiveTab({ action: "setSpeed", value: speed });
    });
  });

  pipBtn.addEventListener("click", async () => {
    const res = await sendMessageToActiveTab({ action: "togglePip" });
    if (res && res.message) showToast(res.message);
  });

  captureFrameBtn.addEventListener("click", () => {
    sendMessageToActiveTab({ action: "captureFrame" });
  });

  // 9. Event Listeners - Tools Tab
  exportPDFBtn.addEventListener("click", () => {
    sendMessageToActiveTab({ action: "openImageCollector" });
  });

  changeTitleBtn.addEventListener("click", () => {
    const currentTitle = activeTab.title || "";
    const newTitle = prompt("Enter new title for this page tab:", currentTitle);
    if (newTitle && newTitle.trim()) {
      sendMessageToActiveTab({ action: "changeTitle", title: newTitle.trim() });
      showToast("Page title updated!");
    }
  });

  clearCacheBtn.addEventListener("click", async () => {
    if (!activeTab?.url || !activeTab.url.startsWith("http")) {
      showToast("Cannot clear data on this page");
      return;
    }

    const origin = new URL(activeTab.url).origin;
    if (confirm(`Clear cookies, cache and storage for:\n${origin}?`)) {
      chrome.runtime.sendMessage({ action: "clearSiteData", origin }, (response) => {
        if (response && response.success) {
          showToast("✨ Site data cleared successfully!");
        } else {
          showToast(`Error: ${response?.message || "Failed to clear"}`);
        }
      });
    }
  });

  saveSessionBtn.addEventListener("click", () => {
    chrome.storage.local.get(["darkMode", "dimVal", "warmVal", "speedVal"], (state) => {
      chrome.storage.local.set({ savedSnapshot: state }, () => {
        showToast("💾 Preset snapshot saved!");
      });
    });
  });

  loadSessionBtn.addEventListener("click", () => {
    chrome.storage.local.get("savedSnapshot", ({ savedSnapshot }) => {
      if (!savedSnapshot) {
        showToast("No saved snapshot found.");
        return;
      }

      darkModeToggle.checked = savedSnapshot.darkMode;
      dimSlider.value = savedSnapshot.dimVal;
      dimValueBadge.textContent = `${Math.round(savedSnapshot.dimVal * 100)}%`;
      warmSlider.value = savedSnapshot.warmVal;
      warmValueBadge.textContent = `${Math.round(savedSnapshot.warmVal * 100)}%`;
      speedSlider.value = savedSnapshot.speedVal;
      speedValueBadge.textContent = `${parseFloat(savedSnapshot.speedVal).toFixed(2)}x`;
      updateSpeedChips(savedSnapshot.speedVal);

      chrome.storage.local.set(savedSnapshot);
      sendMessageToActiveTab({ action: "setDark", value: savedSnapshot.darkMode });
      sendMessageToActiveTab({ action: "setDim", value: savedSnapshot.dimVal });
      sendMessageToActiveTab({ action: "setWarm", value: savedSnapshot.warmVal });
      sendMessageToActiveTab({ action: "setSpeed", value: savedSnapshot.speedVal });

      showToast("📂 Preset snapshot applied!");
    });
  });

  // 10. Notes Tab Management
  function updateWordCount(text) {
    const trimmed = text.trim();
    const count = trimmed ? trimmed.split(/\s+/).length : 0;
    noteWordCount.textContent = `${count} ${count === 1 ? "word" : "words"}`;
  }

  const debouncedSaveNote = debounce((text) => {
    if (!currentDomain || currentDomain === "system") return;
    chrome.storage.local.get({ siteNotes: {} }, ({ siteNotes }) => {
      siteNotes[currentDomain] = text;
      chrome.storage.local.set({ siteNotes });
    });
  }, 250);

  quickNoteTextarea.addEventListener("input", (e) => {
    updateWordCount(e.target.value);
    debouncedSaveNote(e.target.value);
  });

  copyNoteBtn.addEventListener("click", () => {
    const text = quickNoteTextarea.value;
    if (!text.trim()) {
      showToast("Note is empty");
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      showToast("📋 Note copied to clipboard!");
    });
  });

  clearNoteBtn.addEventListener("click", () => {
    if (!quickNoteTextarea.value.trim()) return;
    if (confirm(`Delete note for ${currentDomain}?`)) {
      quickNoteTextarea.value = "";
      updateWordCount("");
      debouncedSaveNote("");
      showToast("Note cleared");
    }
  });

  // 11. Footer Reset
  resetBtn.addEventListener("click", () => {
    darkModeToggle.checked = false;
    dimSlider.value = 0;
    dimValueBadge.textContent = "0%";
    warmSlider.value = 0;
    warmValueBadge.textContent = "0%";
    speedSlider.value = 1.0;
    speedValueBadge.textContent = "1.00x";
    updateSpeedChips(1.0);

    const resetState = {
      darkMode: false,
      dimVal: 0,
      warmVal: 0,
      speedVal: 1.0,
      readerMode: false
    };

    chrome.storage.local.set(resetState);
    sendMessageToActiveTab({ action: "setDark", value: false });
    sendMessageToActiveTab({ action: "setDim", value: 0 });
    sendMessageToActiveTab({ action: "setWarm", value: 0 });
    sendMessageToActiveTab({ action: "setSpeed", value: 1.0 });

    showToast("🔄 Active tab settings reset!");
  });

  // 12. Settings Navigation
  openSettingsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
