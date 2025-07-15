const darkStyle=document.createElement("style");darkStyle.id="extDarkStyle",darkStyle.textContent=`
  html, body, div, section, article, header, footer, nav {
    background-color: #111 !important;
    color: #eee !important;
  }
  input, textarea, button, select {
    background-color: #222 !important;
    color: #eee !important;
    border-color: #555 !important;
  }
  a {
    color: #8ab4f8 !important;
  }
  img, video {
    filter: brightness(0.8) contrast(1.2) !important;
  }
`,document.head.appendChild(darkStyle);const overlay=document.createElement("div");overlay.id="extDimOverlay",overlay.style.cssText=`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  background: black;
  opacity: 0;
  z-index: 999998;
`,document.body.appendChild(overlay),chrome.storage.local.get({darkMode:!1,dimVal:0,speedVal:1},e=>{darkStyle.disabled=!e.darkMode,overlay.style.opacity=e.dimVal,applyPlaybackSpeed(e.speedVal)});const observer=new MutationObserver(()=>{chrome.storage.local.get("speedVal",({speedVal:e})=>{applyPlaybackSpeed(e)})});function applyPlaybackSpeed(e){document.querySelectorAll("video").forEach(t=>{try{t.playbackRate=e}catch{}})}function exportImagesToPDF(){let e=document.createElement("script");e.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.3.2/jspdf.min.js",e.onload=async()=>{let e=new jsPDF,t=Array.from(document.getElementsByTagName("img"));for(let a of t){if(!a.src.startsWith("blob:"))continue;let o=document.createElement("canvas"),l=o.getContext("2d");o.width=a.width,o.height=a.height,l.drawImage(a,0,0);let r=o.toDataURL("image/jpeg");e.addImage(r,"JPEG",10,10,180,160),e.addPage()}e.save("download.pdf")},document.body.appendChild(e)}observer.observe(document.body,{childList:!0,subtree:!0}),chrome.runtime.onMessage.addListener(e=>{switch(e.action){case"setDark":darkStyle.disabled=!e.value;break;case"setDim":overlay.style.opacity=e.value;break;case"setSpeed":applyPlaybackSpeed(parseFloat(e.value));break;case"exportPdf":exportImagesToPDF()}});