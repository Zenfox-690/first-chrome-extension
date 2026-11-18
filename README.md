# OmniToolkit Pro 🚀
### The All-in-One Chromium Browser Companion & Productivity Suite

**OmniToolkit Pro** is a high-performance, Manifest V3-compliant Chromium extension designed for power users, developers, and night owls. It unifies screen controls, video accelerators, site scratchpads, image extraction tools, and privacy utilities into a unified, glassmorphic dashboard.

---

## ✨ Features Overview

### 🎨 Display & Eye Care
- **Smart Dark Mode**: Safe, CSS-inversion dark theme engine that preserves natural colors for images, videos, avatars, and icons without breaking modern web layouts.
- **Screen Dimmer**: Smooth brightness overlay slider (0% to 100%) for comfortable eye relief.
- **Warm Light / Blue-Light Filter**: Amber eye-care tint (0% to 100%) to reduce eye strain.
- **Distraction-Free Reader**: One-click typography focus mode for articles and long-form content.

### ⚡ Media & Video Acceleration
- **Granular Speed Controller**: Slide or tap quick preset chips (`0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`, `3.0x`) with live on-screen HUD badge.
- **Picture-in-Picture (PiP)**: Pop out any HTML5 video into a floating window with one click or keyboard shortcut.
- **Video Frame Screenshot**: Instant, native-resolution frame snapshot capture saved as PNG.
- **Zero-Lag Observer**: Throttled mutation detection ensures zero CPU bottlenecks on video-heavy platforms like YouTube, Twitch, or Netflix.

### 🛠️ Page Utilities & Tools
- **In-Page Image Collector & PDF Export**: Collects all high-resolution images from the active webpage into a preview modal, with 1-click batch download and print/save to PDF.
- **Page Title Customizer**: Rename distracting or crowded tab titles on the fly.
- **Site Data Cleaner**: Quick origin-targeted clearing of cache, cookies, and local storage.
- **Snapshot Presets**: Save and restore custom display & speed states across sessions.

### 📝 Site & Global Notes Hub
- **Domain-Specific Notes**: Automatically links notes and scratchpads to the active domain (e.g. `github.com`, `reddit.com`) with live word counting and clipboard copying.
- **Global Scratchpads**: Multi-card scratchpad board in the Settings page.
- **Markdown Export**: 1-click export of all site notes into a clean `.md` document.

### ⌨️ Default Keyboard Shortcuts
| Shortcut | Action |
| :--- | :--- |
| `Alt + Shift + D` | Toggle Smart Dark Mode |
| `Alt + Shift + P` | Toggle Video Picture-in-Picture (PiP) |
| `Alt + Shift + Right` | Increase Video Playback Speed (+0.25x) |
| `Alt + Shift + Left` | Decrease Video Playback Speed (-0.25x) |

*(Shortcuts can be customized anytime in `chrome://extensions/shortcuts`)*

---

## 📦 How to Load into Chrome (Step-by-Step)

1. Open **Google Chrome** (or any Chromium browser: Brave, Edge, Opera, Arc, Vivaldi).
2. In the address bar, navigate to:
   ```text
   chrome://extensions/
   ```
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. In the top-left corner, click **Load unpacked**.
5. Select this project folder:
   ```text
   C:\Users\User\Documents\projects\extension\first-chrome-extension
   ```
6. **OmniToolkit Pro** is now loaded! Click the puzzle icon (🧩) in the Chrome toolbar and pin **OmniToolkit Pro** for one-click access.

---

## 📁 Project Architecture

```text
first-chrome-extension/
├── manifest.json         # Manifest V3 configuration & permission schema
├── background.js         # Service worker: shortcuts, context menus, data clearing
├── content.js            # In-page engine: dark mode, overlays, video speed, HUD, PiP
├── popup.html            # Main extension popup interface
├── popup.js              # Popup interaction controller & tab messaging
├── style.css             # Glassmorphic dark UI stylesheet for popup
├── settings.html         # Full-page preferences & management dashboard
├── settings.js           # Settings controller, site notes manager, backup/restore
├── settings.css          # Modern dashboard stylesheet
├── fullscreen-image.png  # Bundled 1080p visual wallpaper asset
├── icon.png              # Source master icon (240x240)
├── icons/                # Multi-resolution pixel-perfect icons
│   ├── icon16.png        # Toolbar favicon (16x16)
│   ├── icon32.png        # Retina favicon (32x32)
│   ├── icon48.png        # Extension management icon (48x48)
│   └── icon128.png       # Chrome Web Store & installation icon (128x128)
└── README.md             # Documentation & guide
```

---

## 🔒 Security & Manifest V3 Compliance
- **Zero Remote Code Execution**: All scripts, styles, and assets are strictly packaged locally within the extension.
- **Minimal Permissions**: No unnecessary permissions (removed `identity`, restricted script targets).
- **Fast & Lightweight**: Debounced storage operations and memory-efficient DOM listeners.

