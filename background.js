/**
 * OmniToolkit - Background Service Worker (Manifest V3)
 * Handles lifecycle, keyboard shortcuts, context menus, and browsing data management.
 */

const DEFAULT_SETTINGS = {
  darkMode: false,
  dimVal: 0,
  warmVal: 0,
  speedVal: 1.0,
  speedMin: 0.25,
  speedMax: 5.0,
  speedStep: 0.25,
  readerMode: false,
  siteNotes: {},
  notes: [],
  // Feature Visibility Toggles
  showDarkMode: true,
  showBrightness: true,
  showWarmFilter: true,
  showPlayback: true,
  showMediaTools: true,
  showSaveImageAsPdf: true,
  showClearCache: true,
  showChangeTitle: true,
  showSession: true,
  showQuickNote: true,
  popupTheme: 'system'
};

// Initialize settings on install
chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.local.get(null, (existing) => {
    const toSet = {};
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (existing[key] === undefined) {
        toSet[key] = value;
      }
    }
    if (Object.keys(toSet).length > 0) {
      chrome.storage.local.set(toSet);
    }
  });

  // Setup Context Menus
  setupContextMenus();
});

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "omni-toggle-dark",
      title: "Toggle Dark Mode",
      contexts: ["page"]
    });

    chrome.contextMenus.create({
      id: "omni-toggle-pip",
      title: "Video Picture-in-Picture (PiP)",
      contexts: ["page", "video"]
    });

    chrome.contextMenus.create({
      id: "omni-save-selection-note",
      title: "Save Selection to OmniNotes",
      contexts: ["selection"]
    });

    chrome.contextMenus.create({
      id: "omni-extract-images",
      title: "Extract All Images from Page",
      contexts: ["page"]
    });
  });
}

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || tab.url?.startsWith("chrome://") || tab.url?.startsWith("chrome-extension://")) {
    return;
  }

  if (info.menuItemId === "omni-toggle-dark") {
    chrome.tabs.sendMessage(tab.id, { action: "toggleDark" }).catch(() => {});
  } else if (info.menuItemId === "omni-toggle-pip") {
    chrome.tabs.sendMessage(tab.id, { action: "togglePip" }).catch(() => {});
  } else if (info.menuItemId === "omni-extract-images") {
    chrome.tabs.sendMessage(tab.id, { action: "openImageCollector" }).catch(() => {});
  } else if (info.menuItemId === "omni-save-selection-note" && info.selectionText) {
    saveSelectionAsNote(info.selectionText, tab.url);
  }
});

// Save selected text to site-specific or global notes
function saveSelectionAsNote(text, url) {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    chrome.storage.local.get({ siteNotes: {}, notes: [] }, (data) => {
      const siteNotes = data.siteNotes || {};
      const existing = siteNotes[domain] ? siteNotes[domain] + "\n\n" : "";
      siteNotes[domain] = existing + `> "${text.trim()}"`;
      chrome.storage.local.set({ siteNotes });
    });
  } catch (err) {
    console.error("Failed to parse URL for note:", err);
  }
}

// Handle Keyboard Shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || tab.url?.startsWith("chrome://")) return;

  if (command === "toggle-dark-mode") {
    chrome.tabs.sendMessage(tab.id, { action: "toggleDark" }).catch(() => {});
  } else if (command === "toggle-pip") {
    chrome.tabs.sendMessage(tab.id, { action: "togglePip" }).catch(() => {});
  } else if (command === "increase-speed") {
    chrome.tabs.sendMessage(tab.id, { action: "adjustSpeed", delta: 0.25 }).catch(() => {});
  } else if (command === "decrease-speed") {
    chrome.tabs.sendMessage(tab.id, { action: "adjustSpeed", delta: -0.25 }).catch(() => {});
  }
});

// Handle Messages from Popup or Content Scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "clearSiteData") {
    const origin = request.origin;
    if (!origin) {
      sendResponse({ success: false, message: "No origin specified" });
      return false;
    }

    try {
      chrome.browsingData.remove(
        { origins: [origin] },
        {
          cache: false,
          cookies: true,
          localStorage: true,
          serviceWorkers: true,
          indexedDB: true
        },
        () => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, message: chrome.runtime.lastError.message });
          } else {
            // Also attempt to clear cache via browsingData.removeCache if supported
            chrome.browsingData.removeCache({ since: 0 }, () => {
              sendResponse({ success: true, message: "Site cookies, storage, and cache cleared!" });
            });
          }
        }
      );
    } catch (e) {
      sendResponse({ success: false, message: e.message });
    }
    return true; // Keep message channel open for async response
  }

  if (request.action === "openOptions") {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return false;
  }
});
