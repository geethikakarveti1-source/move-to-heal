# 🏃‍♂️ REHAB AI — MOVE TO HEAL
### *Intelligent At-Home Physical Rehabilitation & Remote Clinician Monitoring Platform*

[![Platform](https://img.shields.io/badge/Platform-Web-blue.svg)](https://github.com)
[![Computer Vision](https://img.shields.io/badge/Vision-Google%20MediaPipe%20Pose-orange.svg)](https://developers.google.com/mediapipe)
[![Charts](https://img.shields.io/badge/Analytics-Chart.js-coral.svg)](https://www.chartjs.org/)
[![Storage](https://img.shields.io/badge/Storage-LocalStorage%20%7C%20Firebase%20Firestore-yellow.svg)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📖 Overview

**Rehab AI (MOVE TO HEAL)** is an advanced at-home physical therapy monitoring and exercise prescription engine. Powered by real-time computer vision pose estimation, biomechanical kinematic calculations, and an LSTM-inspired movement classifier, Rehab AI bridges the gap between clinical oversight and home rehabilitation.

Patients receive real-time skeletal wireframe tracking, instant corrective auditory/visual feedback, rep counting, and injury guardrail alerts directly in their web browser. Concurrently, clinicians can monitor adherence trends, review recorded workout sessions, diagnose biomechanical struggles (e.g., knee valgus, shoulder impingement), prescribe personalized exercise regimens, and issue proactive clinical reminders.

---

## 🌟 Key Features

### 👤 Patient Experience
- **Interactive Recovery Dashboard:** Displays active compliance rings, clinical reminders from therapists, daily prescribed routines, and comprehensive historical logs.
- **Real-Time Skeleton Tracking:** High-frequency 33-point skeletal landmark detection via **Google MediaPipe Pose** rendered over a live video canvas.
- **Audio Coach (Speech Synthesis):** Voice-guided rep counts, tempo pacing, and spoken postural corrections (e.g., *"Keep your knees aligned with your toes"*, *"Slow down, control the weights"*).
- **Dual Tracking Modes:**
  - **Webcam Mode:** Live camera tracking with pose overlay and session recording.
  - **Motion Simulation Mode:** Built-in kinematic animation engine allowing full testing and demonstration without a camera or physical movement.
- **Educational Movement Library:** High-definition animated SVG vector demonstrations illustrating joint trajectory, target muscle groups, step-by-step instructions, and critical safety guardrails.

### 🩺 Clinician / Doctor Portal
- **Patient Roster & Risk Triage:** Centralized dashboard ranking patients by rehabilitation compliance, average form accuracy, and critical risk flags (*Knee Valgus*, *Incomplete ROM*, *Eccentric Swings*).
- **Biomechanical Analytics:** Interactive timeline charts (**Chart.js**) plotting historical session scores, repetition consistency, and longitudinal recovery progress.
- **Prescription Builder:** Clinicians can customize exercise regimens specifying target repetitions, sets, and frequency (Daily, Alternate Days, 3x/week).
- **Direct Tele-Rehab Communication:** Instant push alerts and clinical reminders directly surfaced on the patient's dashboard.
- **Session Video Playback:** Review stored recordings of patient workouts to evaluate biomechanical mechanics asynchronously.

---

## 🏋️ Supported Exercises & Biomechanical Guardrails

Rehab AI evaluates form using mathematical vectors and joint angle calculations (e.g., Law of Cosines across shoulder-elbow-wrist, hip-knee-ankle):

| Exercise | Primary Joint Angle | Biomechanical Guardrails & Safety Checks |
| :--- | :--- | :--- |
| **Squats** | Knee Flexion (`155°` down to `<95°`) | **Knee Valgus Alert:** Flags medial collapse of knees relative to hips/ankles to prevent ACL strain. Tracks depth (parallel thigh). |
| **Bicep Curls** | Elbow Flexion (`150°` down to `<45°`) | **Tempo & Momentum Check:** Flags rapid velocity swings (`Δ > 12°/frame`) and incomplete lower extensions. |
| **Shoulder Press** | Elbow Flexion & Shoulder Overhead Press | **Shoulder Impingement / Lockout:** Validates symmetric vertical press and overhead lockouts while ensuring upright spine. |
| **Forward Lunges** | Lead Knee Flexion & Torso Angle | **Torso Lean Alert:** Validates torso uprightness (`Torso Angle > 145°`) and stable knee descent without passing toes. |
| **Lateral Raises** | Shoulder Abduction (`25°` up to `90°`) | **Impingement Guardrail:** Flags abduction past shoulder line (`> 100°`) and suppresses momentum swinging. |
| **Wall Sits** | Isometric Knee Hold (`~90°`) | **Endurance & Alignment:** Ensures stationary 90-degree angle stability and neutral back posture. |

---

## 🛠️ Technology Stack

- **Frontend Core:** Vanilla Modern JavaScript (ES6+ Object-Oriented Architecture), Semantic HTML5.
- **Design System:** Custom CSS3 with Dark Glassmorphism, CSS Custom Properties (Variables), Responsive Grid/Flexbox layouts, and CSS keyframe animations.
- **Computer Vision & AI:**
  - [Google MediaPipe Pose](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker): 33 3D skeletal landmark detection.
  - MediaPipe Camera Utils: Continuous video feed processing.
  - Web Speech API (`window.speechSynthesis`): Real-time voice coaching.
- **Visual Analytics:** [Chart.js](https://www.chartjs.org/) for clinician trend forecasting; HTML5 Canvas for real-time skeletal rendering.
- **Data & Synchronization:**
  - **Local Mode (Default):** Browser `localStorage` with reactive updates across tabs and zero setup required.
  - **Cloud Mode:** [Google Firebase Firestore](https://firebase.google.com/docs/firestore) & Firebase Storage for real-time multi-device clinician-patient synchronization.

---

## 📂 Project Directory Structure

```text
MOVE TO HEAL/
│
├── index.html        # Unified Single-Page Application (Login, Patient Portal, Clinician Dashboard, Modals)
├── app.js            # Core RehabApp Engine (Pose tracking, angle calculations, rep state-machines, sync)
├── styles.css        # Glassmorphic Dark-Mode UI Theme, Design Tokens, Animations & Component Styling
└── README.md         # Comprehensive Project Documentation
```

---

## 🚀 Getting Started

No `npm install` or complex build pipelines are required! Rehab AI runs purely in modern web browsers using lightweight CDN dependencies.

### Option 1: Run with Python Local Server (Recommended)
Because modern browser security policies require a secure origin (HTTPS or `localhost`) to access webcams and MediaPipe workers, run a local web server:

```bash
# In the project directory:
python -m http.server 8000
```
Then open your browser and navigate to:
```text
http://localhost:8000
```

### Option 2: Run with Node.js (`npx serve`)
```bash
npx serve .
```


### Option 3: VS Code Live Server

1. Open the project folder in **Visual Studio Code**.
2. Install the **Live Server** extension if it is not already installed.
3. Open `index.html` in the editor.
4. Right-click inside the editor and select **"Open with Live Server"**.
5. The application will open in your default browser.

## 🔑 Authentication & Test Profiles

Rehab AI includes built-in authentication support for both Local Simulation and Cloud Firebase modes.

### 🧪 Quick Demo (Local Simulator Mode)
In **Local Simulation Mode**, you can sign in using pre-configured mock profiles or enter any email/password:

#### Patient Profiles
| Role | Email | Password | Pre-configured Condition |
| :--- | :--- | :--- | :--- |
| **Patient** | `jane@rehabai.com` | *(Any)* | ACL Reconstruction Post-op (Struggles: Knee Valgus) |
| **Patient** | `john@rehabai.com` | *(Any)* | Rotator Cuff Tendonitis (Struggles: Incomplete ROM) |
| **New Patient** | `any_email@example.com` | *(Any)* | Auto-provisions a fresh patient profile with starting routines |

#### Clinician / Doctor Profile
| Role | Email | Password | Access |
| :--- | :--- | :--- | :--- |
| **Clinician** | `doctor@rehabai.com` | *(Any)* | Accesses full clinician portal, patient roster, analytics & prescriber |

> **Tip:** You can switch between Patient and Clinician modes dynamically at any time using the toggle in the top header navigation.

---

## ☁️ Cloud Database Configuration (Firebase)

To enable live remote synchronization between a physical doctor's device and a remote patient's device:

1. Click the **Local Simulator Mode** badge in the top navigation bar to open **Cloud Settings**.
2. Select **Firebase Integration**.
3. Supply your Firebase Project configuration keys:
   - `API Key`
   - `Auth Domain`
   - `Project ID`
   - `Storage Bucket`
   - `Messaging Sender ID`
   - `App ID`
4. Click **Initialize and Save Connection**. 
5. Patient logs, prescriptions, and alerts will now synchronize across different devices in real time via Cloud Firestore.

---

## 📱 Hardware & Browser Requirements

- **Browser:** Google Chrome (recommended for WebGL & MediaPipe acceleration), Microsoft Edge, or Mozilla Firefox.
- **Hardware:**
  - Built-in or external webcam (minimum 720p @ 30 FPS recommended for live tracking).
  - Speaker/audio output enabled for the audio cue coach.
- **Permissions:** Allow **Camera** access when prompted by the browser upon switching to Webcam Mode.

---

## ⚕️ Clinical Disclaimer

*Rehab AI is an assistive technology platform intended to supplement physical rehabilitation programs under professional medical guidance. It is not an automated diagnostic device. Patients should follow the specific range-of-motion limits and guidance established by their licensed physical therapist or orthopedic physician.*

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

