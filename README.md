# 🚗 Aroundus: Adventure World

**Aroundus** is a cute, fully interactive 3D driving adventure game built for the web. Explore a procedurally generated low-poly world, collect coins, and upgrade your car! 

It is designed as a **Progressive Web App (PWA) style mobile web experience**, meaning it dynamically expands to fill any screen—from desktop monitors to the latest smartphones—providing a native, full-screen gaming experience right in your browser.

![Aroundus Game Screenshot](media__1779615518121.png) *(Note: Add a screenshot of the game here if you'd like!)*

## 🎮 Play the Game
Play the live version here: **[https://anandhanachu.github.io/aroundus/](https://anandhanachu.github.io/aroundus/)**

## ✨ Features
- **Responsive Mobile-First Design**: Adapts beautifully to mobile devices, automatically accounting for safe-area insets (like the iPhone dynamic island).
- **Infinite Low-Poly World**: Drive around a seamlessly wrapping world filled with trees, rocks, and rolling hills.
- **Dynamic Physics & Collisions**: Realistic vector-based collision detection prevents you from getting stuck in trees and rocks.
- **Car Upgrades**: Collect coins to level up your car, improving your top speed and handling.
- **Dual Control Schemes**:
  - *Mobile / Touch:* Drag anywhere on the right side of the screen to activate the virtual joystick.
  - *Desktop:* Use standard `W, A, S, D` or the `Arrow Keys` to drive.
  - *Camera:* Pinch-to-zoom and swipe the top of the screen to orbit the camera.
- **Integrated Audio Engine**: Dynamic engine sounds and background music.

## 🛠️ Technologies Used
- **Three.js** (WebGL 3D Rendering)
- **Vanilla JavaScript** (ES6+)
- **HTML5 & CSS3** (Responsive full-screen layout)
- **FontAwesome** (UI Icons)
- **Google Fonts** (Fredoka & Outfit for typography)

## 🚀 How to Run Locally
Because this game uses entirely client-side web technologies, you don't need a heavy backend server to run it. 

1. Clone the repository:
   ```bash
   git clone https://github.com/Anandhanachu/aroundus.git
   ```
2. Navigate into the folder:
   ```bash
   cd aroundus
   ```
3. Start a local HTTP server. For example, using Python:
   ```bash
   python -m http.server 3000
   ```
4. Open your browser and go to `http://localhost:3000`

## 🤝 Contributing
Feel free to fork this project, submit pull requests, or send suggestions to make the game even better!

---
*Created by [Anandhanachu](https://github.com/Anandhanachu)*
