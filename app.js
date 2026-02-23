// ========== STATE ==========

const appState = {
  unlocked: false, // becomes true after real payment or demo unlock
  teachCompleted: 0,
  practiceCorrect: 0,
  practiceTotal: 0,
  tests: {
    1: { correct: 0, total: 3, finished: false },
    2: { correct: 0, total: 2, finished: false },
    3: { correct: 0, total: 2, finished: false }
  },
  revisionItems: [],
  revisionAttempts: 0,
  revisionCorrect: 0
};

// ========== HELPERS ==========

function selectScreen(screenId) {
  const screens = document.querySelectorAll(".screen");
  screens.forEach((s) => {
    s.classList.toggle("active", s.id === screenId);
  });

  const tabs = document.querySelectorAll(".step-tab");
  tabs.forEach((tab) => {
    tab.classList.toggle(
      "active",
      tab.getAttribute("data-screen-target") === screenId
    );
  });
}

function updateProgress() {
  // Simple progress: teach steps + tests finished
  const teachWeight = 60; // %
  const testsWeight = 40; // %

  const teachPart = (appState.teachCompleted / 9) * teachWeight;

  let finishedTests = 0;
  Object.values(appState.tests).forEach((t) => {
    if (t.finished) finishedTests += 1;
  });
  const testsPart = (finishedTests / 3) * testsWeight;

  const overall = Math.round(teachPart + testsPart);
  const bar = document.getElementById("overallProgress");
  const label = document.getElementById("overallProgressLabel");
  if (bar) bar.style.width = overall + "%";
  if (label) label.textContent = overall + "%";

  updateParentReport();
}

function addRevisionItem(source, questionText) {
  // Avoid duplicates by text
  if (appState.revisionItems.some((q) => q.text === questionText)) return;
  appState.revisionItems.push({ source, text: questionText });
  renderRevisionList();
}

function renderRevisionList() {
  const list = document.getElementById("revisionList");
  const emptyMsg = document.getElementById("revisionEmptyMessage");
  const progressText = document.getElementById("revisionProgress");
  if (!list || !emptyMsg || !progressText) return;

  list.innerHTML = "";

  if (appState.revisionItems.length === 0) {
    emptyMsg.style.display = "block";
  } else {
    emptyMsg.style.display = "none";
    appState.revisionItems.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "revision-item";
      div.innerHTML = `<strong>Q${index + 1} (${item.source}):</strong> ${
        item.text
      }`;
      list.appendChild(div);
    });
  }

  if (appState.revisionAttempts === 0) {
    progressText.textContent = "No revision attempts yet.";
  } else {
    const rate = Math.round(
      (appState.revisionCorrect / Math.max(1, appState.revisionAttempts)) * 100
    );
    progressText.textContent = `Revision accuracy: ${rate}% over ${appState.revisionAttempts} attempts.`;
  }
}

function updateParentReport() {
  const teachEl = document.getElementById("parentTeachSummary");
  const practiceEl = document.getElementById("parentPracticeSummary");
  const testsEl = document.getElementById("parentTestsSummary");
  const revisionEl = document.getElementById("parentRevisionSummary");
  const notesEl = document.getElementById("parentNotes");

  if (!teachEl || !practiceEl || !testsEl || !revisionEl || !notesEl) return;

  teachEl.textContent = `${appState.teachCompleted} / 9`;

  if (appState.practiceTotal === 0) {
    practiceEl.textContent = "Not started";
  } else {
    const rate = Math.round(
      (appState.practiceCorrect / Math.max(1, appState.practiceTotal)) * 100
    );
    practiceEl.textContent = `${appState.practiceCorrect}/${appState.practiceTotal} correct (${rate}%)`;
  }

  let finishedTests = 0;
  const scores = [];
  Object.entries(appState.tests).forEach(([id, t]) => {
    if (t.finished) {
      finishedTests += 1;
      scores.push(`Test ${id}: ${t.correct}/${t.total}`);
    }
  });

  if (finishedTests === 0) {
    testsEl.textContent = "No tests taken yet";
  } else {
    testsEl.textContent = scores.join(" · ");
  }

  if (appState.revisionItems.length === 0) {
    revisionEl.textContent = "No revision yet";
  } else {
    revisionEl.textContent = `${appState.revisionItems.length} question(s) in revision set`;
  }

  // Simple note logic
  if (finishedTests === 0) {
    notesEl.textContent =
      "Once tests are completed, this section will highlight strong topics and topics that need more revision.";
  } else if (appState.practiceCorrect / Math.max(1, appState.practiceTotal) > 0.7) {
    notesEl.textContent =
      "Strong basics. Keep revising word problems and number line questions to reach full confidence.";
  } else {
    notesEl.textContent =
      "Basics need more practice. Use the Practice ladder and Adaptive revision tabs before the next test.";
  }
}

// ========== EVENT WIRING ==========

document.addEventListener("DOMContentLoaded", () => {
  // Default screen
  selectScreen("landing");
  updateProgress();
  renderRevisionList();

  // Tab click navigation
  document.querySelectorAll("[data-screen-target]").forEach((el) => {
    el.addEventListener("click", () => {
      const target = el.getAttribute("data-screen-target");

      // If locked and user jumps ahead to full content, practice, tests, adaptive
      const lockedScreens = ["teach-full", "practice", "tests", "adaptive"];
      if (!appState.unlocked && lockedScreens.includes(target)) {
        selectScreen("paywall");
      } else {
        selectScreen(target);
      }
    });
  });

  // Parent button explicitly goes to parent report
  const parentBtn = document.querySelector(".parent-mode-btn");
  if (parentBtn) {
    parentBtn.addEventListener("click", () => {
      selectScreen("parent-report");
    });
  }

  // Hook all behaviour
  setupOptionButtons();
  setupPreviewQuestions();
  setupPaywallDemo();
  setupPracticeHandlers();
  setupTests();
  setupTeachCompletion();
});
