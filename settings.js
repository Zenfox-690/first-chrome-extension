/**
 * OmniToolkit Pro - Settings & Management Controller
 * Handles preferences persistence, site notes hub, scratchpads, backups, and live search.
 */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const speedMinInput = document.getElementById("speedMin");
  const speedMaxInput = document.getElementById("speedMax");

  const toggleDarkMode = document.getElementById("toggleDarkMode");
  const toggleBrightness = document.getElementById("toggleBrightness");
  const toggleWarmFilter = document.getElementById("toggleWarmFilter");
  const togglePlayback = document.getElementById("togglePlayback");
  const toggleSaveImageAsPdf = document.getElementById("toggleSaveImageAsPdf");
  const toggleClearCache = document.getElementById("toggleClearCache");
  const toggleChangeTitle = document.getElementById("toggleChangeTitle");

  const statSiteNotesCount = document.getElementById("statSiteNotesCount");
  const statGlobalNotesCount = document.getElementById("statGlobalNotesCount");
  const statSpeedRange = document.getElementById("statSpeedRange");

  const siteNotesSearch = document.getElementById("siteNotesSearch");
  const siteNotesContainer = document.getElementById("siteNotesContainer");
  const exportNotesMarkdownBtn = document.getElementById("exportNotesMarkdownBtn");
  const clearAllSiteNotesBtn = document.getElementById("clearAllSiteNotesBtn");

  const notesContainer = document.getElementById("notesContainer");
  const addNoteBtn = document.getElementById("addNoteBtn");
  const noteTemplate = document.getElementById("noteTemplate");

  const exportConfigBtn = document.getElementById("exportConfigBtn");
  const importConfigBtn = document.getElementById("importConfigBtn");
  const importConfigFile = document.getElementById("importConfigFile");
  const saveTopBtn = document.getElementById("saveTopBtn");
  const saveSettings = document.getElementById("saveSettings");
  const openImage = document.getElementById("openImage");
  const toastContainer = document.getElementById("toastContainer");

  let siteNotesCache = {};
  let globalNotesCache = [];

  // Toast Helper
  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }

  // Debounce Utility
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Calculate Word Count
  function getWordCount(str) {
    const trimmed = str.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  // Update Stats Cards
  function updateStats() {
    const siteKeys = Object.keys(siteNotesCache).filter(k => siteNotesCache[k].trim());
    statSiteNotesCount.textContent = siteKeys.length;
    statGlobalNotesCount.textContent = globalNotesCache.filter(n => n.trim()).length;
    const min = parseFloat(speedMinInput.value) || 0.25;
    const max = parseFloat(speedMaxInput.value) || 4.0;
    statSpeedRange.textContent = `${min}x - ${max}x`;
  }

  // 1. Load Initial Configuration
  chrome.storage.local.get(
    {
      speedMin: 0.25,
      speedMax: 4.0,
      showDarkMode: true,
      showBrightness: true,
      showWarmFilter: true,
      showPlayback: true,
      showSaveImageAsPdf: true,
      showClearCache: true,
      showChangeTitle: true,
      notes: [],
      siteNotes: {}
    },
    (data) => {
      speedMinInput.value = data.speedMin;
      speedMaxInput.value = data.speedMax;

      toggleDarkMode.checked = data.showDarkMode;
      toggleBrightness.checked = data.showBrightness;
      toggleWarmFilter.checked = data.showWarmFilter;
      togglePlayback.checked = data.showPlayback;
      toggleSaveImageAsPdf.checked = data.showSaveImageAsPdf;
      toggleClearCache.checked = data.showClearCache;
      toggleChangeTitle.checked = data.showChangeTitle;

      siteNotesCache = data.siteNotes || {};
      globalNotesCache = data.notes || [];

      renderSiteNotes(siteNotesCache);
      renderGlobalNotes(globalNotesCache);
      updateStats();
    }
  );

  // 2. Render Site Notes
  function renderSiteNotes(notesMap, filterQuery = "") {
    siteNotesContainer.innerHTML = "";
    const domains = Object.keys(notesMap).filter((domain) => {
      if (!notesMap[domain].trim()) return false;
      if (!filterQuery) return true;
      const q = filterQuery.toLowerCase();
      return domain.toLowerCase().includes(q) || notesMap[domain].toLowerCase().includes(q);
    });

    if (domains.length === 0) {
      const emptyNotice = document.createElement("div");
      emptyNotice.style.cssText = "color:#64748b; font-size:13px; text-align:center; padding:24px;";
      emptyNotice.textContent = filterQuery ? "No matching site notes found." : "No site notes saved yet. Add notes via the popup on any website!";
      siteNotesContainer.appendChild(emptyNotice);
      return;
    }

    domains.sort().forEach((domain) => {
      const card = document.createElement("div");
      card.className = "site-note-card";

      const header = document.createElement("div");
      header.className = "site-note-header";
      header.innerHTML = `
        <div class="site-note-domain">🌐 ${domain}</div>
        <button class="btn-icon-danger delete-site-btn" title="Delete note for ${domain}">✕</button>
      `;

      const textarea = document.createElement("textarea");
      textarea.className = "site-note-textarea";
      textarea.value = notesMap[domain];

      // Auto save on edit
      textarea.addEventListener(
        "input",
        debounce(() => {
          notesMap[domain] = textarea.value;
          chrome.storage.local.set({ siteNotes: notesMap });
          updateStats();
        }, 300)
      );

      // Delete note
      header.querySelector(".delete-site-btn").addEventListener("click", () => {
        if (confirm(`Delete saved note for "${domain}"?`)) {
          delete notesMap[domain];
          chrome.storage.local.set({ siteNotes: notesMap }, () => {
            renderSiteNotes(notesMap, siteNotesSearch.value);
            updateStats();
            showToast(`Note for ${domain} deleted`);
          });
        }
      });

      card.appendChild(header);
      card.appendChild(textarea);
      siteNotesContainer.appendChild(card);
    });
  }

  // Filter site notes
  siteNotesSearch.addEventListener("input", (e) => {
    renderSiteNotes(siteNotesCache, e.target.value.trim());
  });

  // Export Notes to Markdown
  exportNotesMarkdownBtn.addEventListener("click", () => {
    const domains = Object.keys(siteNotesCache).filter(d => siteNotesCache[d].trim());
    if (domains.length === 0) {
      showToast("No notes available to export");
      return;
    }

    let mdContent = `# OmniToolkit Pro - Exported Notes\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
    domains.sort().forEach((domain) => {
      mdContent += `## 🌐 ${domain}\n\n${siteNotesCache[domain].trim()}\n\n---\n\n`;
    });

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url,
      filename: `omnitoolkit-notes-${new Date().toISOString().slice(0, 10)}.md`,
      saveAs: true
    }, () => {
      URL.revokeObjectURL(url);
      showToast("Notes exported to Markdown!");
    });
  });

  // Delete All Site Notes
  clearAllSiteNotesBtn.addEventListener("click", () => {
    const count = Object.keys(siteNotesCache).length;
    if (count === 0) return;
    if (confirm(`Are you sure you want to delete all notes across all ${count} sites?`)) {
      siteNotesCache = {};
      chrome.storage.local.set({ siteNotes: {} }, () => {
        renderSiteNotes(siteNotesCache);
        updateStats();
        showToast("All site notes deleted");
      });
    }
  });

  // 3. Render Global Scratchpads
  function renderGlobalNotes(notesList) {
    notesContainer.innerHTML = "";
    if (notesList.length === 0) {
      addScratchpadCard("");
      return;
    }

    notesList.forEach((text) => addScratchpadCard(text));
  }

  function addScratchpadCard(initialText = "") {
    const clone = noteTemplate.content.cloneNode(true);
    const card = clone.querySelector(".scratchpad-card");
    const textarea = clone.querySelector("textarea");
    const countLabel = clone.querySelector(".scratchpad-count");
    const deleteBtn = clone.querySelector(".delete-note");

    textarea.value = initialText;
    countLabel.textContent = `${getWordCount(initialText)} words`;

    const saveAllNotes = debounce(() => {
      const notes = [];
      document.querySelectorAll(".scratchpad-card textarea").forEach((ta) => {
        if (ta.value.trim()) notes.push(ta.value);
      });
      globalNotesCache = notes;
      chrome.storage.local.set({ notes });
      updateStats();
    }, 300);

    textarea.addEventListener("input", () => {
      countLabel.textContent = `${getWordCount(textarea.value)} words`;
      saveAllNotes();
    });

    deleteBtn.addEventListener("click", () => {
      card.remove();
      saveAllNotes();
      showToast("Scratchpad deleted");
    });

    notesContainer.appendChild(clone);
  }

  addNoteBtn.addEventListener("click", () => {
    addScratchpadCard("");
    const textareas = document.querySelectorAll(".scratchpad-card textarea");
    textareas[textareas.length - 1]?.focus();
    updateStats();
  });

  // 4. Save Settings Handler
  function saveAllPreferences() {
    const min = parseFloat(speedMinInput.value);
    const max = parseFloat(speedMaxInput.value);

    if (isNaN(min) || isNaN(max) || min <= 0 || min >= max) {
      alert("Invalid speed limits: Ensure Minimum is greater than 0 and less than Maximum.");
      return;
    }

    const payload = {
      speedMin: min,
      speedMax: max,
      showDarkMode: toggleDarkMode.checked,
      showBrightness: toggleBrightness.checked,
      showWarmFilter: toggleWarmFilter.checked,
      showPlayback: togglePlayback.checked,
      showSaveImageAsPdf: toggleSaveImageAsPdf.checked,
      showClearCache: toggleClearCache.checked,
      showChangeTitle: toggleChangeTitle.checked
    };

    chrome.storage.local.set(payload, () => {
      updateStats();
      showToast("✨ All preferences saved successfully!");
    });
  }

  saveTopBtn.addEventListener("click", saveAllPreferences);
  saveSettings.addEventListener("click", saveAllPreferences);

  // 5. Backup & Restore
  exportConfigBtn.addEventListener("click", () => {
    chrome.storage.local.get(null, (allData) => {
      const json = JSON.stringify(allData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url,
        filename: `omnitoolkit-backup-${new Date().toISOString().slice(0, 10)}.json`,
        saveAs: true
      }, () => {
        URL.revokeObjectURL(url);
        showToast("Full backup exported!");
      });
    });
  });

  importConfigBtn.addEventListener("click", () => {
    importConfigFile.click();
  });

  importConfigFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (typeof parsed !== "object" || parsed === null) {
          throw new Error("Invalid format");
        }
        chrome.storage.local.set(parsed, () => {
          showToast("Backup restored successfully!");
          setTimeout(() => location.reload(), 600);
        });
      } catch (err) {
        alert("Failed to restore: Invalid JSON configuration file.");
      }
    };
    reader.readAsText(file);
  });

  // 6. Fullscreen Wallpaper Viewer
  openImage.addEventListener("click", () => {
    const imgUrl = chrome.runtime.getURL("fullscreen-image.png");
    chrome.tabs.create({ url: imgUrl });
  });
});
