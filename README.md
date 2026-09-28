# StudySync — Modern Student Productivity Dashboard 🚀

A modern, responsive, and client-side **Student Productivity OS** engineered with pure **HTML5, CSS3, and Vanilla JavaScript**.

Designed with a sleek **modern student / AI-tech aesthetic**, subtle glassmorphism, responsive navigation, and persistent state management using `localStorage` — completely free of any external backend or database dependencies.

---

## ✨ Key Features & Components

1. **Header & Contextual Greeting**
   - Dynamic greeting adapting to the time of day: *"Good Morning, Ishant 👋"* / Afternoon / Evening.
   - Live local date formatting and real-time updating schedule clock.
   - Smooth **Dark / Light mode toggle** with state persisted in `localStorage`.
   - Mini header timer indicator that stays synced with the Pomodoro session.

2. **Real-time Statistics Cards**
   - **Study Hours**: `4.5 hrs` (with an interactive `+30m Log` button).
   - **Tasks Completed**: Dynamic ratio `7/10` (automatically recalculates as tasks are checked/unchecked or added).
   - **Current Streak**: `5 days` with motivational high-score tracking.
   - **Active Projects**: `5 repos` (clickable card that opens the full portfolio modal).

3. **Daily Goal Card**
   - Visual progress bar showing `75%` target completion (`3.5 / 5.0 hours studied`).
   - Quick `+30m Log` button to record study sessions on the fly.

4. **Interactive Task Management (CRUD + LocalStorage)**
   - Pre-loaded with requested default tasks:
     - 🤖 **ML Linear Regression** (AI & ML, High Priority)
     - 🐍 **Python Practice** (Coding, Medium Priority)
     - 🐙 **GitHub Project** (Project, High Priority)
     - 🎓 **College Assignment** (College, Medium Priority)
   - Interactive custom checkboxes with smooth check animations, strikethrough, and opacity states.
   - Filter tabs: `All`, `Pending`, and `Done`.
   - Dual task creation: **Quick Add Bar** (inline) and **Full Modal Dialog** with priority, domain tag, and estimated duration.
   - Clear completed tasks button.
   - Deletion with smooth hover actions.
   - Full persistence across page reloads via `localStorage`.

5. **Learning Progress Indicators**
   - Multi-colored gradient progress bars:
     - **Python**: `80%` (Advanced OOP & Generators • 18h logged)
     - **Machine Learning**: `55%` (Cost Functions & Gradient Descent • 24h logged)
     - **Web Development**: `70%` (Modern DOM, Async JS & APIs • 32h logged)
     - **Git / GitHub**: `65%` (Rebasing, Branching & CI Workflows • 15h logged)

6. **Today's Schedule Timeline**
   - Connected timeline items:
     - `10:00 AM` — ML Lecture (*Done*)
     - `12:00 PM` — Coding Practice (*Active / Now with pulsing indicator*)
     - `3:00 PM` — College Work (*Upcoming*)
     - `6:00 PM` — Project Development (*Upcoming*)

7. **Quick Action Tiles**
   - ➕ **Add Task**: Opens modal dialog.
   - ⏱️ **Start Study Timer**: Scrolls to and activates the Pomodoro timer.
   - 📂 **View Projects**: Opens the interactive 5-project showcase modal.

8. **Pomodoro Study Timer**
   - 25-minute Pomodoro focus timer with **Start**, **Pause**, and **Reset** controls.
   - Mode presets: **Pomodoro (25m)**, **Short Break (5m)**, and **Long Break (15m)**.
   - Smooth animated circular SVG countdown ring.
   - Daily session completion dot tracker.
   - Built-in sound notification using the **Web Audio API** (synthesizes audio offline without any external MP3 files).
   - Automatically logs +25 minutes to your daily study goal upon timer completion!

9. **Projects Portfolio Modal**
   - Showcases Ishant's 5 active student projects:
     1. *Crop Pathology Vision Diagnostic* (PyTorch, Gemini Vision)
     2. *Linear Regression & Gradient Engine* (NumPy, Python)
     3. *StudySync Student Dashboard* (HTML5, CSS3, JS)
     4. *Campus Event & Resource Hub* (React, Supabase)
     5. *Algorithmic Code Snippet Vault* (C++, Python)

---

## 🚀 How to Run Locally

You can run this project with zero configuration:

### Option A: Double-Click (Direct Browser Opening)
Simply open [`index.html`](file:///c:/Users/my/OneDrive/Attachments/nnpc/index.html) directly in any modern browser (Chrome, Edge, Firefox, Safari).

### Option B: Local HTTP Server (Python)
```bash
python -m http.server 3000
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📁 File Structure

```
nnpc/
├── index.html       # Semantic HTML5 layout, cards, and accessible modals
├── style.css        # Modern design system (Dark/Light themes, animations)
├── app.js           # Vanilla JavaScript state, tasks CRUD, Pomodoro timer
└── README.md        # Documentation and feature guide
```
