
/* ==========================================================================
   Rehab AI Core Engine (MOVE TO HEAL)
   Pose Tracking, Biomechanical Mathematics, LSTM Simulation & Data Sync
   ========================================================================== */

class RehabApp {
  constructor() {
    this.currentRole = 'patient'; // 'patient' or 'doctor'
    this.currentPatientTab = 'patient-dashboard';
    
    // Authentication State
    this.isLoggedIn = false;
    this.loginRole = 'patient'; // 'patient' or 'doctor'
    this.loggedInUser = null; // Stores profile object of active user
    
    // Database and Sync Configuration
    this.dbType = 'local'; // 'local' or 'firebase'
    this.firebaseConfig = null;
    this.firestore = null;
    this.firebaseApp = null;
    
    // Active entities
    this.patients = [];
    this.activePatientId = 'jane_doe';
    this.prescriptions = [];
    this.reminders = [];
    this.workoutLogs = [];
    
    // MediaPipe & Computer Vision State
    this.useCamera = false; // false = Simulation Mode, true = Webcam Mode
    this.poseTracker = null;
    this.camera = null;
    this.isPlayingWorkout = false;
    this.currentExercise = null; // 'Squat', 'Bicep Curl', 'Shoulder Press'
    this.workoutTargetReps = 10;
    
    // Biomechanical & LSTM State Mocks
    this.repCount = 0;
    this.repState = 'extension'; // 'extension', 'flexion', 'peak_flexion'
    this.angleBuffer = []; // Rolling window of angles for LSTM simulator
    this.bufferSize = 30;
    this.workoutDuration = 0;
    this.workoutTimer = null;
    this.accuracyScores = [];
    this.sessionAccuracy = 100;
    this.simFrame = 0;
    this.simInterval = null;
    
    // Speech synthesis for AI Audio Cueing
    this.speechSynth = window.speechSynthesis;
    this.enableSpeech = true;
    
    // Doctor Portal chart
    this.progressChart = null;
    
    // UI Selectors
    this.selectors = {
      dbStatus: 'db-status-badge',
      patientInterface: 'patient-interface',
      doctorInterface: 'doctor-interface',
      btnPatientMode: 'btn-patient-mode',
      btnDoctorMode: 'btn-doctor-mode',
      settingsModal: 'settings-modal'
    };
  }

  // ==========================================================================
  // Initialization & Database Sync Layer
  // ==========================================================================

  init() {
    // Load config from localStorage
    const savedConfig = localStorage.getItem('rehab_ai_fb_config');
    const savedDbType = localStorage.getItem('rehab_ai_db_type');
    
    if (savedDbType) {
      this.dbType = savedDbType;
      const dbTypeRadio = document.querySelector(`input[name="db_connection_type"][value="${this.dbType}"]`);
      if (dbTypeRadio) dbTypeRadio.checked = true;
    }
    
    if (savedConfig) {
      try {
        this.firebaseConfig = JSON.parse(savedConfig);
        // Pre-fill form fields
        document.getElementById('fb-apiKey').value = this.firebaseConfig.apiKey || '';
        document.getElementById('fb-authDomain').value = this.firebaseConfig.authDomain || '';
        document.getElementById('fb-projectId').value = this.firebaseConfig.projectId || '';
        document.getElementById('fb-storageBucket').value = this.firebaseConfig.storageBucket || '';
        document.getElementById('fb-messagingSenderId').value = this.firebaseConfig.messagingSenderId || '';
        document.getElementById('fb-appId').value = this.firebaseConfig.appId || '';
      } catch (e) {
        console.error("Error parsing saved Firebase config", e);
      }
    }

    this.toggleDatabaseFormVisibility();
    
    if (this.dbType === 'firebase' && this.firebaseConfig) {
      this.initFirebase();
    } else {
      this.initLocalDatabase();
    }
    
    // Handle global clicks
    window.addEventListener('click', (e) => {
      const modal = document.getElementById(this.selectors.settingsModal);
      if (e.target === modal) this.toggleSettingsModal();
    });

    this.speak("Welcome to Rehab A I. Standing by for rehabilitation configuration.");
  }

  initLocalDatabase() {
    console.log("Initializing local database schema...");
    this.updateStatusBadge(false);
    
    // Read or seed patients
    const rawPatients = localStorage.getItem('rehab_patients');
    if (!rawPatients) {
      this.seedDatabase();
    } else {
      this.patients = JSON.parse(rawPatients);
      this.prescriptions = JSON.parse(localStorage.getItem('rehab_prescriptions') || '[]');
      this.reminders = JSON.parse(localStorage.getItem('rehab_reminders') || '[]');
      this.workoutLogs = JSON.parse(localStorage.getItem('rehab_workout_logs') || '[]');
    }
    
    this.setupRosterAndListeners();
  }

  initFirebase() {
    console.log("Initializing Firebase Firestore database...");
    try {
      // Avoid re-init
      if (!firebase.apps.length) {
        this.firebaseApp = firebase.initializeApp(this.firebaseConfig);
      } else {
        this.firebaseApp = firebase.app();
      }
      this.firestore = firebase.firestore();
      this.updateStatusBadge(true);
      
      // Load and set up real-time listener collections
      this.bindFirestoreListeners();
    } catch (error) {
      console.error("Firebase init failed, falling back to local database", error);
      document.getElementById('firebase-connection-error').innerText = "Connection Failed: " + error.message;
      document.getElementById('firebase-connection-error').style.display = 'block';
      this.dbType = 'local';
      document.querySelector('input[name="db_connection_type"][value="local"]').checked = true;
      this.toggleDatabaseFormVisibility();
      this.initLocalDatabase();
    }
  }

  // Pre-populate database with default patient data and workouts
  seedDatabase() {
    this.patients = [
      {
        id: 'jane_doe',
        name: 'Jane Doe',
        email: 'jane@rehabai.com',
        age: 28,
        gender: 'Female',
        condition: 'ACL Reconstruction Post-op',
        joinDate: '12 Jan 2026',
        compliance: 88,
        struggles: 'knee_valgus'
      },
      {
        id: 'john_smith',
        name: 'John Smith',
        email: 'john@rehabai.com',
        age: 46,
        gender: 'Male',
        condition: 'Chronic Rotator Cuff Tendonitis',
        joinDate: '05 Feb 2026',
        compliance: 65,
        struggles: 'incomplete_rom'
      }
    ];

    this.prescriptions = [
      { id: 'p1', patientId: 'jane_doe', exercise: 'Squat', reps: 10, sets: 3, frequency: 'Daily' },
      { id: 'p2', patientId: 'jane_doe', exercise: 'Bicep Curl', reps: 12, sets: 3, frequency: 'Every other day' },
      { id: 'p3', patientId: 'john_smith', exercise: 'Shoulder Press', reps: 8, sets: 4, frequency: 'Daily' },
      { id: 'p4', patientId: 'john_smith', exercise: 'Bicep Curl', reps: 10, sets: 3, frequency: '3 times a week' },
      { id: 'p5', patientId: 'jane_doe', exercise: 'Lunge', reps: 10, sets: 3, frequency: 'Daily' },
      { id: 'p6', patientId: 'john_smith', exercise: 'Lateral Raise', reps: 12, sets: 3, frequency: '3 times a week' },
      { id: 'p7', patientId: 'jane_doe', exercise: 'Wall Sit', reps: 10, sets: 3, frequency: 'Daily' }
    ];

    this.reminders = [
      { id: 'r1', patientId: 'jane_doe', message: 'Remember to track knee stability. Squat deep but stop if you feel pain.', timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), critical: false },
      { id: 'r2', patientId: 'jane_doe', message: 'Clinical Review: Good stability progression! Increase squat sets next session.', timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), critical: true },
      { id: 'r3', patientId: 'john_smith', message: 'Do not swing your elbow during bicep curls. Maintain slow eccentric movements.', timestamp: new Date(Date.now() - 3600000 * 28).toISOString(), critical: false }
    ];

    const today = new Date();
    this.workoutLogs = [
      // Jane Doe Squat Session
      { id: 'w1', patientId: 'jane_doe', exercise: 'Squat', reps: 10, targetReps: 10, sets: 3, avgAccuracy: 92, durationMins: 3.5, timestamp: new Date(today.getTime() - 3600000 * 48).toISOString(), formFlags: [] },
      { id: 'w2', patientId: 'jane_doe', exercise: 'Squat', reps: 8, targetReps: 10, sets: 3, avgAccuracy: 84, durationMins: 2.8, timestamp: new Date(today.getTime() - 3600000 * 24).toISOString(), formFlags: ['knee_valgus'] },
      { id: 'w3', patientId: 'jane_doe', exercise: 'Bicep Curl', reps: 12, targetReps: 12, sets: 3, avgAccuracy: 96, durationMins: 2.1, timestamp: new Date(today.getTime() - 3600000 * 12).toISOString(), formFlags: [] },
      
      // John Smith Rotator Cuff Session
      { id: 'w4', patientId: 'john_smith', exercise: 'Shoulder Press', reps: 8, targetReps: 8, sets: 4, avgAccuracy: 78, durationMins: 4.2, timestamp: new Date(today.getTime() - 3600000 * 72).toISOString(), formFlags: ['incomplete_rom'] },
      { id: 'w5', patientId: 'john_smith', exercise: 'Bicep Curl', reps: 10, targetReps: 10, sets: 3, avgAccuracy: 64, durationMins: 3.1, timestamp: new Date(today.getTime() - 3600000 * 48).toISOString(), formFlags: ['fast_eccentric'] },
      { id: 'w6', patientId: 'john_smith', exercise: 'Shoulder Press', reps: 6, targetReps: 8, sets: 4, avgAccuracy: 80, durationMins: 3.8, timestamp: new Date(today.getTime() - 3600000 * 24).toISOString(), formFlags: ['incomplete_rom'] }
    ];

    this.saveLocalData();
  }

  saveLocalData() {
    localStorage.setItem('rehab_patients', JSON.stringify(this.patients));
    localStorage.setItem('rehab_prescriptions', JSON.stringify(this.prescriptions));
    localStorage.setItem('rehab_reminders', JSON.stringify(this.reminders));
    localStorage.setItem('rehab_workout_logs', JSON.stringify(this.workoutLogs));
  }

  // Initialize Cloud database binding
  bindFirestoreListeners() {
    // 1. Listen to Patients
    this.firestore.collection('patients').onSnapshot((querySnapshot) => {
      const dbPatients = [];
      querySnapshot.forEach((doc) => {
        dbPatients.push({ id: doc.id, ...doc.data() });
      });
      
      // Seed if cloud is empty
      if (dbPatients.length === 0) {
        console.log("Cloud database empty. Seeding templates...");
        this.patients.forEach(pat => {
          this.firestore.collection('patients').doc(pat.id).set(pat);
        });
        this.prescriptions.forEach(p => this.firestore.collection('prescriptions').doc(p.id).set(p));
        this.reminders.forEach(r => this.firestore.collection('reminders').doc(r.id).set(r));
        this.workoutLogs.forEach(w => this.firestore.collection('workout_logs').doc(w.id).set(w));
        return;
      }
      
      this.patients = dbPatients;
      this.setupRosterAndListeners();
      this.renderPatientDashboard();
    }, error => {
      console.error("Firestore patients subscription error", error);
    });

    // 2. Listen to Prescriptions
    this.firestore.collection('prescriptions').onSnapshot((querySnapshot) => {
      this.prescriptions = [];
      querySnapshot.forEach((doc) => {
        this.prescriptions.push({ id: doc.id, ...doc.data() });
      });
      this.renderPatientDashboard();
      this.renderPatientDetailView();
    });

    // 3. Listen to Reminders
    this.firestore.collection('reminders').onSnapshot((querySnapshot) => {
      this.reminders = [];
      querySnapshot.forEach((doc) => {
        this.reminders.push({ id: doc.id, ...doc.data() });
      });
      this.renderPatientDashboard();
    });

    // 4. Listen to Workout Logs
    this.firestore.collection('workout_logs').onSnapshot((querySnapshot) => {
      this.workoutLogs = [];
      querySnapshot.forEach((doc) => {
        this.workoutLogs.push({ id: doc.id, ...doc.data() });
      });
      this.renderPatientDashboard();
      this.renderPatientDetailView();
    });
  }

  setupRosterAndListeners() {
    // Populate Patient Select dropdown

const selectEl = document.getElementById('select-active-patient');

// Select the first available patient if the current one does not exist
if (this.patients.length > 0 &&
    !this.patients.some(p => p.id === this.activePatientId)) {
    this.activePatientId = this.patients[0].id;
}

if (selectEl) {
    selectEl.innerHTML = '';

    this.patients.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.innerText = p.name;
        selectEl.appendChild(opt);
    });

    selectEl.value = this.activePatientId;
}

    
    // Populate Login Select dropdown
    this.populateLoginSelector();
    
    // Draw Doctor patient roster
    this.renderDoctorRoster();
    this.renderPatientDashboard();
  }

  updateStatusBadge(isFirebase) {
    const badge = document.getElementById(this.selectors.dbStatus);
    if (!badge) return;
    
    if (isFirebase) {
      badge.className = "badge status-firebase";
      badge.querySelector('.badge-text').innerText = "Firebase Connected";
    } else {
      badge.className = "badge status-local";
      badge.querySelector('.badge-text').innerText = "Local Simulator Mode";
    }
  }

  // ==========================================================================
  // Router / Layout Toggles
  // ==========================================================================

  switchRole(role) {
    this.currentRole = role;
    const patientSect = document.getElementById(this.selectors.patientInterface);
    const doctorSect = document.getElementById(this.selectors.doctorInterface);
    
    const btnPatient = document.getElementById(this.selectors.btnPatientMode);
    const btnDoctor = document.getElementById(this.selectors.btnDoctorMode);
    
    if (role === 'patient') {
      patientSect.classList.add('active');
      doctorSect.classList.remove('active');
      btnPatient.classList.add('active');
      btnDoctor.classList.remove('active');
      this.renderPatientDashboard();
    } else {
      patientSect.classList.remove('active');
      doctorSect.classList.add('active');
      btnPatient.classList.remove('active');
      btnDoctor.classList.add('active');
      
      // Return to roster list first
      document.getElementById('doctor-roster-view').style.display = 'block';
      document.getElementById('doctor-patient-detail-view').style.display = 'none';
      this.renderDoctorRoster();
    }
  }

  switchPatientTab(tabId) {
    this.currentPatientTab = tabId;
    
    // Update sidebar styles
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update active panel content
    document.querySelectorAll('.patient-tab-content').forEach(tab => {
      if (tab.id === `tab-${tabId}`) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    if (tabId === 'patient-workout') {
      this.resetWorkoutWorkspace();
    }
    
    if (tabId === 'patient-dashboard') {
      this.renderPatientDashboard();
    }
  }

  changeActivePatient(patientId) {
    this.activePatientId = patientId;
    this.renderPatientDashboard();
  }

  // ==========================================================================
  // Patient Portal Logic & Renderers
  // ==========================================================================

  renderPatientDashboard() {
   const patient = this.patients.find(p => p.id === this.activePatientId);

if (!patient) {
    document.getElementById('span-patient-name').innerText = 'No patient selected';
    return;
}

    // Fill demographic headers
    document.getElementById('span-patient-name').innerText = patient.name;
    document.getElementById('span-compliance-pct').innerText = patient.compliance;
    
    // Draw weekly compliance radial bar
    const ring = document.getElementById('compliance-ring-val');
    if (ring) {
      // Circumference = 2 * PI * r = 2 * 3.14159 * 32 = 201
      const offset = 201 - (patient.compliance / 100) * 201;
      ring.style.strokeDashoffset = offset;
    }

    // Load active patient notifications
    const pReminders = this.reminders.filter(r => r.patientId === this.activePatientId)
      .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
      
    const remindersBox = document.getElementById('patient-reminders-list');
    remindersBox.innerHTML = '';
    
    if (pReminders.length === 0) {
      remindersBox.innerHTML = `<p class="no-data-msg">No alerts or guidelines issued by clinician.</p>`;
    } else {
      pReminders.forEach(r => {
        const item = document.createElement('div');
        item.className = `reminder-bubble ${r.critical ? 'critical' : ''}`;
        
        const dateStr = new Date(r.timestamp).toLocaleDateString() + ' ' + new Date(r.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        item.innerHTML = `
          <p>${r.message}</p>
          <span class="date">${dateStr}</span>
        `;
        remindersBox.appendChild(item);
      });
    }

    // Load active prescriptions list
    const pPrescriptions = this.prescriptions.filter(p => p.patientId === this.activePatientId);
    const prescribedBox = document.getElementById('patient-prescribed-list');
    prescribedBox.innerHTML = '';
    
    if (pPrescriptions.length === 0) {
      prescribedBox.innerHTML = `<p class="no-data-msg">No structured workouts prescribed yet.</p>`;
    } else {
      pPrescriptions.forEach(p => {
        const card = document.createElement('div');
        card.className = 'prescription-item-card';
        card.innerHTML = `
          <div class="presc-top">
            <h4>${p.exercise}</h4>
            <p>${p.frequency}</p>
          </div>
          <div class="presc-bottom">
            <span class="presc-sets">${p.sets} Sets × ${p.reps} Reps</span>
            <button class="btn btn-secondary-sm" onclick="app.startPrescribedWorkout('${p.exercise}', ${p.reps})">Start</button>
          </div>
        `;
        prescribedBox.appendChild(card);
      });
    }

    // Populate active exercises list on start screen of Workout Hub (Display all, highlight prescribed)
    const setupSelector = document.getElementById('setup-exercise-selector');
    if (setupSelector) {
      setupSelector.innerHTML = '';
      const allExercises = ['Squat', 'Bicep Curl', 'Shoulder Press', 'Lunge', 'Lateral Raise', 'Wall Sit'];
      
      allExercises.forEach(exName => {
        const p = pPrescriptions.find(presc => presc.exercise === exName);
        const reps = p ? p.reps : 10;
        const sets = p ? p.sets : 3;
        const isPrescribed = exName === 'Wall Sit' || !!p;
        
        const wCard = document.createElement('div');
        wCard.className = 'workout-card' + (isPrescribed ? ' prescribed-card' : '');
        wCard.onclick = () => this.startPrescribedWorkout(exName, reps);
        
        let desc = '';
        if (exName === 'Squat') desc = 'Strengthens quadriceps, glutes and stabilizes knee joint rotation.';
        else if (exName === 'Bicep Curl') desc = 'Isolates biceps brachii for dynamic elbow flexion rehabilitation.';
        else if (exName === 'Shoulder Press') desc = 'Restores rotator cuff endurance, core control, and deltoid push limits.';
        else if (exName === 'Lunge') desc = 'Improves unilateral lower body strength, hip alignment, and functional balance.';
        else if (exName === 'Lateral Raise') desc = 'Builds medial deltoid strength and assists rotator cuff stability under load.';
        else if (exName === 'Wall Sit') desc = 'Improves quadriceps endurance, knee stability, lower-body strength, and rehabilitation recovery.';
        
        wCard.innerHTML = `
          ${isPrescribed ? '<div class="workout-card-badge">Prescribed</div>' : ''}
          <h3>${exName}</h3>
          <p>${desc}</p>
          <div class="workout-card-footer">
            <span class="reps">${sets} Sets × ${reps} Reps</span>
            <span class="btn btn-secondary-sm">Configure Camera</span>
          </div>
        `;
        setupSelector.appendChild(wCard);
      });
    }

    // Load active patient statistics
    const pLogs = this.workoutLogs.filter(w => w.patientId === this.activePatientId);
    document.getElementById('stat-completed-count').innerText = pLogs.length;
    
    const avgAcc = pLogs.length > 0 ? Math.round(pLogs.reduce((acc, curr) => acc + curr.avgAccuracy, 0) / pLogs.length) : 0;
    document.getElementById('stat-avg-accuracy').innerText = avgAcc + '%';
    
    const activeMins = pLogs.length > 0 ? Math.round(pLogs.reduce((acc, curr) => acc + curr.durationMins, 0)) : 0;
    document.getElementById('stat-active-mins').innerText = activeMins + 'm';

    // Roster of history sessions
    const historyBox = document.getElementById('patient-history-list');
    historyBox.innerHTML = '';
    const sortedLogs = [...pLogs].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (sortedLogs.length === 0) {
      historyBox.innerHTML = `<p class="no-data-msg">No workout records found.</p>`;
    } else {
      sortedLogs.forEach(w => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const dateStr = new Date(w.timestamp).toLocaleDateString([], {month:'short', day:'numeric'}) + ' ' + new Date(w.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const flagIndicator = w.formFlags && w.formFlags.length > 0 ? `<span class="red-text" style="font-size: 0.65rem">⚠️ Form issue</span>` : `<span class="green-text" style="font-size: 0.65rem">✓ Clear Form</span>`;
        
        item.innerHTML = `
          <div class="hist-left">
            <h5>${w.exercise}</h5>
            <span>${dateStr}</span>
          </div>
          <div class="hist-right">
            <div class="hist-score">${w.avgAccuracy}% Acc</div>
            <div class="hist-details">${w.reps} Reps • ${flagIndicator}</div>
          </div>
        `;
        historyBox.appendChild(item);
      });
    }
  }

  // ==========================================================================
  // Computer Vision, Canvas Rendering & Math
  // ==========================================================================

  startPrescribedWorkout(exercise, targetReps) {
    this.currentExercise = exercise;
    this.workoutTargetReps = targetReps;
    
    this.switchPatientTab('patient-workout');
    document.getElementById('workout-init-screen').style.display = 'none';
    document.getElementById('workout-active-screen').style.display = 'grid';
    
    // Set headers
    document.getElementById('workout-current-title').innerText = `${exercise} Rehabilitation`;
    document.getElementById('workout-target-reps').innerText = targetReps;
    
    // Toggle joint columns based on exercise
    if (exercise === 'Shoulder Press') {
      document.getElementById('joint-angle-lbl-1').innerText = 'Elbow Angle';
      document.getElementById('joint-angle-lbl-2').innerText = 'Shoulder Angle';
      document.getElementById('joint-angle-row-2').style.display = 'flex';
    } else if (exercise === 'Squat' || exercise === 'Wall Sit') {
      document.getElementById('joint-angle-lbl-1').innerText = 'Knee Angle';
      document.getElementById('joint-angle-row-2').style.display = 'none';
    } else if (exercise === 'Lunge') {
      document.getElementById('joint-angle-lbl-1').innerText = 'Knee Angle';
      document.getElementById('joint-angle-lbl-2').innerText = 'Torso Angle';
      document.getElementById('joint-angle-row-2').style.display = 'flex';
    } else if (exercise === 'Lateral Raise') {
      document.getElementById('joint-angle-lbl-1').innerText = 'Shoulder Angle';
      document.getElementById('joint-angle-row-2').style.display = 'none';
    } else { // Bicep Curl
      document.getElementById('joint-angle-lbl-1').innerText = 'Elbow Angle';
      document.getElementById('joint-angle-row-2').style.display = 'none';
    }

    this.isPlayingWorkout = true;
    this.repCount = 0;
    this.repState = 'extension';
    this.accuracyScores = [];
    this.angleBuffer = [];
    this.workoutDuration = 0;
    
    document.getElementById('workout-reps-val').innerText = '0';
    document.getElementById('workout-accuracy-val').innerText = '100';
    
    // Reset joint angle values and progress bars
    const bar1 = document.getElementById('joint-angle-bar-1');
    const val1 = document.getElementById('joint-angle-val-1');
    if (bar1 && val1) {
      val1.innerText = '0°';
      bar1.style.width = '0%';
    }
    const bar2 = document.getElementById('joint-angle-bar-2');
    const val2 = document.getElementById('joint-angle-val-2');
    if (bar2 && val2) {
      val2.innerText = '0°';
      bar2.style.width = '0%';
    }
    
    this.updateAccuracyUI(100);
    
    // Launch timer
    this.workoutTimer = setInterval(() => {
      this.workoutDuration += 1;
    }, 1000);

    // Initial cue sound
    this.speak(`Starting ${exercise} routine. Position yourself in front of the camera and begin.`);

    // Start video mode or simulation mode
    this.initVisionPipeline();
  }

  initVisionPipeline() {
    this.stopVisionPipeline();
    
    if (this.useCamera) {
      // Show loading spinner
      document.getElementById('camera-loading-spinner').style.display = 'flex';
      document.getElementById('simulation-video-overlay').style.display = 'none';
      document.getElementById('overlay-canvas').style.display = 'block';
      
      this.initWebcamAndMediaPipe();
    } else {
      // Simulation Mode
      document.getElementById('camera-loading-spinner').style.display = 'none';
      document.getElementById('simulation-video-overlay').style.display = 'block';
      document.getElementById('overlay-canvas').style.display = 'block';
      
      this.startInteractiveSimulation();
    }
  }

  stopVisionPipeline() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    // Clear canvas
    const canvas = document.getElementById('overlay-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  toggleCameraMode() {
    this.useCamera = !this.useCamera;
    const btnText = document.getElementById('txt-cam-mode');
    
    // Mode transitions & State resets
    this.angleBuffer = []; // clearLSTMSequence
    this.repCount = 0; // reset rep count
    document.getElementById('workout-reps-val').innerText = '0';
    document.getElementById('workout-phase').innerText = "Waiting for Pose";
    
    // Reset joint angle values and progress bars
    const val1 = document.getElementById('joint-angle-val-1');
    const bar1 = document.getElementById('joint-angle-bar-1');
    if (val1 && bar1) {
      val1.innerText = "--";
      bar1.style.width = "0%";
    }
    const val2 = document.getElementById('joint-angle-val-2');
    const bar2 = document.getElementById('joint-angle-bar-2');
    if (val2 && bar2) {
      val2.innerText = "--";
      bar2.style.width = "0%";
    }
    
    this.renderLSTMBufferMonitor();
    
    if (this.useCamera) {
      btnText.innerText = "Switch to Simulation";
      this.speak("Switched to web cam tracking.");
    } else {
      btnText.innerText = "Switch to Webcam";
      this.speak("Switched to interactive animation simulation.");
    }
    if (this.isPlayingWorkout) {
      this.initVisionPipeline();
    }
  }

  toggleOverlay(checked) {
    const canvas = document.getElementById('overlay-canvas');
    canvas.style.opacity = checked ? '1' : '0';
  }

  // MediaPipe Initialization
  initWebcamAndMediaPipe() {
    const videoElement = document.getElementById('webcam-video');
    const canvasElement = document.getElementById('overlay-canvas');
    const canvasCtx = canvasElement.getContext('2d');
    
    if (!window.Pose) {
      console.error("MediaPipe Pose library not loaded via script tag.");
      document.getElementById('camera-loading-spinner').querySelector('p').innerText = "Failed to load MediaPipe library.";
      return;
    }

    this.poseTracker = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    this.poseTracker.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.poseTracker.onResults((results) => {
      if (!this.isPlayingWorkout) return;
      if (!this.useCamera) return; // Strict guard to prevent webcam updates when in simulation mode
      
      document.getElementById('camera-loading-spinner').style.display = 'none';
      
      // Match canvas sizing
      if (canvasElement.width !== videoElement.videoWidth) {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
      }
      
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      
      // Draw camera mirror image
      canvasCtx.save();
      canvasCtx.scale(-1, 1);
      canvasCtx.translate(-canvasElement.width, 0);
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
      canvasCtx.restore();
      
      console.log("Current Mode: webcam");
      
      if (results.poseLandmarks) {
        console.log("Pose Detected: true");
        console.log("Angle Source: webcam");
        this.processRealTimeSkeleton(results.poseLandmarks, canvasCtx, canvasElement.width, canvasElement.height);
      } else {
        console.log("Pose Detected: false");
        console.log("Angle Source: none");
        this.handleNoPoseDetected("No Pose Detected");
      }
    });

    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        await this.poseTracker.send({ image: videoElement });
      },
      width: 640,
      height: 480
    });

    this.camera.start().catch(err => {
      console.error("Webcam trigger failure", err);
      this.speak("Camera failed. Switching back to motion simulation.");
      this.toggleCameraMode();
    });
  }

  // Standard Vector Math for 3D Joint Angles
  calculateJointAngle(pA, pB, pC) {
    // Vectors relative to center point B
    const vBA = { x: pA.x - pB.x, y: pA.y - pB.y, z: pA.z - pB.z };
    const vBC = { x: pC.x - pB.x, y: pC.y - pB.y, z: pC.z - pB.z };
    
    // Dot product
    const dotProduct = (vBA.x * vBC.x) + (vBA.y * vBC.y) + (vBA.z * vBC.z);
    
    // Magnitudes
    const magBA = Math.sqrt(vBA.x*vBA.x + vBA.y*vBA.y + vBA.z*vBA.z);
    const magBC = Math.sqrt(vBC.x*vBC.x + vBC.y*vBC.y + vBC.z*vBC.z);
    
    if (magBA * magBC === 0) return 0;
    
    // Calculate cos(theta) and clamp it to avoid floating point errors out of range [-1, 1]
    let cosTheta = dotProduct / (magBA * magBC);
    cosTheta = Math.max(-1.0, Math.min(1.0, cosTheta));
    
    // Angle in degrees
    return Math.acos(cosTheta) * (180 / Math.PI);
  }

  handleNoPoseDetected(message = "No Pose Detected") {
    document.getElementById('workout-cue-box').innerText = message;
    
    // Set joint angle labels to "--" and progress bars to 0%
    const val1 = document.getElementById('joint-angle-val-1');
    const bar1 = document.getElementById('joint-angle-bar-1');
    if (val1 && bar1) {
      val1.innerText = "--";
      bar1.style.width = "0%";
    }
    const val2 = document.getElementById('joint-angle-val-2');
    const bar2 = document.getElementById('joint-angle-bar-2');
    if (val2 && bar2) {
      val2.innerText = "--";
      bar2.style.width = "0%";
    }
    
    document.getElementById('workout-phase').innerText = "Waiting for Pose";
  }

  processRealTimeSkeleton(landmarks, ctx, width, height) {
    // Draw key skeleton lines
    this.drawSkeletonLines(landmarks, ctx, width, height);

    // Compute joint angles based on current active exercise
    let angle1 = 0;
    let angle2 = 0;
    const isVisible = (pt) => pt && pt.visibility > 0.5;
    
    if (this.currentExercise === 'Squat' || this.currentExercise === 'Wall Sit') {
      // Knee joint calculation (Hip [23/24] -> Knee [25/26] -> Ankle [27/28])
      const leftHip = landmarks[23];
      const leftKnee = landmarks[25];
      const leftAnkle = landmarks[27];
      
      if (isVisible(leftHip) && isVisible(leftKnee) && isVisible(leftAnkle)) {
        angle1 = this.calculateJointAngle(leftHip, leftKnee, leftAnkle);
        this.drawJointLabel(leftKnee, angle1, ctx, width, height, "Knee");
        
        // Run simulated LSTM checking
        this.evaluateLSTMPipeline(angle1, null, landmarks);
      } else {
        this.handleNoPoseDetected("Adjust position: Ensure your knee and lower body are fully visible.");
      }
      
    } else if (this.currentExercise === 'Bicep Curl') {
      // Elbow joint calculation (Shoulder [11/12] -> Elbow [13/14] -> Wrist [15/16])
      const rightShoulder = landmarks[12];
      const rightElbow = landmarks[14];
      const rightWrist = landmarks[16];
      
      if (isVisible(rightShoulder) && isVisible(rightElbow) && isVisible(rightWrist)) {
        angle1 = this.calculateJointAngle(rightShoulder, rightElbow, rightWrist);
        this.drawJointLabel(rightElbow, angle1, ctx, width, height, "Elbow");
        
        this.evaluateLSTMPipeline(angle1, null, landmarks);
      } else {
        this.handleNoPoseDetected("Adjust position: Ensure your arm and elbow are fully visible.");
      }
      
    } else if (this.currentExercise === 'Shoulder Press') {
      // Elbow angle (Shoulder -> Elbow -> Wrist) and Shoulder angle (Hip -> Shoulder -> Elbow)
      const leftHip = landmarks[23];
      const leftShoulder = landmarks[11];
      const leftElbow = landmarks[13];
      const leftWrist = landmarks[15];
      
      if (isVisible(leftHip) && isVisible(leftShoulder) && isVisible(leftElbow) && isVisible(leftWrist)) {
        angle1 = this.calculateJointAngle(leftShoulder, leftElbow, leftWrist);
        angle2 = this.calculateJointAngle(leftHip, leftShoulder, leftElbow);
        
        this.drawJointLabel(leftElbow, angle1, ctx, width, height, "Elbow");
        this.drawJointLabel(leftShoulder, angle2, ctx, width, height, "Shoulder");
        
        this.evaluateLSTMPipeline(angle1, angle2, landmarks);
      } else {
        this.handleNoPoseDetected("Adjust position: Ensure your shoulder, elbow, and hip are visible.");
      }
    } else if (this.currentExercise === 'Lunge') {
      const leftHip = landmarks[23];
      const leftKnee = landmarks[25];
      const leftAnkle = landmarks[27];
      const leftShoulder = landmarks[11];
      
      if (isVisible(leftHip) && isVisible(leftKnee) && isVisible(leftAnkle) && isVisible(leftShoulder)) {
        angle1 = this.calculateJointAngle(leftHip, leftKnee, leftAnkle);
        angle2 = this.calculateJointAngle(leftShoulder, leftHip, leftKnee);
        
        this.drawJointLabel(leftKnee, angle1, ctx, width, height, "Knee");
        this.drawJointLabel(leftHip, angle2, ctx, width, height, "Torso");
        
        this.evaluateLSTMPipeline(angle1, angle2, landmarks);
      } else {
        this.handleNoPoseDetected("Adjust position: Ensure your torso, knee, and ankle are visible.");
      }
    } else if (this.currentExercise === 'Lateral Raise') {
      const leftHip = landmarks[23];
      const leftShoulder = landmarks[11];
      const leftElbow = landmarks[13];
      
      if (isVisible(leftHip) && isVisible(leftShoulder) && isVisible(leftElbow)) {
        angle1 = this.calculateJointAngle(leftHip, leftShoulder, leftElbow);
        this.drawJointLabel(leftShoulder, angle1, ctx, width, height, "Shoulder");
        
        this.evaluateLSTMPipeline(angle1, null, landmarks);
      } else {
        this.handleNoPoseDetected("Adjust position: Ensure your shoulder, elbow, and hip are visible.");
      }
    }
  }

  // Draw overlay bone paths on top of camera frames
  drawSkeletonLines(landmarks, ctx, width, height) {
    const drawLine = (ptA, ptB, color = '#6366f1') => {
      ctx.beginPath();
      // Mirror drawing for natural webcam viewing
      ctx.moveTo((1 - ptA.x) * width, ptA.y * height);
      ctx.lineTo((1 - ptB.x) * width, ptB.y * height);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 4;
      ctx.shadowColor = color;
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    };

    const drawPoint = (pt, color = '#ec4899') => {
      ctx.beginPath();
      ctx.arc((1 - pt.x) * width, pt.y * height, 6, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    // Keypoints connections mapping
    const connections = [
      [11, 12], // shoulder line
      [11, 13], [13, 15], // left arm
      [12, 14], [14, 16], // right arm
      [11, 23], [12, 24], // trunk lines
      [23, 24], // hip line
      [23, 25], [25, 27], // left leg
      [24, 26], [26, 28]  // right leg
    ];

    connections.forEach(([i, j]) => {
      if (landmarks[i] && landmarks[j] && landmarks[i].visibility > 0.5 && landmarks[j].visibility > 0.5) {
        drawLine(landmarks[i], landmarks[j]);
      }
    });

    // Draw key joint dots
    [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach(idx => {
      if (landmarks[idx] && landmarks[idx].visibility > 0.5) {
        drawPoint(landmarks[idx]);
      }
    });
  }

  drawJointLabel(pt, angle, ctx, width, height, text) {
    ctx.font = 'bold 12px Outfit';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    const x = (1 - pt.x) * width + 12;
    const y = pt.y * height + 4;
    ctx.strokeText(`${text}: ${Math.round(angle)}°`, x, y);
    ctx.fillText(`${text}: ${Math.round(angle)}°`, x, y);
  }

  // ==========================================================================
  // High-Fidelity Simulation Mode
  // ==========================================================================

  startInteractiveSimulation() {
    this.simFrame = 0;
    const canvas = document.getElementById('overlay-canvas');
    const ctx = canvas.getContext('2d');
    
    // Set static aspect ratio sizing
    canvas.width = 640;
    canvas.height = 480;
    
    const frameRate = 30; // 30 FPS
    
    this.simInterval = setInterval(() => {
      // Terminate simulation loop immediately if switched to webcam mode
      if (this.useCamera) {
        clearInterval(this.simInterval);
        this.simInterval = null;
        return;
      }
      
      this.simFrame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      console.log("Current Mode: simulation");
      console.log("Pose Detected: true");
      console.log("Angle Source: simulation");
      
      // Calculate dynamic periodic cycles using simple sine equations
      const timeFactor = (this.simFrame / frameRate) * 1.5; // Controls pacing speed
      const cycles = Math.sin(timeFactor);
      
      let baseJointAngle1 = 0;
      let baseJointAngle2 = 0;
      let landmarks = null;
      
      if (this.currentExercise === 'Squat' || this.currentExercise === 'Wall Sit') {
        // Knee angle: between 170° (standing) and 85° (deep squat)
        baseJointAngle1 = 127.5 + 42.5 * cycles;
        
        // Compute mock landmarks locations
        landmarks = this.generateMockSquatLandmarks(baseJointAngle1);
        this.drawSkeletonLines(landmarks, ctx, canvas.width, canvas.height);
        this.drawJointLabel(landmarks[25], baseJointAngle1, ctx, canvas.width, canvas.height, "Knee");
        
        this.evaluateLSTMPipeline(baseJointAngle1, null, landmarks);
        
      } else if (this.currentExercise === 'Bicep Curl') {
        // Elbow angle: between 170° (ext) and 35° (contracted curl)
        baseJointAngle1 = 102.5 + 67.5 * cycles;
        
        landmarks = this.generateMockCurlLandmarks(baseJointAngle1);
        this.drawSkeletonLines(landmarks, ctx, canvas.width, canvas.height);
        this.drawJointLabel(landmarks[14], baseJointAngle1, ctx, canvas.width, canvas.height, "Elbow");
        
        this.evaluateLSTMPipeline(baseJointAngle1, null, landmarks);
        
      } else if (this.currentExercise === 'Shoulder Press') {
        // Pressing up: Elbow goes from 90° to 175°, Shoulder from 75° to 170°
        baseJointAngle1 = 132.5 + 42.5 * cycles; // Elbow
        baseJointAngle2 = 122.5 + 47.5 * cycles; // Shoulder
        
        landmarks = this.generateMockPressLandmarks(baseJointAngle1, baseJointAngle2);
        this.drawSkeletonLines(landmarks, ctx, canvas.width, canvas.height);
        this.drawJointLabel(landmarks[13], baseJointAngle1, ctx, canvas.width, canvas.height, "Elbow");
        this.drawJointLabel(landmarks[11], baseJointAngle2, ctx, canvas.width, canvas.height, "Shoulder");
        
        this.evaluateLSTMPipeline(baseJointAngle1, baseJointAngle2, landmarks);
      } else if (this.currentExercise === 'Lunge') {
        // Knee angle: between 170° and 90°
        baseJointAngle1 = 130 + 40 * cycles;
        // Torso angle: between 170° (upright) and 135° (forward leaning)
        baseJointAngle2 = 152.5 + 17.5 * cycles;
        
        landmarks = this.generateMockLungeLandmarks(baseJointAngle1, baseJointAngle2);
        this.drawSkeletonLines(landmarks, ctx, canvas.width, canvas.height);
        this.drawJointLabel(landmarks[25], baseJointAngle1, ctx, canvas.width, canvas.height, "Knee");
        this.drawJointLabel(landmarks[23], baseJointAngle2, ctx, canvas.width, canvas.height, "Torso");
        
        this.evaluateLSTMPipeline(baseJointAngle1, baseJointAngle2, landmarks);
      } else if (this.currentExercise === 'Lateral Raise') {
        // Shoulder abduction: between 15° (arms at side) and 95° (horizontal raised)
        baseJointAngle1 = 55 + 40 * cycles;
        
        landmarks = this.generateMockLateralRaiseLandmarks(baseJointAngle1);
        this.drawSkeletonLines(landmarks, ctx, canvas.width, canvas.height);
        this.drawJointLabel(landmarks[11], baseJointAngle1, ctx, canvas.width, canvas.height, "Shoulder");
        
        this.evaluateLSTMPipeline(baseJointAngle1, null, landmarks);
      }
      
    }, 1000 / frameRate);
  }

  generateMockSquatLandmarks(kneeAngle) {
    // Convert knee angle to visual coordinates
    // Standing: knee at (x: 0.35, y: 0.70), squatting: shifts lower
    const thetaKnee = (kneeAngle * Math.PI) / 180;
    
    // Trunk / hips coordinates
    const hipY = 0.45 + (1 - Math.sin(thetaKnee)) * 0.15;
    const kneeY = 0.75 + (1 - Math.sin(thetaKnee)) * 0.05;
    
    // Introduce slight posture drift to trigger safety checks
    let kneeX = 0.35;
    const isValgusCycle = (Math.floor(this.simFrame / 60) % 3 === 2); // valgus drift every 3rd rep
    if (isValgusCycle && kneeAngle < 120) {
      kneeX = 0.38; // Knees collapse inwards (valgus)
    }

    return {
      11: { x: 0.35, y: 0.25, z: 0.0, visibility: 0.9 }, // shoulders
      12: { x: 0.45, y: 0.25, z: 0.0, visibility: 0.9 },
      23: { x: 0.35, y: hipY, z: 0.0, visibility: 0.9 }, // hips
      24: { x: 0.45, y: hipY, z: 0.0, visibility: 0.9 },
      25: { x: kneeX, y: kneeY, z: 0.0, visibility: 0.9 }, // knees
      26: { x: 0.45, y: kneeY, z: 0.0, visibility: 0.9 },
      27: { x: 0.35, y: 0.95, z: 0.0, visibility: 0.9 }, // ankles
      28: { x: 0.45, y: 0.95, z: 0.0, visibility: 0.9 }
    };
  }

  generateMockCurlLandmarks(elbowAngle) {
    const thetaElbow = (elbowAngle * Math.PI) / 180;
    
    // Upper arm remains fixed, forearm rotates around elbow (x: 0.3, y: 0.5)
    // Shoulder (x: 0.3, y: 0.3), Elbow (x: 0.3, y: 0.5)
    // Forearm rotation calculations
    const wristX = 0.3 - Math.sin(thetaElbow) * 0.18;
    const wristY = 0.5 + Math.cos(thetaElbow) * 0.18;

    return {
      11: { x: 0.3, y: 0.3, z: 0.0, visibility: 0.9 },
      12: { x: 0.42, y: 0.3, z: 0.0, visibility: 0.9 },
      13: { x: 0.3, y: 0.5, z: 0.0, visibility: 0.9 }, // left elbow
      14: { x: 0.3, y: 0.5, z: 0.0, visibility: 0.9 }, // right elbow
      15: { x: wristX, y: wristY, z: 0.0, visibility: 0.9 }, // left wrist
      16: { x: wristX, y: wristY, z: 0.0, visibility: 0.9 }  // right wrist
    };
  }

  generateMockPressLandmarks(elbowAngle, shoulderAngle) {
    const thetaSh = (shoulderAngle * Math.PI) / 180;
    const thetaEl = (elbowAngle * Math.PI) / 180;
    
    // Shoulder point (x: 0.35, y: 0.35)
    const elbowX = 0.35 - Math.sin(thetaSh) * 0.12;
    const elbowY = 0.35 + Math.cos(thetaSh) * 0.12;
    
    // Wrist point
    const wristX = elbowX - Math.sin(thetaSh + thetaEl) * 0.12;
    const wristY = elbowY - Math.cos(thetaSh + thetaEl) * 0.12;

    return {
      11: { x: 0.35, y: 0.35, z: 0.0, visibility: 0.9 },
      12: { x: 0.45, y: 0.35, z: 0.0, visibility: 0.9 },
      13: { x: elbowX, y: elbowY, z: 0.0, visibility: 0.9 },
      14: { x: elbowX, y: elbowY, z: 0.0, visibility: 0.9 },
      15: { x: wristX, y: wristY, z: 0.0, visibility: 0.9 },
      16: { x: wristX, y: wristY, z: 0.0, visibility: 0.9 },
      23: { x: 0.35, y: 0.70, z: 0.0, visibility: 0.9 },
      24: { x: 0.45, y: 0.70, z: 0.0, visibility: 0.9 }
    };
  }

  generateMockLungeLandmarks(kneeAngle, torsoAngle) {
    const thetaKnee = (kneeAngle * Math.PI) / 180;
    const thetaTorso = (torsoAngle * Math.PI) / 180;

    // In a lunge, the front foot moves forward, hips drop
    const hipY = 0.50 + (1 - Math.sin(thetaKnee)) * 0.12;
    const kneeY = 0.78 + (1 - Math.sin(thetaKnee)) * 0.04;
    
    // Front foot stays fixed forward, back foot steps back
    return {
      11: { x: 0.42, y: 0.28, z: 0.0, visibility: 0.9 },
      12: { x: 0.48, y: 0.28, z: 0.0, visibility: 0.9 },
      23: { x: 0.42, y: hipY, z: 0.0, visibility: 0.9 }, // left hip
      24: { x: 0.48, y: hipY, z: 0.0, visibility: 0.9 }, // right hip
      25: { x: 0.28, y: kneeY, z: 0.0, visibility: 0.9 }, // left knee (front leg knee, bends forward)
      26: { x: 0.58, y: kneeY + 0.06, z: 0.0, visibility: 0.9 }, // right knee (back leg knee, drops down)
      27: { x: 0.28, y: 0.95, z: 0.0, visibility: 0.9 }, // left ankle
      28: { x: 0.68, y: 0.95, z: 0.0, visibility: 0.9 }  // right ankle
    };
  }

  generateMockLateralRaiseLandmarks(shoulderAngle) {
    // Shoulder abduction angle: Hip -> Shoulder -> Elbow.
    // Arms raise to the sides from 15 degrees to 90 degrees
    const angleRad = (shoulderAngle * Math.PI) / 180;
    
    // Left shoulder (x: 0.35, y: 0.35), Left Hip (x: 0.35, y: 0.70)
    // Left elbow: moves outward horizontally
    const leftElbowX = 0.35 - Math.sin(angleRad) * 0.18;
    const leftElbowY = 0.35 + Math.cos(angleRad) * 0.18;

    // Right shoulder (x: 0.65, y: 0.35), Right Hip (x: 0.65, y: 0.70)
    const rightElbowX = 0.65 + Math.sin(angleRad) * 0.18;
    const rightElbowY = 0.35 + Math.cos(angleRad) * 0.18;

    // Wrist continues the arm line outwards
    const leftWristX = leftElbowX - Math.sin(angleRad) * 0.15;
    const leftWristY = leftElbowY + Math.cos(angleRad) * 0.15;
    
    const rightWristX = rightElbowX + Math.sin(angleRad) * 0.15;
    const rightWristY = rightElbowY + Math.cos(angleRad) * 0.15;

    return {
      11: { x: 0.35, y: 0.35, z: 0.0, visibility: 0.9 }, // left shoulder
      12: { x: 0.65, y: 0.35, z: 0.0, visibility: 0.9 }, // right shoulder
      13: { x: leftElbowX, y: leftElbowY, z: 0.0, visibility: 0.9 }, // left elbow
      14: { x: rightElbowX, y: rightElbowY, z: 0.0, visibility: 0.9 }, // right elbow
      15: { x: leftWristX, y: leftWristY, z: 0.0, visibility: 0.9 }, // left wrist
      16: { x: rightWristX, y: rightWristY, z: 0.0, visibility: 0.9 }, // right wrist
      23: { x: 0.35, y: 0.70, z: 0.0, visibility: 0.9 }, // left hip
      24: { x: 0.65, y: 0.70, z: 0.0, visibility: 0.9 }, // right hip
      25: { x: 0.35, y: 0.95, z: 0.0, visibility: 0.9 },
      26: { x: 0.65, y: 0.95, z: 0.0, visibility: 0.9 }
    };
  }

  // ==========================================================================
  // Simulated LSTM AI Analysis Pipeline
  // ==========================================================================

  evaluateLSTMPipeline(angle1, angle2 = null, landmarks) {
    // Add current angle to rolling window sequence queue
    this.angleBuffer.push(angle1);
    if (this.angleBuffer.length > this.bufferSize) {
      this.angleBuffer.shift();
    }
    
    // Draw LSTM Rolling Sequence Buffer Monitor
    this.renderLSTMBufferMonitor();
    
    // Update joint angle display values and progress bars in DOM
    const bar1 = document.getElementById('joint-angle-bar-1');
    const val1 = document.getElementById('joint-angle-val-1');
    if (bar1 && val1) {
      val1.innerText = `${Math.round(angle1)}°`;
      bar1.style.width = `${Math.min(100, Math.max(0, (angle1 / 180) * 100))}%`;
    }
    
    const bar2 = document.getElementById('joint-angle-bar-2');
    const val2 = document.getElementById('joint-angle-val-2');
    if (bar2 && val2) {
      if (angle2 !== null) {
        val2.innerText = `${Math.round(angle2)}°`;
        bar2.style.width = `${Math.min(100, Math.max(0, (angle2 / 180) * 100))}%`;
      } else {
        val2.innerText = `0°`;
        bar2.style.width = `0%`;
      }
    }
    
    // State machine tracking reps
    const frameAccuracy = this.evaluateFormDeviations(angle1, angle2, landmarks);
    this.accuracyScores.push(frameAccuracy);
    
    const sum = this.accuracyScores.reduce((a, b) => a + b, 0);
    this.sessionAccuracy = Math.round(sum / this.accuracyScores.length);
    
    document.getElementById('workout-accuracy-val').innerText = this.sessionAccuracy;
    this.updateAccuracyUI(this.sessionAccuracy);
  }

  evaluateFormDeviations(angle1, angle2, landmarks) {
    let score = 100;
    
    // Display flags
    let formMessage = "Perfect Form";
    let speedText = "Stable";
    let stabilityText = "Stable";
    let formCheckClass = "green-text";
    
    const activeCue = document.getElementById('workout-cue-box');
    
    // Rep phase detection
    if (this.currentExercise === 'Squat' || this.currentExercise === 'Wall Sit') {
      
      // Knee Valgus Check (safety guardrail)
      const leftKnee = landmarks[25];
      const leftHip = landmarks[23];
      const leftAnkle = landmarks[27];
      if (leftKnee && leftHip && leftAnkle) {
        // Valgus collapses knee inwards (larger x coordinates)
        if (leftKnee.x > leftHip.x + 0.02) {
          score -= 30;
          formMessage = "⚠️ Knee Collapsing (Valgus)";
          formCheckClass = "red-text";
          stabilityText = "Unstable valgus";
          this.speakOnce("Keep your knees in line with your feet.");
        }
      }
      
      // Depth check
      if (this.repState === 'extension' && angle1 < 140) {
        this.repState = 'flexion';
        document.getElementById('workout-phase').innerText = "Eccentric (Lowering)";
      } else if (this.repState === 'flexion') {
        if (angle1 < 95) {
          this.repState = 'peak_flexion';
          document.getElementById('workout-phase').innerText = "Hold position";
        }
      } else if (this.repState === 'peak_flexion' && angle1 > 105) {
        this.repState = 'concentric';
        document.getElementById('workout-phase').innerText = "Concentric (Pushing)";
      } else if (this.repState === 'concentric' && angle1 > 155) {
        this.repState = 'extension';
        this.repCount++;
        document.getElementById('workout-reps-val').innerText = this.repCount;
        document.getElementById('workout-phase').innerText = "Standing (Complete)";
        
        // Spoken rep count
        this.speak(`${this.repCount} reps`);
      }
      
      // Depth advice
      if (this.repState === 'flexion' && angle1 > 115) {
        activeCue.innerText = "Squat lower until thighs are parallel to ground.";
      } else if (this.repState === 'peak_flexion') {
        activeCue.innerText = "Good depth! Now push up slowly.";
      } else {
        activeCue.innerText = "Stand tall and maintain knee alignment.";
      }
      
    } else if (this.currentExercise === 'Bicep Curl') {
      
      // Speed (tempo) check: sudden movements reduce score
      if (this.angleBuffer.length >= 2) {
        const delta = Math.abs(this.angleBuffer[this.angleBuffer.length - 1] - this.angleBuffer[this.angleBuffer.length - 2]);
        if (delta > 12) { // dynamic speed threshold
          score -= 25;
          formMessage = "⚠️ Tempo too fast / Swing";
          formCheckClass = "orange-text";
          speedText = "Rapid velocity";
          this.speakOnce("Slow down, control the weights.");
        }
      }

      if (this.repState === 'extension' && angle1 < 130) {
        this.repState = 'flexion';
        document.getElementById('workout-phase').innerText = "Eccentric (Flexion)";
      } else if (this.repState === 'flexion') {
        if (angle1 < 45) {
          this.repState = 'peak_flexion';
          document.getElementById('workout-phase').innerText = "Hold peak contraction";
        }
      } else if (this.repState === 'peak_flexion' && angle1 > 60) {
        this.repState = 'concentric';
        document.getElementById('workout-phase').innerText = "Concentric (Lowering)";
      } else if (this.repState === 'concentric' && angle1 > 150) {
        this.repState = 'extension';
        this.repCount++;
        document.getElementById('workout-reps-val').innerText = this.repCount;
        document.getElementById('workout-phase').innerText = "Fully extended";
        this.speak(`${this.repCount} reps`);
      }

      if (this.repState === 'flexion' && angle1 > 75) {
        activeCue.innerText = "Squeeze bicep, pull weights to shoulders.";
      } else {
        activeCue.innerText = "Extend arm fully on descent.";
      }

    } else if (this.currentExercise === 'Shoulder Press') {
      
      // Press evaluation checks both Elbow (angle1) and Shoulder (angle2)
      if (angle2 && angle2 < 80 && this.repState === 'peak_flexion') {
        score -= 20;
        formMessage = "⚠️ Incomplete Shoulder Flexion";
        formCheckClass = "orange-text";
        this.speakOnce("Push your shoulders up.");
      }

      if (this.repState === 'extension' && angle1 < 105) {
        this.repState = 'flexion'; // descent
        document.getElementById('workout-phase').innerText = "Lowering";
      } else if (this.repState === 'flexion' && angle1 < 85) {
        this.repState = 'peak_flexion'; // fully lowered
        document.getElementById('workout-phase').innerText = "Hold base position";
      } else if (this.repState === 'peak_flexion' && angle1 > 110) {
        this.repState = 'concentric'; // push
        document.getElementById('workout-phase').innerText = "Pressing vertical";
      } else if (this.repState === 'concentric' && angle1 > 165) {
        this.repState = 'extension'; // fully locked overhead
        this.repCount++;
        document.getElementById('workout-reps-val').innerText = this.repCount;
        document.getElementById('workout-phase').innerText = "Locked overhead";
        this.speak(`${this.repCount} reps`);
      }

      activeCue.innerText = "Press weights straight up, keep back stable.";
    } else if (this.currentExercise === 'Lunge') {
      // Torso angle (Shoulder -> Hip -> Knee) should be upright (>145)
      if (angle2 && angle2 < 145) {
        score -= 25;
        formMessage = "⚠️ Torso Leaning Forward";
        formCheckClass = "orange-text";
        this.speakOnce("Keep your chest up and torso vertical.");
      }

      if (this.repState === 'extension' && angle1 < 145) {
        this.repState = 'flexion';
        document.getElementById('workout-phase').innerText = "Eccentric (Lowering)";
      } else if (this.repState === 'flexion' && angle1 < 105) {
        this.repState = 'peak_flexion';
        document.getElementById('workout-phase').innerText = "Hold base depth";
      } else if (this.repState === 'peak_flexion' && angle1 > 115) {
        this.repState = 'concentric';
        document.getElementById('workout-phase').innerText = "Concentric (Pushing)";
      } else if (this.repState === 'concentric' && angle1 > 155) {
        this.repState = 'extension';
        this.repCount++;
        document.getElementById('workout-reps-val').innerText = this.repCount;
        document.getElementById('workout-phase').innerText = "Standing";
        this.speak(`${this.repCount} reps`);
      }

      if (this.repState === 'flexion') {
        activeCue.innerText = "Step forward, lower rear knee close to floor.";
      } else if (this.repState === 'peak_flexion') {
        activeCue.innerText = "Excellent lunge depth. Now push back.";
      } else {
        activeCue.innerText = "Keep hips square and stable.";
      }
    } else if (this.currentExercise === 'Lateral Raise') {
      // Height angle: Abduction should stop at ~90 degrees. If > 100, flag impingement
      if (angle1 > 100) {
        score -= 25;
        formMessage = "⚠️ Arms Too High (Impingement)";
        formCheckClass = "red-text";
        stabilityText = "High impingement risk";
        this.speakOnce("Stop raising once arms are parallel to floor.");
      }

      // Speed check
      if (this.angleBuffer.length >= 2) {
        const delta = Math.abs(this.angleBuffer[this.angleBuffer.length - 1] - this.angleBuffer[this.angleBuffer.length - 2]);
        if (delta > 8) {
          score -= 20;
          formMessage = "⚠️ Swing detected (Control tempo)";
          formCheckClass = "orange-text";
          this.speakOnce("Control the weights. Do not swing.");
        }
      }

      if (this.repState === 'extension' && angle1 > 35) {
        this.repState = 'flexion'; // raising phase
        document.getElementById('workout-phase').innerText = "Abduction (Raising)";
      } else if (this.repState === 'flexion' && angle1 > 80) {
        this.repState = 'peak_flexion'; // target height
        document.getElementById('workout-phase').innerText = "Hold peak height";
      } else if (this.repState === 'peak_flexion' && angle1 < 70) {
        this.repState = 'concentric'; // lowering phase
        document.getElementById('workout-phase').innerText = "Adduction (Lowering)";
      } else if (this.repState === 'concentric' && angle1 < 25) {
        this.repState = 'extension'; // resting at hips
        this.repCount++;
        document.getElementById('workout-reps-val').innerText = this.repCount;
        document.getElementById('workout-phase').innerText = "Resting at sides";
        this.speak(`${this.repCount} reps`);
      }

      if (this.repState === 'flexion') {
        activeCue.innerText = "Raise dumbbells slowly to shoulder height.";
      } else if (this.repState === 'peak_flexion') {
        activeCue.innerText = "Hold parallel! Lower down under control.";
      } else {
        activeCue.innerText = "Maintain a tall posture, slight bend in elbows.";
      }
    }

    document.getElementById('workout-form-check').innerText = formMessage;
    document.getElementById('workout-form-check').className = `diag-val ${formCheckClass}`;
    document.getElementById('workout-speed').innerText = speedText;
    document.getElementById('workout-stability').innerText = stabilityText;
    
    return Math.max(20, score); // clamp minimum score
  }

  updateAccuracyUI(score) {
    const ring = document.getElementById('workout-accuracy-ring');
    if (!ring) return;
    
    // Circumference = 264
    const offset = 264 - (score / 100) * 264;
    ring.style.strokeDashoffset = offset;
    
    // Color thresholds
    if (score >= 85) {
      ring.style.stroke = 'var(--emerald)';
    } else if (score >= 65) {
      ring.style.stroke = 'var(--amber)';
    } else {
      ring.style.stroke = 'var(--rose)';
    }
  }

  renderLSTMBufferMonitor() {
    const container = document.getElementById('angle-buffer-bars');
    if (!container) return;
    
    container.innerHTML = '';
    const maxVal = 180;
    
    // Populate monitor bars
    for (let i = 0; i < this.bufferSize; i++) {
      const bar = document.createElement('div');
      bar.className = 'buf-bar';
      
      const angle = this.angleBuffer[i] || 0;
      const heightPct = (angle / maxVal) * 100;
      
      bar.style.height = `${heightPct}%`;
      
      // Highlight the recent frame
      if (i === this.angleBuffer.length - 1 && this.angleBuffer.length > 0) {
        bar.classList.add('highlight');
      }
      
      container.appendChild(bar);
    }
  }

  // Audio Coaching throttle
  speakOnce(text) {
    if (!this.lastSpokenTime) this.lastSpokenTime = 0;
    const now = Date.now();
    // throttle to avoid overlaps (say, once every 8 seconds per warning)
    if (now - this.lastSpokenTime > 8000) {
      this.speak(text);
      this.lastSpokenTime = now;
    }
  }


speak(text) {
    if (!this.enableSpeech || !this.speechSynth ||
        typeof SpeechSynthesisUtterance === 'undefined') {
        return;
    }

    if (this.speechSynth.speaking) {
        this.speechSynth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    this.speechSynth.speak(utterance);
}


  // ==========================================================================
  // Session End & Save Workout Logs
  // ==========================================================================

  abortWorkout() {
    if (confirm("Are you sure you want to stop this workout? Your current progress will be lost.")) {
      this.stopRecording();
      this.resetWorkoutWorkspace();
    }
  }

  resetWorkoutWorkspace() {
    this.isPlayingWorkout = false;
    this.stopVisionPipeline();
    if (this.workoutTimer) {
      clearInterval(this.workoutTimer);
      this.workoutTimer = null;
    }
    document.getElementById('workout-init-screen').style.display = 'block';
    document.getElementById('workout-active-screen').style.display = 'none';
  }

  completeWorkout() {
    if (this.repCount === 0) {
      alert("Please perform at least 1 repetition before saving the session.");
      return;
    }

    clearInterval(this.workoutTimer);
    this.workoutTimer = null;

    // Detect struggles from workout run
    const formFlags = [];
    if (this.currentExercise === 'Squat') {
      const valgusReps = this.accuracyScores.filter(s => s < 80).length;
      if (valgusReps > 10) formFlags.push('knee_valgus');
    } else if (this.currentExercise === 'Bicep Curl') {
      const fastReps = this.accuracyScores.filter(s => s < 80).length;
      if (fastReps > 10) formFlags.push('fast_eccentric');
    } else if (this.currentExercise === 'Shoulder Press') {
      const romReps = this.accuracyScores.filter(s => s < 80).length;
      if (romReps > 10) formFlags.push('incomplete_rom');
    }

    const logId = 'log_' + Date.now();
    const durationMins = parseFloat((this.workoutDuration / 60).toFixed(1));

    this.speak(`Rehab session complete. Accuracy score is ${this.sessionAccuracy} percent. Saving results.`);

    // Stop recording and process video URL
    this.stopRecording().then(blob => {
      if (blob) {
        if (this.dbType === 'firebase') {
          return this.uploadVideoToFirebase(blob, logId);
        } else {
          const localUrl = URL.createObjectURL(blob);
          this.localVideoUrls = this.localVideoUrls || {};
          this.localVideoUrls[logId] = localUrl;
          return Promise.resolve(localUrl);
        }
      }
      return Promise.resolve(null);
    }).then(videoUrl => {
      const newLog = {
        id: logId,
        patientId: this.activePatientId,
        exercise: this.currentExercise,
        reps: this.repCount,
        targetReps: this.workoutTargetReps,
        sets: 1, // simplified representation of session
        avgAccuracy: this.sessionAccuracy,
        durationMins: durationMins || 0.1,
        timestamp: new Date().toISOString(),
        formFlags: formFlags,
        videoUrl: videoUrl
      };

      if (this.dbType === 'firebase') {
        // Save to Firebase Cloud DB
        this.firestore.collection('workout_logs').doc(logId).set(newLog)
          .then(() => {
            this.recalculatePatientComplianceCloud();
            alert("Workout session saved and synced successfully to Cloud Console!");
            this.resetWorkoutWorkspace();
            this.switchPatientTab('patient-dashboard');
          })
          .catch(err => {
            alert("Firebase Sync Error: " + err.message);
          });
      } else {
        // Local Save
        this.workoutLogs.push(newLog);
        this.recalculatePatientComplianceLocal();
        this.saveLocalData();
        alert("Workout session saved to Local Storage!");
        this.resetWorkoutWorkspace();
        this.switchPatientTab('patient-dashboard');
      }
    });
  }

  startRecording() {
    let stream = null;
    if (this.useCamera) {
      const videoElement = document.getElementById('webcam-video');
      if (videoElement && videoElement.srcObject) {
        stream = videoElement.srcObject;
      }
    } else {
      const canvasElement = document.getElementById('overlay-canvas');
      if (canvasElement && canvasElement.captureStream) {
        stream = canvasElement.captureStream(30);
      }
    }
    
    if (!stream) return;
    this.recordedChunks = [];
    try {
      // Fallback mimeTypes to support Safari/iOS and Android/Chrome
      try {
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      } catch (e1) {
        try {
          this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/mp4' });
        } catch (e2) {
          this.mediaRecorder = new MediaRecorder(stream);
        }
      }
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.recordedChunks.push(e.data);
      };
      this.mediaRecorder.start();
      console.log("Session recording started.");
    } catch (err) {
      console.error("MediaRecorder start failed", err);
    }
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          const mimeType = this.mediaRecorder.mimeType || 'video/webm';
          const blob = new Blob(this.recordedChunks, { type: mimeType });
          resolve(blob);
        };
        this.mediaRecorder.stop();
        console.log("Session recording stopped.");
      } else {
        resolve(null);
      }
    });
  }

  uploadVideoToFirebase(blob, logId) {
    if (!firebase.storage) {
      console.warn("Firebase Storage is not initialized.");
      return Promise.resolve(null);
    }
    const storageRef = firebase.storage().ref();
    const videoRef = storageRef.child(`session_videos/${logId}.webm`);
    return videoRef.put(blob)
      .then(snapshot => snapshot.ref.getDownloadURL())
      .catch(err => {
        console.error("Firebase Storage upload failed", err);
        return null;
      });
  }

  playVideo(videoUrl) {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('playback-video-player');
    if (modal && player) {
      player.src = videoUrl;
      modal.style.display = 'flex';
      player.play();
    }
  }

  closeVideoModal() {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('playback-video-player');
    if (modal && player) {
      player.pause();
      player.src = '';
      modal.style.display = 'none';
    }
  }

  recalculatePatientComplianceLocal() {
    const pLogs = this.workoutLogs.filter(w => w.patientId === this.activePatientId);
    if (pLogs.length === 0) return;
    
    // Average accuracy weighted by prescription compliance
    const sumAccuracy = pLogs.reduce((acc, curr) => acc + curr.avgAccuracy, 0);
    const rawCompliance = Math.round(sumAccuracy / pLogs.length);
    
    // Set struggles flag
    let mainStruggle = 'none';
    const valgusCount = pLogs.filter(w => w.formFlags.includes('knee_valgus')).length;
    const speedCount = pLogs.filter(w => w.formFlags.includes('fast_eccentric')).length;
    const romCount = pLogs.filter(w => w.formFlags.includes('incomplete_rom')).length;
    
    if (valgusCount >= speedCount && valgusCount >= romCount && valgusCount > 0) mainStruggle = 'knee_valgus';
    else if (speedCount >= valgusCount && speedCount >= romCount && speedCount > 0) mainStruggle = 'fast_eccentric';
    else if (romCount >= valgusCount && romCount >= speedCount && romCount > 0) mainStruggle = 'incomplete_rom';

    const index = this.patients.findIndex(p => p.id === this.activePatientId);
    if (index !== -1) {
      this.patients[index].compliance = rawCompliance;
      this.patients[index].struggles = mainStruggle;
    }
  }

  recalculatePatientComplianceCloud() {
    const pLogs = this.workoutLogs.filter(w => w.patientId === this.activePatientId);
    if (pLogs.length === 0) return;
    
    const sumAccuracy = pLogs.reduce((acc, curr) => acc + curr.avgAccuracy, 0);
    const rawCompliance = Math.round(sumAccuracy / pLogs.length);
    
    let mainStruggle = 'none';
    const valgusCount = pLogs.filter(w => w.formFlags.includes('knee_valgus')).length;
    const speedCount = pLogs.filter(w => w.formFlags.includes('fast_eccentric')).length;
    const romCount = pLogs.filter(w => w.formFlags.includes('incomplete_rom')).length;
    
    if (valgusCount >= speedCount && valgusCount >= romCount && valgusCount > 0) mainStruggle = 'knee_valgus';
    else if (speedCount >= valgusCount && speedCount >= romCount && speedCount > 0) mainStruggle = 'fast_eccentric';
    else if (romCount >= valgusCount && romCount >= speedCount && romCount > 0) mainStruggle = 'incomplete_rom';

    this.firestore.collection('patients').doc(this.activePatientId).update({
      compliance: rawCompliance,
      struggles: mainStruggle
    });
  }

  // ==========================================================================
  // Clinician / Doctor Portal Dashboard Logic
  // ==========================================================================

  renderDoctorRoster() {
    const tbody = document.getElementById('doctor-roster-tbody');
    tbody.innerHTML = '';
    
    if (this.patients.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="no-data-msg">No active patients registered.</td></tr>`;
      return;
    }

    this.patients.forEach(p => {
      const pLogs = this.workoutLogs.filter(w => w.patientId === p.id);
      const lastActive = pLogs.length > 0 
        ? new Date(Math.max(...pLogs.map(w => new Date(w.timestamp)))).toLocaleDateString()
        : 'Never';
        
      // Compliance color pills
      let compClass = 'stable';
      if (p.compliance < 70) compClass = 'struggling';
      else if (p.compliance < 85) compClass = 'normal';
      
      // Struggle text labels
      let struggleBadge = '<span class="badge-status stable">Normal Recovery</span>';
      if (p.struggles === 'knee_valgus') struggleBadge = '<span class="badge-status struggling">⚠️ Knee Valgus Risks</span>';
      else if (p.struggles === 'fast_eccentric') struggleBadge = '<span class="badge-status normal">⚠️ Velocity Swing</span>';
      else if (p.struggles === 'incomplete_rom') struggleBadge = '<span class="badge-status struggling">⚠️ Low extension ROM</span>';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${p.name}</strong></td>
        <td>${p.condition}</td>
        <td><span class="badge-status ${compClass}">${p.compliance}%</span></td>
        <td>${pLogs.length} Sessions</td>
        <td>${pLogs.length > 0 ? Math.round(pLogs.reduce((a,c)=>a+c.avgAccuracy,0)/pLogs.length) : 0}%</td>
        <td>${lastActive}</td>
        <td>${struggleBadge}</td>
        <td><button class="btn btn-secondary-sm" onclick="app.viewPatientDetails('${p.id}')">Examine Profile</button></td>
      `;
      tbody.appendChild(row);
    });
  }

  viewPatientDetails(patientId) {
    this.activePatientId = patientId;
    document.getElementById('doctor-roster-view').style.display = 'none';
    document.getElementById('doctor-patient-detail-view').style.display = 'block';
    
    this.renderPatientDetailView();
  }

  closePatientDetails() {
    document.getElementById('doctor-roster-view').style.display = 'block';
    document.getElementById('doctor-patient-detail-view').style.display = 'none';
    this.renderDoctorRoster();
  }

  renderPatientDetailView() {
    const patient = this.patients.find(p => p.id === this.activePatientId);
    if (!patient) return;

    // Fill demographic metrics
    document.getElementById('detail-patient-name').innerText = patient.name;
    document.getElementById('detail-condition').innerText = patient.condition;
    document.getElementById('detail-age-gender').innerText = `${patient.age} / ${patient.gender === 'Female' ? 'F' : 'M'}`;
    document.getElementById('detail-join-date').innerText = patient.joinDate;
    document.getElementById('detail-compliance-val').innerText = `${patient.compliance}%`;

    // Populate historical workout table logs
    const pLogs = this.workoutLogs.filter(w => w.patientId === this.activePatientId)
      .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const tbody = document.getElementById('detail-workout-tbody');
    tbody.innerHTML = '';
    
    if (pLogs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="no-data-msg">No completed sessions recorded for this patient.</td></tr>`;
    } else {
      pLogs.forEach(w => {
        const tr = document.createElement('tr');
        const dStr = new Date(w.timestamp).toLocaleDateString() + ' ' + new Date(w.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        let flagsText = 'None';
        if (w.formFlags && w.formFlags.length > 0) {
          flagsText = w.formFlags.map(f => {
            if (f === 'knee_valgus') return 'Knee collapse (Valgus)';
            if (f === 'fast_eccentric') return 'Eccentric swing velocity';
            if (f === 'incomplete_rom') return 'Extension limit (Incomplete ROM)';
            return f;
          }).join(', ');
        }
        
        tr.innerHTML = `
          <td>${dStr}</td>
          <td><strong>${w.exercise}</strong></td>
          <td>${w.reps} / ${w.targetReps}</td>
          <td>${w.durationMins}m</td>
          <td>${w.avgAccuracy}%</td>
          <td class="${flagsText !== 'None' ? 'red-text' : 'green-text'}">${flagsText}</td>
          <td>
            ${w.videoUrl ? `<button class="btn btn-secondary-sm" onclick="app.playVideo('${w.videoUrl}')">View Recording</button>` : 'No Recording'}
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Populate Biomechanical Struggles List
    const strugglesBox = document.getElementById('detail-struggles-list');
    strugglesBox.innerHTML = '';
    
    if (patient.struggles === 'none' || !patient.struggles) {
      strugglesBox.innerHTML = `<p class="no-data-msg">No current bio-mechanical struggles identified. Normal recovery.</p>`;
    } else {
      const item = document.createElement('div');
      if (patient.struggles === 'knee_valgus') {
        item.className = 'struggle-item danger';
        item.innerHTML = `
          <div class="strug-icon">⚠️</div>
          <div class="strug-text">
            <h4>Knee Valgus (Collapse) Detected</h4>
            <p>During the loading phase of squats, the patient's knees collapse inward. This increases pressure on ACL reconstruction grafts. Push reminder to recommend foot stability bands.</p>
          </div>
        `;
      } else if (patient.struggles === 'fast_eccentric') {
        item.className = 'struggle-item warning';
        item.innerHTML = `
          <div class="strug-icon">⚠️</div>
          <div class="strug-text">
            <h4>Velocity swing (Too fast)</h4>
            <p>Patient performs eccentric bicep phases too rapidly, using weight inertia instead of muscular control. Advise a 3-second lowering tempo.</p>
          </div>
        `;
      } else if (patient.struggles === 'incomplete_rom') {
        item.className = 'struggle-item danger';
        item.innerHTML = `
          <div class="strug-icon">⚠️</div>
          <div class="strug-text">
            <h4>Incomplete Extension (Low ROM)</h4>
            <p>Patient fails to extend shoulder joint fully overhead, limiting active reach angles. Recommend lowering resistance weight to complete rotation angles.</p>
          </div>
        `;
      }
      strugglesBox.appendChild(item);
    }

    // Render Progress Trends Chart using Chart.js
    this.renderProgressChart(pLogs);
  }

  // Draw chart detailing recovery compliance over time
  renderProgressChart(logs) {
    const canvas = document.getElementById('patient-progress-chart');
    if (!canvas) return;

    if (this.progressChart) {
      this.progressChart.destroy();
    }

    if (logs.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0,0, canvas.width, canvas.height);
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Inter';
      ctx.textAlign = 'center';
      ctx.fillText("No session data to display chart.", canvas.width/2, canvas.height/2);
      return;
    }

    const labels = logs.map(w => new Date(w.timestamp).toLocaleDateString([], {month:'short', day:'numeric'}));
    const accuracyData = logs.map(w => w.avgAccuracy);
    const repsData = logs.map(w => w.reps);

    const ctx = canvas.getContext('2d');
    
    // Configure default chart configs
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = 'Inter';

    this.progressChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Accuracy Score (%)',
            data: accuracyData,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 3,
            fill: true,
            yAxisID: 'yAccuracy',
            tension: 0.3
          },
          {
            label: 'Repetitions Done',
            data: repsData,
            borderColor: '#d946ef',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            yAxisID: 'yReps',
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 15,
              padding: 15
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.03)' }
          },
          yAccuracy: {
            type: 'linear',
            position: 'left',
            min: 0,
            max: 100,
            title: { display: true, text: 'Accuracy Score (%)' },
            grid: { color: 'rgba(255,255,255,0.03)' }
          },
          yReps: {
            type: 'linear',
            position: 'right',
            min: 0,
            title: { display: true, text: 'Reps Done' },
            grid: { drawOnChartArea: false } // hide right side grids
          }
        }
      }
    });
  }

  // Doctor Form: Assign Prescription Task
  savePrescription(e) {
    e.preventDefault();
    const exercise = document.getElementById('presc-exercise').value;
    const reps = parseInt(document.getElementById('presc-reps').value);
    const sets = parseInt(document.getElementById('presc-sets').value);
    const frequency = document.getElementById('presc-freq').value;

    const newPresc = {
      id: 'presc_' + Date.now(),
      patientId: this.activePatientId,
      exercise: exercise,
      reps: reps,
      sets: sets,
      frequency: frequency
    };

    if (this.dbType === 'firebase') {
      this.firestore.collection('prescriptions').doc(newPresc.id).set(newPresc)
        .then(() => {
          alert("Prescription added and synced successfully!");
          document.getElementById('form-prescription').reset();
        })
        .catch(err => {
          alert("Error: " + err.message);
        });
    } else {
      this.prescriptions.push(newPresc);
      this.saveLocalData();
      alert("Prescription saved locally!");
      document.getElementById('form-prescription').reset();
      this.renderPatientDetailView();
    }
  }

  // Doctor Form: Push Clinical Alert Reminder
  saveReminder(e) {
    e.preventDefault();
    const message = document.getElementById('reminder-text').value;

    const newReminder = {
      id: 'rem_' + Date.now(),
      patientId: this.activePatientId,
      message: message,
      timestamp: new Date().toISOString(),
      critical: message.toLowerCase().includes('important') || message.toLowerCase().includes('alert') || message.toLowerCase().includes('caution')
    };

    if (this.dbType === 'firebase') {
      this.firestore.collection('reminders').doc(newReminder.id).set(newReminder)
        .then(() => {
          alert("Clinical reminder alert pushed and synced successfully!");
          document.getElementById('form-reminder').reset();
        })
        .catch(err => {
          alert("Error: " + err.message);
        });
    } else {
      this.reminders.push(newReminder);
      this.saveLocalData();
      alert("Reminder alert pushed locally!");
      document.getElementById('form-reminder').reset();
      this.renderPatientDetailView();
    }
  }

  // ==========================================================================
  // Connection Configuration Settings Logic
  // ==========================================================================

  toggleSettingsModal() {
    const modal = document.getElementById(this.selectors.settingsModal);
    if (!modal) return;
    
    if (modal.style.display === 'none') {
      modal.style.display = 'flex';
      // Load current selection
      const savedType = localStorage.getItem('rehab_ai_db_type') || 'local';
      document.querySelector(`input[name="db_connection_type"][value="${savedType}"]`).checked = true;
      this.switchDatabaseType(savedType);
    } else {
      modal.style.display = 'none';
      document.getElementById('firebase-connection-error').style.display = 'none';
    }
  }

  switchDatabaseType(type) {
    const configForm = document.getElementById('form-firebase-config');
    const localInfo = document.getElementById('settings-local-active');
    
    if (type === 'firebase') {
      configForm.style.display = 'block';
      localInfo.style.display = 'none';
    } else {
      configForm.style.display = 'none';
      localInfo.style.display = 'block';
    }
  }

  toggleDatabaseFormVisibility() {
    const configForm = document.getElementById('form-firebase-config');
    const localInfo = document.getElementById('settings-local-active');
    
    if (this.dbType === 'firebase') {
      configForm.style.display = 'block';
      localInfo.style.display = 'none';
    } else {
      configForm.style.display = 'none';
      localInfo.style.display = 'block';
    }
  }

  saveFirebaseConfig(e) {
    e.preventDefault();
    
    const config = {
      apiKey: document.getElementById('fb-apiKey').value,
      authDomain: document.getElementById('fb-authDomain').value,
      projectId: document.getElementById('fb-projectId').value,
      storageBucket: document.getElementById('fb-storageBucket').value,
      messagingSenderId: document.getElementById('fb-messagingSenderId').value,
      appId: document.getElementById('fb-appId').value
    };

    localStorage.setItem('rehab_ai_fb_config', JSON.stringify(config));
    localStorage.setItem('rehab_ai_db_type', 'firebase');
    this.firebaseConfig = config;
    this.dbType = 'firebase';
    
    document.getElementById('firebase-connection-error').style.display = 'none';
    
    // Initialise Firebase connection
    this.initFirebase();
    this.toggleSettingsModal();
    this.speak("Firebase connection credentials initialized. Syncing data.");
  }

  // ==========================================================================
  // Authentication & Session Management Logic
  // ==========================================================================

  populateLoginSelector() {
    // No-op: Profile selector dropdown is removed from login page
  }

  switchLoginRole(role) {
    this.loginRole = role;
    
    const tabPatient = document.getElementById('login-tab-patient');
    const tabDoctor = document.getElementById('login-tab-doctor');
    
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');
    
    // Clear inputs for manual typing
    if (emailInput) emailInput.value = '';
    if (passInput) passInput.value = '';
    
    if (role === 'doctor') {
      tabPatient.classList.remove('active');
      tabDoctor.classList.add('active');
      if (emailInput) emailInput.placeholder = 'doctor@rehabai.com';
    } else {
      tabPatient.classList.add('active');
      tabDoctor.classList.remove('active');
      if (emailInput) emailInput.placeholder = 'patient@rehabai.com';
    }
  }

  fillPatientCredentials(patientId) {
    // No-op: Profile selector dropdown is removed from login page
  }

  handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorBanner = document.getElementById('login-error-msg');
    
    errorBanner.style.display = 'none';
    
    if (this.dbType === 'firebase' && typeof firebase !== 'undefined' && firebase.auth) {
      // Firebase Auth Enabled
      firebase.auth().signInWithEmailAndPassword(email, password)
        .then(userCredential => {
          this.verifyAndRedirectUser(email);
        })
        .catch(err => {
          errorBanner.innerText = "Firebase Auth Error: " + err.message;
          errorBanner.style.display = 'block';
        });
    } else {
      // Local Mode Auth Check (Accept any credentials)
      this.isLoggedIn = true;
      if (this.loginRole === 'doctor') {
        this.currentRole = 'doctor';
        const docName = email.split('@')[0].split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        this.loggedInUser = { name: docName || "Clinician", role: "doctor" };
        this.loginSuccessRedirect();
      } else {
        this.currentRole = 'patient';
        let patient = this.patients.find(p => p.email === email);
        
        if (!patient) {
          // Dynamically create a new local patient profile
          const pId = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
          const pName = email.split('@')[0].split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          
          patient = {
            id: pId,
            name: pName || "New Patient",
            email: email,
            age: 30,
            gender: 'Male',
            condition: 'General Conditioning',
            joinDate: new Date().toLocaleDateString([], {day:'numeric', month:'short'}),
            compliance: 100,
            struggles: 'none'
          };
          
          this.patients.push(patient);
          
          // Seed default prescriptions for new user
          this.prescriptions.push(
            { id: 'p_' + pId + '_1', patientId: pId, exercise: 'Bicep Curl', reps: 10, sets: 3, frequency: 'Daily' },
            { id: 'p_' + pId + '_2', patientId: pId, exercise: 'Squat', reps: 10, sets: 3, frequency: 'Every other day' }
          );
          
          this.saveLocalData();
          this.setupRosterAndListeners();
        }
        
        this.activePatientId = patient.id;
        this.loggedInUser = patient;
        this.loginSuccessRedirect();
      }
    }
  }

  verifyAndRedirectUser(email) {
    this.isLoggedIn = true;
    
    if (this.loginRole === 'doctor') {
      this.currentRole = 'doctor';
      const docName = email.split('@')[0].split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      this.loggedInUser = { name: docName || "Clinician", role: "doctor" };
      this.loginSuccessRedirect();
    } else {
      this.currentRole = 'patient';
      const patient = this.patients.find(p => p.email === email);
      
      if (patient) {
        this.activePatientId = patient.id;
        this.loggedInUser = patient;
        this.loginSuccessRedirect();
      } else {
        // Dynamically write new patient document to Cloud Firestore
        const pId = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
        const pName = email.split('@')[0].split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        const newPatient = {
          id: pId,
          name: pName || "New Patient",
          email: email,
          age: 30,
          gender: 'Male',
          condition: 'General Conditioning',
          joinDate: new Date().toLocaleDateString([], {day:'numeric', month:'short'}),
          compliance: 100,
          struggles: 'none'
        };

        const batch = this.firestore.batch();
        batch.set(this.firestore.collection('patients').doc(pId), newPatient);
        batch.set(this.firestore.collection('prescriptions').doc('p_' + pId + '_1'), { id: 'p_' + pId + '_1', patientId: pId, exercise: 'Bicep Curl', reps: 10, sets: 3, frequency: 'Daily' });
        batch.set(this.firestore.collection('prescriptions').doc('p_' + pId + '_2'), { id: 'p_' + pId + '_2', patientId: pId, exercise: 'Squat', reps: 10, sets: 3, frequency: 'Every other day' });
        
        batch.commit()
          .then(() => {
            this.activePatientId = pId;
            this.loggedInUser = newPatient;
            this.loginSuccessRedirect();
          })
          .catch(err => {
            console.error("Error creating Firestore patient profile", err);
            // Fallback redirect
            this.activePatientId = this.patients[0]?.id || 'jane_doe';
            this.loggedInUser = this.patients[0] || { name: email, id: 'jane_doe' };
            this.loginSuccessRedirect();
          });
      }
    }
  }

  loginSuccessRedirect() {
    // Transition panels
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';
    
    const roleSelector = document.getElementById('header-role-selector');
    const sidebarPatientCard = document.getElementById('patient-active-card');
    
    if (this.currentRole === 'doctor') {
      if (roleSelector) roleSelector.style.display = 'flex';
      if (sidebarPatientCard) sidebarPatientCard.style.display = 'block';
      this.switchRole('doctor');
      this.speak("Clinician authenticated. Opening recovery roster.");
    } else {
      // Patients cannot change roles or switch active profile dropdowns
      if (roleSelector) roleSelector.style.display = 'none';
      if (sidebarPatientCard) sidebarPatientCard.style.display = 'none';
      this.switchRole('patient');
      this.switchPatientTab('patient-dashboard');
      
      const welcomeName = this.loggedInUser ? this.loggedInUser.name : "Patient";
      this.speak(`Welcome back, ${welcomeName}. Displaying assigned rehabilitation routines.`);
    }
    
    // Clear forms
    document.getElementById('form-login').reset();
  }

  signOut() {
    this.isLoggedIn = false;
    this.loggedInUser = null;
    
    if (this.dbType === 'firebase' && typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().signOut().catch(err => console.error("Sign out error", err));
    }
    
    // Reset view visibility
    document.getElementById('app-shell').style.display = 'none';
    document.getElementById('login-container').style.display = 'flex';
    
    // Repopulate credentials in login dropdown
    this.populateLoginSelector();
    
    this.speak("Signed out securely.");
  }
}

// Global Instantiate Entry Point
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new RehabApp();
  app.init();
});
