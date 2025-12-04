# 🧩 Universal Web Dashboard (Chrome Extension)

Turn any part of any website into a widget on your dashboard. 
一个可以将**任意网页的局部区域**剪切并聚合到同一个仪表盘的 Chrome 插件。

## 🚀 Installation

This extension is currently in **Developer Mode**.

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Toggle **Developer mode** on (top right).
4. Click **Load unpacked** (top left).
5. Select the folder containing this project.

## 📖 Usage

1. Add Widgets: Open any page, click extension icon, select "Start Selection".
2. Edit Mode: Click "Edit Layout" to enable moving and resizing.
3. Move: Drag the widget header.
4. Resize: Drag the bottom-right corner (snaps to 10px).
5. Zoom: Use + / - buttons on the widget.
6. Undo: Press Ctrl + Z (or Cmd + Z) to undo actions (max 5 steps).
7. ring to Front: Click any widget to bring it to the top.
8. Delete: Click the × button on the widget header.
9. Invert: Click the ◑ button to toggle dark mode for a widget.

## ⚠️ Disclaimer

This extension modifies network headers (`X-Frame-Options`, `CSP`) to allow embedding functionality. It is intended for **personal productivity use only**. Please be aware of the security implications when browsing untrusted sites while this extension is active.

## 📄 License

MIT License
