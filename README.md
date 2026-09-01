# SmartShift
##  Smart Worksite Roster & Shift Manager

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Phase](https://img.shields.io/badge/Phase-1%20Landing%20Page-7c3aed?style=for-the-badge)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

---

##  Introduction

**SmartShift** is a modern, serverless workforce scheduling platform designed to replace manual spreadsheet-based rostering. Built on vanilla HTML5, CSS3, and JavaScript, it demonstrates responsive design, clean modular components, and polished micro-animations.

Inspired by industry-standard tools like **7shifts**, SmartShift empowers store managers and café teams to create conflict-free, automated work schedules with intelligent validation checks.

---

##  The Problem

Manual scheduling using spreadsheets and WhatsApp messages leads to:
- **Overtime Violations** — exceeding maximum contracted weekly hours
- **No central visibility** — managers cannot easily see who is free

---

##  Objectives

1. Provide a centralized platform for employee availability collection
2. Allow managers to create and manage weekly shift rosters
3. Automate conflict detection through a **3-point Smart Validation Engine**
4. Block invalid shift assignments before they are confirmed
5. Reduce reliance on error-prone manual scheduling methods

---

##  Key Features

| Feature | Description |
|---|---|
| Employee Availability | Staff submit preferred and unavailable weekly time slots |
| Smart Validation | Automated skill, availability, and overtime checks |
| Shift Management | Managers create and assign shifts with role requirements |
| Weekly Hours | Employees track upcoming shifts and total hours |

###  Smart Validation Engine (Core Innovation)

Three automatic pre-checks before any shift is confirmed:

1. **Skill Check** — Does the employee have the required role/certification?
2. **Availability Check** — Is the employee free during the shift?
3. **Overtime Check** — Will the employee exceed their weekly hour cap?

If any check fails → the assignment is **automatically blocked**.

> **Phase 1 Note:** These checks are visually demonstrated on the landing page. The actual backend validation will be implemented in Phase 2.

---

##  Phase 1 Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Page structure and semantic markup |
| CSS3 | Styling, dark theme, responsive layout |
| Vanilla JavaScript ES6+ | Frontend interactions and animations |

No external frameworks, libraries, or backends used in Phase 1.

---

## Future Technology Stack (Phase 2+)

| Technology | Purpose |
|---|---|
| React.js | Component-based frontend UI |
| Node.js | Server-side JavaScript runtime |
| Express.js | REST API backend framework |
| MongoDB | Database for users, shifts, and availability |
| JWT Authentication | Secure multi-role login (Employee / Manager) |
| Git / GitHub | Version control and team collaboration |

---

##  Project Structure

```
smart-roster-manager/
│
├── index.html       ← Landing page (Phase 1 implementation)
├── style.css        ← Dark-theme design system, responsive layout
├── script.js        ← Frontend JS interactions and animations
├── README.md        ← Project documentation
├── HOW_TO_RUN.txt   ← Quick evaluator guide
├── LICENSE          ← MIT License
├── .gitignore       ← Git ignore rules
│
└── assets/
    └── images/      ← For future phases
```

---

##  Team Members

| Member | Role | Contribution |
|---|---|---|
| [Member 1 Name] | Frontend Lead | HTML structure, semantic sections |
| [Member 2 Name] | UI & Styling | CSS dark theme, layout, responsiveness |
| [Member 3 Name] | Frontend Behaviour | JavaScript interactions and animations |
| [Member 4 Name] | Refinement & Docs | Landing page polish, README, testing |

> Replace placeholders with actual team member names before submission.

---

##  How to Run the Landing Page

**No installation or server required.**

1. Clone or download the repository:
   ```bash
   git clone https://github.com/your-username/smart-roster-manager.git
   ```
2. Open the project folder.
3. Double-click **`index.html`** — it opens directly in any browser.

---

##  Future Scope

- **React.js** frontend with Employee and Manager dashboards
- **Node.js + Express.js** REST API backend
- **MongoDB** for persistent storage of users, shifts, and availability
- **JWT Authentication** for secure multi-role login
- **Live backend validation** for all 3 smart checks
- **GitHub collaboration** across all team members in Phase 2

---

*Phase 1 — CIE-1 | BSc Computer Science | Full Stack Development Course*
