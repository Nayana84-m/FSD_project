<p align="center">
  <img src="https://readme-typing-svg.demolab.com/?font=Segoe+UI&weight=700&size=45&pause=1000&color=A78BFA&center=true&vCenter=true&width=700&height=70&lines=SmartShift" alt="SmartShift" />
</p>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com/?font=Segoe+UI&size=20&pause=1200&color=94A3B8&center=true&vCenter=true&width=600&lines=Smart+Worksite+Roster+%26+Shift+Manager" alt="tagline" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Phase-1-7c3aed?style=for-the-badge" />
</p>

<br>

## 📖 Introduction

**SmartShift** is a workforce scheduling platform built to replace manual, spreadsheet-based rostering. Store managers and café teams get conflict-free, automated weekly schedules — backed by a lightweight client-side validation engine that catches problems before a shift is ever confirmed.

Built entirely using **HTML5, CSS3, and JavaScript**, Phase 1 demonstrates responsive design, clean modular components, and polished micro-animations — no frameworks, no backend, yet.

<br>

## 🌫️ The Problem

Most small teams still schedule shifts using manual spreadsheets and WhatsApp messages — a process that quietly breaks down as the team grows.

| Manual method | What goes wrong |
|---|---|
| 📊 **Manual spreadsheets** | Hours are tracked by hand, so it's easy to miss when an employee has been assigned past their contracted weekly limit — leading to unnoticed **overtime violations**. |
| 💬 **WhatsApp messages** | Availability and shift swaps get buried in chat threads, leaving managers with **no central visibility** into who is actually free to work. |

SmartShift replaces both of these with a single, structured system — so scheduling decisions are based on real data, not scattered messages.

<br>

## 🧠 Smart Validation Engine

```mermaid
%%{init: {'theme':'base', 'themeVariables': {'primaryColor':'#7c3aed','primaryTextColor':'#fff','primaryBorderColor':'#a78bfa','lineColor':'#a78bfa','tertiaryColor':'#1a1233'}}}%%
flowchart LR
    S[New Shift] --> C1{Skill Check}
    C1 -- ✅ --> C2{Availability Check}
    C1 -- ❌ --> X[🚫 Blocked]
    C2 -- ✅ --> C3{Overtime Check}
    C2 -- ❌ --> X
    C3 -- ✅ --> OK[✅ Confirmed]
    C3 -- ❌ --> X
```

> **Phase 1:** these checks are visually demonstrated on the landing page. Live backend validation ships in Phase 2.

<br>

## ✨ Key Features

- 🗂️ **Employee Availability** — staff submit preferred/unavailable weekly slots
- ✅ **Smart Validation** — automated skill, availability, and overtime checks
- 📋 **Shift Management** — managers assign shifts against role requirements
- ⏱️ **Weekly Hours Tracker** — employees track upcoming shifts and totals

<br>

## 🛠️ Tech Stack

```mermaid
flowchart TB
    subgraph P1["Phase 1 — shipped"]
        H[HTML5] --- Csx[CSS3] --- J[Vanilla JS ES6+]
    end
    subgraph P2["Phase 2 — planned"]
        R[React.js] --- N[Node.js] --- E[Express.js] --- M[(MongoDB)] --- JWT[JWT Auth]
    end
    P1 --> P2
```

No external frameworks, libraries, or backends are used in Phase 1.

<br>

## ▶️ Getting Started

```bash
git clone https://github.com/Nayana84-m/FSD_project.git
```

Open `index.html` — it launches instantly in any browser.

<br>

## 📁 Project Architecture

```
FSD_project/
├── assets/
├── css/
├── js/
├── .gitignore
├── HOW_TO_RUN.txt
├── LICENSE
├── README.md
└── index.html
```

<br>

## 🔮 Future Scope

- React.js frontend with Employee and Manager dashboards
- Node.js + Express.js REST API backend
- MongoDB for persistent storage of users, shifts, and availability
- JWT Authentication for secure multi-role login
- Live backend validation for all 3 smart checks

<br>

<p align="center">
  <sub>Phase 1 · CIE-1 · BSc Computer Science · Full Stack Development Course</sub>
</p>
