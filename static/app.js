/* ═══════════════════════════════════════════════════════════════════════════
   FutureTrack – Application Logic
   ═══════════════════════════════════════════════════════════════════════════ */

const API_BASE = window.location.origin;

// ─── State ──────────────────────────────────────────────────────────────────
let currentStep = 1;
let totalSteps = 4;
let selectedStream = "Engineering";
let selectedInterests = [];
let cutoffData = null;
let apiConnected = false;

// ─── Interest Options ───────────────────────────────────────────────────────
const interestOptions = {
  Engineering: [
    "Computer Science", "Information Technology", "Electronics & Comm.",
    "Electrical Engineering", "Mechanical Engineering", "Civil Engineering",
    "Artificial Intelligence", "Data Science", "Cybersecurity",
    "Aerospace Engineering", "Biomedical Engineering", "Robotics"
  ],
  Medical: [
    "MBBS", "BDS", "BAMS (Ayurveda)", "BHMS (Homeopathy)",
    "B.Pharm (Pharmacy)", "Nursing", "Physiotherapy",
    "Veterinary Science", "Biotech", "Microbiology"
  ]
};

// ─── Initialize ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderInterestTags();
  setupNavbarScroll();
  checkApiStatus();
});

// ─── Auto-check API status ──────────────────────────────────────────────────
async function checkApiStatus() {
  try {
    const res = await fetch(`${API_BASE}/api-status`);
    const data = await res.json();
    if (data.connected) {
      apiConnected = true;
      document.getElementById("apiDot").classList.add("connected");
      document.getElementById("apiStatusText").textContent = "AI Connected";
    } else {
      document.getElementById("apiStatusText").textContent = "AI Not Connected";
    }
  } catch {
    document.getElementById("apiStatusText").textContent = "Server Offline";
  }
}

// ─── Navbar scroll effect ───────────────────────────────────────────────────
function setupNavbarScroll() {
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 50);
  });
}

// ─── Step Navigation ────────────────────────────────────────────────────────
function nextStep() {
  if (currentStep >= totalSteps) return;
  if (currentStep === 1 && !validateStep1()) return;
  if (currentStep === 2) calculateCutoff();

  currentStep++;
  updateStepUI();
}

function prevStep() {
  if (currentStep <= 1) return;
  currentStep--;
  updateStepUI();
}

function goToStep(step) {
  if (step > currentStep + 1) return;
  if (step === currentStep) return;
  currentStep = step;
  updateStepUI();
}

function updateStepUI() {
  // Update step pages
  document.querySelectorAll(".step-page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById("step" + currentStep);
  if (target) {
    target.classList.add("active");
    target.style.animation = "none";
    target.offsetHeight;
    target.style.animation = "";
  }

  // Update progress indicators
  document.querySelectorAll(".step-item").forEach(item => {
    const s = parseInt(item.dataset.step);
    item.classList.remove("active", "completed");
    if (s === currentStep) item.classList.add("active");
    else if (s < currentStep) item.classList.add("completed");
  });

  // Update progress line
  const lineWidth = ((currentStep - 1) / (totalSteps - 1)) * 100;
  document.getElementById("progressLine").style.width = Math.min(lineWidth, 100) + "%";

  // Scroll to top of form
  document.querySelector(".form-container").scrollIntoView({ behavior: "smooth", block: "center" });

  // Show cutoff preview on step 3
  if (currentStep === 3 && cutoffData) showCutoffGauge();
}

// ─── Validation ─────────────────────────────────────────────────────────────
function validateStep1() {
  const name = document.getElementById("studentName").value.trim();
  if (!name) {
    shakeInput("studentName");
    document.getElementById("studentName").focus();
    return false;
  }
  return true;
}

function shakeInput(id) {
  const el = document.getElementById(id);
  el.style.borderColor = "var(--accent-red)";
  el.style.animation = "none";
  el.offsetHeight;
  el.style.animation = "shake 0.5s";
  setTimeout(() => { el.style.borderColor = ""; el.style.animation = ""; }, 1000);
}

const shakeStyle = document.createElement("style");
shakeStyle.textContent = `@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }`;
document.head.appendChild(shakeStyle);

// ─── Stream Toggle ──────────────────────────────────────────────────────────
function setStream(btn) {
  selectedStream = btn.dataset.stream;
  document.querySelectorAll(".stream-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  const mathsCard = document.getElementById("mathsCard");
  const bioCard = document.getElementById("biologyCard");
  if (selectedStream === "Medical") {
    mathsCard.style.display = "none";
    bioCard.style.display = "block";
  } else {
    mathsCard.style.display = "block";
    bioCard.style.display = "none";
  }

  selectedInterests = [];
  renderInterestTags();
  previewCutoff();
}

// ─── Live Cutoff Preview (Tamil Nadu formula) ───────────────────────────────
function previewCutoff() {
  const maths = parseFloat(document.getElementById("mathsMark").value) || 0;
  const physics = parseFloat(document.getElementById("physicsMark").value) || 0;
  const chemistry = parseFloat(document.getElementById("chemistryMark").value) || 0;
  const biology = parseFloat(document.getElementById("biologyMark").value) || 0;

  let cutoff = 0;
  if (selectedStream === "Engineering") {
    cutoff = (maths / 2) + (physics / 4) + (chemistry / 4);
  } else {
    cutoff = (biology / 2) + (physics / 4) + (chemistry / 4);
  }
  document.getElementById("livePreview").textContent = cutoff.toFixed(2);
}

// ─── Cutoff Calculation (API Call) ──────────────────────────────────────────
async function calculateCutoff() {
  const maths = parseFloat(document.getElementById("mathsMark").value) || 0;
  const physics = parseFloat(document.getElementById("physicsMark").value) || 0;
  const chemistry = parseFloat(document.getElementById("chemistryMark").value) || 0;
  const biology = parseFloat(document.getElementById("biologyMark").value) || 0;

  try {
    const res = await fetch(`${API_BASE}/calculate-cutoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stream: selectedStream, maths, physics, chemistry, biology })
    });
    cutoffData = await res.json();
  } catch {
    // Fallback local calculation
    let cutoff = selectedStream === "Engineering"
      ? (maths / 2) + (physics / 4) + (chemistry / 4)
      : (biology / 2) + (physics / 4) + (chemistry / 4);

    cutoffData = {
      cutoff: Math.round(cutoff * 100) / 100,
      maxCutoff: 200,
      percentage: Math.round((cutoff / 200) * 100 * 100) / 100,
      tier: cutoff >= 195 ? "Excellent" : cutoff >= 185 ? "Very Good" :
            cutoff >= 170 ? "Good" : cutoff >= 150 ? "Above Average" :
            cutoff >= 120 ? "Average" : "Below Average",
      tierColor: cutoff >= 195 ? "#10b981" : cutoff >= 185 ? "#3b82f6" :
                 cutoff >= 170 ? "#8b5cf6" : cutoff >= 150 ? "#f59e0b" :
                 cutoff >= 120 ? "#f97316" : "#ef4444",
      message: "Calculated locally (server unavailable)",
      stream: selectedStream
    };
  }
}

// ─── Cutoff Gauge Animation ─────────────────────────────────────────────────
function showCutoffGauge() {
  if (!cutoffData) return;
  document.getElementById("cutoffPreview").style.display = "block";

  const numEl = document.getElementById("cutoffNumber");
  animateValue(numEl, 0, cutoffData.cutoff, 1200);

  const gauge = document.getElementById("gaugeFill");
  const circumference = 2 * Math.PI * 70;
  const pct = cutoffData.cutoff / cutoffData.maxCutoff;
  setTimeout(() => {
    gauge.style.strokeDashoffset = circumference * (1 - pct);
  }, 100);

  const tierEl = document.getElementById("cutoffTier");
  tierEl.style.background = cutoffData.tierColor + "20";
  tierEl.style.border = `1px solid ${cutoffData.tierColor}50`;
  tierEl.style.color = cutoffData.tierColor;
  tierEl.textContent = "⭐ " + cutoffData.tier;

  document.getElementById("cutoffMessage").textContent = cutoffData.message;
}

function animateValue(el, start, end, duration) {
  const range = end - start;
  const startTime = performance.now();
  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = (start + range * eased).toFixed(2);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ─── Interest Tags ──────────────────────────────────────────────────────────
function renderInterestTags() {
  const container = document.getElementById("interestTags");
  const options = interestOptions[selectedStream] || interestOptions.Engineering;
  container.innerHTML = options.map(opt => `
    <span class="interest-tag ${selectedInterests.includes(opt) ? 'selected' : ''}"
          onclick="toggleInterest(this, '${opt}')">
      ${opt}
    </span>
  `).join("");
}

function toggleInterest(el, interest) {
  const idx = selectedInterests.indexOf(interest);
  if (idx === -1) { selectedInterests.push(interest); el.classList.add("selected"); }
  else { selectedInterests.splice(idx, 1); el.classList.remove("selected"); }
}

// ─── Get AI Suggestions ─────────────────────────────────────────────────────
async function getSuggestions() {
  const district = document.getElementById("districtSelect").value;
  const additional = document.getElementById("additionalPrefs").value.trim();
  const errorBox = document.getElementById("stepError");

  if (!district) {
    errorBox.textContent = "Please select a district.";
    errorBox.classList.add("show");
    return;
  }

  if (!apiConnected) {
    errorBox.textContent = "AI is not connected. Please set GEMINI_API_KEY in server.py and restart the server.";
    errorBox.classList.add("show");
    return;
  }

  errorBox.classList.remove("show");

  currentStep = 4;
  updateStepUI();

  document.getElementById("loadingState").style.display = "block";
  document.getElementById("resultsContent").style.display = "none";
  document.getElementById("collegeGrid").innerHTML = "";
  document.getElementById("resultsActions").style.display = "none";

  const interest = selectedInterests.length > 0 ? selectedInterests.join(", ") : "General";

  const payload = {
    cutoff: cutoffData ? cutoffData.cutoff : 0,
    district,
    stream: selectedStream,
    interest: interest + (additional ? `, ${additional}` : ""),
    name: document.getElementById("studentName").value.trim() || "Student"
  };

  try {
    const res = await fetch(`${API_BASE}/suggest-colleges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    document.getElementById("loadingState").style.display = "none";

    if (!data.success) {
      showError("AI Error: " + (data.error || "Unknown error"));
      return;
    }

    if (data.colleges && data.colleges.length > 0) {
      renderCollegeCards(data.colleges);
    } else if (data.rawText) {
      renderRawText(data.rawText);
    } else {
      showError("No colleges found. Try adjusting your preferences.");
    }
  } catch {
    document.getElementById("loadingState").style.display = "none";
    showError("Could not connect to server. Make sure the Flask server is running on port 5000.");
  }
}

function showError(msg) {
  document.getElementById("resultsContent").style.display = "block";
  document.getElementById("resultsSubtitle").textContent = msg;
  document.getElementById("resultsActions").style.display = "flex";
}

// ─── Render College Cards ───────────────────────────────────────────────────
function renderCollegeCards(colleges) {
  document.getElementById("resultsContent").style.display = "block";
  document.getElementById("resultsActions").style.display = "flex";
  document.getElementById("resultsSubtitle").textContent =
    `Found ${colleges.length} colleges matching your profile`;

  const grid = document.getElementById("collegeGrid");
  grid.innerHTML = colleges.map((c, i) => `
    <div class="college-card" style="animation-delay: ${i * 0.08}s">
      <div class="college-card-header">
        <div>
          <div class="college-name">${escapeHtml(c.name)}</div>
          <div class="college-location">📍 ${escapeHtml(c.location || '')}</div>
        </div>
        ${c.rating ? `<div class="college-rating">⭐ ${parseFloat(c.rating).toFixed(1)}</div>` : ''}
      </div>
      <div class="college-course-tag">🎓 ${escapeHtml(c.course || '')}</div>
      <div class="college-details">
        <div class="college-detail">
          <div class="college-detail-label">Fees</div>
          <div class="college-detail-value">${escapeHtml(c.fees || 'N/A')}</div>
        </div>
        <div class="college-detail">
          <div class="college-detail-label">Placement</div>
          <div class="college-detail-value">${escapeHtml(c.placement || 'N/A')}</div>
        </div>
        <div class="college-detail">
          <div class="college-detail-label">Hostel</div>
          <div class="college-detail-value">${escapeHtml(c.hostel || 'N/A')}</div>
        </div>
      </div>
      ${c.reason ? `<div class="college-reason">💡 ${escapeHtml(c.reason)}</div>` : ''}
    </div>
  `).join("");

  setTimeout(() => grid.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
}

function renderRawText(text) {
  document.getElementById("resultsContent").style.display = "block";
  document.getElementById("resultsActions").style.display = "flex";
  const grid = document.getElementById("collegeGrid");
  grid.innerHTML = `
    <div class="college-card">
      <div class="college-name">AI Response</div>
      <div class="college-reason" style="margin-top:var(--space-md);white-space:pre-wrap;">${escapeHtml(text)}</div>
    </div>`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── PDF Download ───────────────────────────────────────────────────────────
function downloadPDF() {
  const studentName = document.getElementById("studentName").value.trim() || "Student";
  const cutoff = cutoffData ? cutoffData.cutoff : 0;
  const tier = cutoffData ? cutoffData.tier : "N/A";
  const stream = selectedStream;
  const district = document.getElementById("districtSelect").value || "N/A";

  // Build a clean HTML for PDF
  const collegeCards = document.getElementById("collegeGrid").innerHTML;

  const pdfHtml = `
    <div style="font-family: Arial, sans-serif; color: #1a1a2e; padding: 30px; max-width: 800px; margin: 0 auto;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #6c5ce7;">
        <h1 style="font-size: 32px; margin: 0; color: #6c5ce7;">🎓 FutureTrack</h1>
        <p style="font-size: 14px; color: #666; margin-top: 5px;">AI-Powered College Analyzer Report</p>
      </div>

      <!-- Student Info -->
      <div style="background: #f8f9ff; border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid #e0e0ff;">
        <h2 style="font-size: 18px; margin: 0 0 15px 0; color: #333;">Student Profile</h2>
        <table style="width: 100%; font-size: 14px;">
          <tr><td style="padding: 5px 0; color: #666; width: 140px;"><strong>Name:</strong></td><td>${escapeHtml(studentName)}</td></tr>
          <tr><td style="padding: 5px 0; color: #666;"><strong>Stream:</strong></td><td>${stream}</td></tr>
          <tr><td style="padding: 5px 0; color: #666;"><strong>Preferred District:</strong></td><td>${district}</td></tr>
          <tr><td style="padding: 5px 0; color: #666;"><strong>Interests:</strong></td><td>${selectedInterests.length > 0 ? selectedInterests.join(', ') : 'General'}</td></tr>
        </table>
      </div>

      <!-- Cutoff Score -->
      <div style="background: linear-gradient(135deg, #6c5ce7, #a29bfe); border-radius: 12px; padding: 25px; margin-bottom: 25px; text-align: center; color: white;">
        <h2 style="margin: 0 0 10px 0; font-size: 18px;">Cutoff Score</h2>
        <div style="font-size: 48px; font-weight: 800; margin: 10px 0;">${cutoff}<span style="font-size: 20px; opacity: 0.8;"> / 200</span></div>
        <div style="font-size: 16px; background: rgba(255,255,255,0.2); display: inline-block; padding: 5px 20px; border-radius: 20px;">⭐ ${tier}</div>
      </div>

      <!-- College Suggestions -->
      <h2 style="font-size: 20px; color: #333; margin-bottom: 15px;">🏫 Suggested Colleges</h2>
      <div id="pdfColleges">${buildPdfColleges()}</div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
        Generated by FutureTrack AI • ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  `;

  const pdfContainer = document.getElementById("pdfContent");
  pdfContainer.innerHTML = pdfHtml;
  pdfContainer.style.display = "block";

  const options = {
    margin: [10, 10, 10, 10],
    filename: `FutureTrack_${studentName.replace(/\s+/g, '_')}_Report.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  html2pdf().set(options).from(pdfContainer).save().then(() => {
    pdfContainer.style.display = "none";
    pdfContainer.innerHTML = "";
  });
}

function buildPdfColleges() {
  const cards = document.querySelectorAll("#collegeGrid .college-card");
  let html = "";
  cards.forEach((card, i) => {
    const name = card.querySelector(".college-name")?.textContent || "";
    const location = card.querySelector(".college-location")?.textContent || "";
    const course = card.querySelector(".college-course-tag")?.textContent || "";
    const details = card.querySelectorAll(".college-detail-value");
    const fees = details[0]?.textContent || "N/A";
    const placement = details[1]?.textContent || "N/A";
    const hostel = details[2]?.textContent || "N/A";
    const reason = card.querySelector(".college-reason")?.textContent || "";
    const rating = card.querySelector(".college-rating")?.textContent || "";

    html += `
      <div style="background: #f8f9ff; border-radius: 10px; padding: 18px; margin-bottom: 12px; border: 1px solid #e0e0ff; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <div style="font-size: 16px; font-weight: 700; color: #1a1a2e;">${i + 1}. ${escapeHtml(name)}</div>
            <div style="font-size: 12px; color: #666;">${escapeHtml(location)}</div>
          </div>
          ${rating ? `<div style="font-size: 13px; color: #e17055; font-weight: 600;">${escapeHtml(rating)}</div>` : ''}
        </div>
        <div style="font-size: 13px; color: #6c5ce7; font-weight: 500; margin-bottom: 10px;">${escapeHtml(course)}</div>
        <table style="width: 100%; font-size: 12px; margin-bottom: 10px;">
          <tr>
            <td style="padding: 4px 8px; background: #ede9ff; border-radius: 4px; text-align: center; width: 33%;"><strong>Fees:</strong> ${escapeHtml(fees)}</td>
            <td style="padding: 4px 8px; background: #ede9ff; border-radius: 4px; text-align: center; width: 33%;"><strong>Placement:</strong> ${escapeHtml(placement)}</td>
            <td style="padding: 4px 8px; background: #ede9ff; border-radius: 4px; text-align: center; width: 33%;"><strong>Hostel:</strong> ${escapeHtml(hostel)}</td>
          </tr>
        </table>
        ${reason ? `<div style="font-size: 12px; color: #555; border-left: 3px solid #6c5ce7; padding-left: 10px;">${escapeHtml(reason)}</div>` : ''}
      </div>`;
  });
  return html || '<p style="color: #999;">No colleges to display.</p>';
}

// ─── Escape key handler ─────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && currentStep > 1) prevStep();
});
