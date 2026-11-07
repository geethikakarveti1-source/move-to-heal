# MOVE TO HEAL — Rehab AI

### AI-Assisted At-Home Rehabilitation & Clinician Monitoring Platform

![Platform](https://img.shields.io/badge/Platform-Web-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)
![Computer Vision](https://img.shields.io/badge/Computer_Vision-MediaPipe-orange)
![Analytics](https://img.shields.io/badge/Analytics-Chart.js-pink)
![Database](https://img.shields.io/badge/Database-LocalStorage%20%7C%20Firestore-green)

**MOVE TO HEAL (Rehab AI)** is a web-based rehabilitation support platform designed to help patients follow prescribed exercises at home while enabling clinicians to review progress and manage rehabilitation routines.

The application combines pose tracking, exercise guidance, repetition tracking, feedback, patient progress dashboards, and clinician-side monitoring in one interface.

> **Note:** This project is a prototype/demo and is not a substitute for professional medical advice, diagnosis, or supervised rehabilitation.

---

## Contents

- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [Features](#-features)
- [Supported Exercises](#-supported-exercises)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Demo Login](#-demo-login)
- [Firebase Setup](#-firebase-setup)
- [Requirements](#-requirements)
- [Limitations](#-limitations)
- [Future Enhancements](#-future-enhancements)
- [Disclaimer](#-disclaimer)

## 🎯 Problem Statement

Patients may find it difficult to consistently perform rehabilitation exercises at home without continuous guidance. Clinicians also need a convenient way to monitor adherence, review exercise sessions, and update patient routines between visits.

## 💡 Our Solution

MOVE TO HEAL provides a browser-based platform with two experiences:

- **Patient Portal:** exercise guidance, workout tracking, feedback, reminders, and progress history.
- **Clinician Portal:** patient overview, progress analytics, exercise prescriptions, and reminders.

The system supports both webcam-based pose tracking and a simulation mode for demonstrations and testing.

## ✨ Features

### Patient Portal
- Recovery dashboard with routines, reminders, and workout history.
- Webcam-based pose tracking with a 33-landmark skeleton overlay using MediaPipe Pose.
- Simulation mode for trying the workflow without a webcam.
- Exercise demonstrations and step-by-step instructions.
- Repetition tracking and movement feedback.
- Optional spoken coaching using the browser Speech Synthesis API.
- Workout/session records and progress information.

### Clinician Portal
- Patient roster and patient progress overview.
- Compliance and exercise-performance summaries.
- Charts for reviewing progress over time using Chart.js.
- Exercise prescription builder with repetitions, sets, and frequency.
- Patient reminders and clinical messages.
- Session review features available in the prototype.

### Platform
- Local simulator mode using browser `localStorage`.
- Optional Firebase Firestore configuration for cloud data synchronization.
- Responsive interface with a dark glassmorphism-inspired design.

## 🏋️ Supported Exercises

| Exercise | Tracking / Feedback Focus |
|---|---|
| Squats | Knee flexion, movement depth, and knee alignment |
| Bicep Curls | Elbow flexion, repetition cycle, and movement tempo |
| Shoulder Press | Elbow movement and overhead press motion |
| Forward Lunges | Lead-knee movement and torso position |
| Lateral Raises | Shoulder abduction and movement range |
| Wall Sits | Knee-angle stability and hold position |

*Exercise thresholds and feedback are prototype logic. They should not be treated as clinically validated measurements.*

## 🛠️ Technology Stack

| Area | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3, Flexbox, CSS Grid, animations |
| Application logic | Vanilla JavaScript (ES6+) |
| Pose estimation | [MediaPipe Pose](https://developers.google.com/mediapipe) |
| Camera utilities | [MediaPipe Camera Utils](https://github.com/google/mediapipe) |
| Charts | [Chart.js](https://www.chartjs.org/) |
| Voice feedback | Web Speech API – Speech Synthesis |
| Local persistence | Browser `localStorage` |
| Cloud database option | [Firebase Firestore](https://firebase.google.com/docs/firestore) |
| External libraries | CDN scripts |

## 📁 Project Structure

```text
MOVE TO HEAL/
├── index.html    # Application layout, portals, forms, and modals
├── styles.css    # UI styling, responsive layouts, and animations
├── app.js        # Application logic, tracking, workouts, and data handling
└── README.md     # Project documentation
```

## 🚀 Getting Started

This project uses plain HTML, CSS, and JavaScript. No build step or package installation is required for the basic local demo.

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<your-repository>.git
```

### 2. Open the project folder

```bash
cd <your-repository>
```

### 3. Start a local server

Using Python:

```bash
python -m http.server 8000
```

### 4. Open the application

Visit:

```text
http://localhost:8000
```

You can also run the project using **VS Code Live Server**.

> Use `localhost` or HTTPS for webcam access. Browsers generally block camera access on insecure origins.

## 🔐 Demo Login

In **Local Simulator Mode**, the prototype supports demo profiles. Use the following email addresses and any password:

| Portal | Demo Email |
|---|---|
| Patient | `jane@rehabai.com` |
| Patient | `john@rehabai.com` |
| Clinician | `doctor@rehabai.com` |

You may also enter another email to test the new-patient flow in local mode.

## ☁️ Firebase Setup (Optional)

Firebase is optional. The application can run in Local Simulator Mode without cloud configuration.

To configure Firestore:

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Register a web app and copy its Firebase configuration.
3. Run MOVE TO HEAL locally.
4. Open the database/cloud settings from the application.
5. Select Firebase integration and enter the configuration values.
6. Initialize and save the connection.

**Important:** Configure Firebase security rules and access controls before using real or sensitive data. Never commit private credentials, service-account keys, or real patient information to GitHub.

## 💻 Requirements

- A modern browser: Chrome or Edge recommended.
- Internet connection to load CDN-hosted libraries.
- Webcam for live pose tracking (optional; simulation mode is available).
- Camera permission enabled for webcam mode.
- Speakers/headphones for spoken feedback (optional).

## ⚠️ Limitations

- Pose estimation and exercise feedback may vary with camera angle, lighting, distance, and occlusion.
- Simulation mode is intended for demonstration and testing.
- Movement thresholds and feedback are not clinically validated.
- Local mode data is stored in the browser and may not be available on another device or browser.
- Firebase synchronization requires a correctly configured Firebase project and security rules.
- This prototype should not be used to make medical decisions.

## 🔮 Future Enhancements

- Clinically validated exercise assessment and personalized feedback.
- Secure patient–clinician authentication and role-based access control.
- Improved cloud synchronization and offline-first data handling.
- More exercises and configurable rehabilitation programs.
- Accessibility improvements and additional language support.
- Secure, consent-based session recording and sharing.
- Expanded clinician analytics and progress reports.

## ⚕️ Disclaimer

MOVE TO HEAL is an educational/prototype rehabilitation support project. It does **not** diagnose conditions, prescribe treatment independently, or replace a licensed physiotherapist or physician. Patients should perform exercises only as recommended by their healthcare professional and stop if they experience pain, dizziness, or discomfort.

## 📄 License

Add a `LICENSE` file to this repository if you intend to distribute the project under a specific open-source license. Do not claim a license until the corresponding license text is included.
