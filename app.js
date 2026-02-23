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

  setupOptionButtons();
  setupPreviewQuestions();
  setupPaywallDemo();
});
// ========== OPTION BUTTONS & PREVIEW ==========

function setupOptionButtons() {
  document.querySelectorAll(".option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.closest(".question-block");
      if (!group) return;

      // Clear previous selection in this group
      group.querySelectorAll(".option-btn").forEach((b) => {
        b.classList.remove("selected");
      });
      btn.classList.add("selected");

      const isCorrect = btn.getAttribute("data-correct") === "true";
      const feedback = group.querySelector(".feedback");
      if (!feedback) return;

      if (isCorrect) {
        feedback.textContent = "Correct ✅";
        feedback.classList.add("correct");
        feedback.classList.remove("incorrect");
      } else {
        feedback.textContent = "Not quite. Try again.";
        feedback.classList.add("incorrect");
        feedback.classList.remove("correct");

        const qText = group.querySelector("p")?.textContent || "Question";
        addRevisionItem("practice/test", qText);
      }
    });
  });
}

function setupPreviewQuestions() {
  // Preview Q2
  const btn = document.querySelector("[data-action='check-preview-q2']");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const block = btn.closest(".question-block");
    if (!block) return;
    const input = block.querySelector("input");
    const feedback = block.querySelector(".feedback");
    if (!input || !feedback) return;

    const value = (input.value || "").trim().replace(/\s+/g, "");
    if (value === "7/1" || value === "7") {
      feedback.textContent = "Correct ✅  7 = 7/1, so it is rational.";
      feedback.classList.add("correct");
      feedback.classList.remove("incorrect");
    } else {
      feedback.textContent = "Not exact. Think: 7 as p/q with q = 1.";
      feedback.classList.add("incorrect");
      feedback.classList.remove("correct");

      const qText = block.querySelector("p")?.textContent || "Question";
      addRevisionItem("preview", qText);
    }
  });
}

// ========== PAYWALL DEMO UNLOCK ==========

function setupPaywallDemo() {
  const demoBtn = document.getElementById("demoUnlockBtn");
  if (demoBtn) {
    demoBtn.addEventListener("click", () => {
      appState.unlocked = true;
      demoBtn.textContent = "Full chapter unlocked (demo)";
      demoBtn.disabled = true;

      const note = document.querySelector(
        "#paywall .note-strip"
      );
      if (note) {
        note.textContent =
          "Demo mode: Full chapter is unlocked for testing. Later, this will unlock only after real payment.";
      }

      // Jump to Teach full
      selectScreen("teach-full");
    });
  }

  const payBtn = document.getElementById("payNowBtn");
  if (payBtn) {
    payBtn.addEventListener("click", () => {
      alert(
        "Payment link will be added here. For now, use 'Mark as paid (demo)' to unlock the full chapter."
      );
    });
  }
}

// ========== PRACTICE CHECKS ==========

function markPracticeAttempt(correct, block) {
  appState.practiceTotal += 1;
  if (correct) appState.practiceCorrect += 1;

  if (!correct && block) {
    const qText = block.querySelector("p")?.textContent || "Practice question";
    addRevisionItem("practice", qText);
  }

  updateProgress();
}

function setupPracticeHandlers() {
  // Level 2, Q3
  const p21 = document.querySelector("[data-action='check-practice-2-1']");
  if (p21) {
    p21.addEventListener("click", () => {
      const block = p21.closest(".question-block");
      const input = block.querySelector("input");
      const feedback = block.querySelector(".feedback");
      const val = (input.value || "").trim().replace(/\s+/g, "");
      const correct = val === "7/8";
      feedback.textContent = correct
        ? "Correct ✅  Common denominator 8 → 6/8 + 1/8 = 7/8."
        : "Check again. Convert both fractions to denominator 8 first.";
      feedback.classList.toggle("correct", correct);
      feedback.classList.toggle("incorrect", !correct);
      markPracticeAttempt(correct, block);
    });
  }

  // Level 2, Q4
  const p22 = document.querySelector("[data-action='check-practice-2-2']");
  if (p22) {
    p22.addEventListener("click", () => {
      const block = p22.closest(".question-block");
      const input = block.querySelector("input");
      const feedback = block.querySelector(".feedback");
      const val = (input.value || "").trim().toLowerCase();
      const correct =
        val === "both" || val === "both." || val === "integer and rational";
      feedback.textContent = correct
        ? "Correct ✅  21/7 = 3, which is an integer and also a rational number."
        : "Think: 21/7 = 3. What type of number is 3?";
      feedback.classList.toggle("correct", correct);
      feedback.classList.toggle("incorrect", !correct);
      markPracticeAttempt(correct, block);
    });
  }

  // Level 3, Q5
  const p31 = document.querySelector("[data-action='check-practice-3-1']");
  if (p31) {
    p31.addEventListener("click", () => {
      const block = p31.closest(".question-block");
      const input = block.querySelector("input");
      const feedback = block.querySelector(".feedback");
      const val = (input.value || "").trim().replace(/\s+/g, "");
      // Tank 3/4 full, use 1/3 of 3/4 = 1/4 used, so 1/2 left
      const correct = val === "1/2" || val === "0.5";
      feedback.textContent = correct
        ? "Correct ✅  Used 1/3 of 3/4 = 1/4, so left = 3/4 − 1/4 = 1/2."
        : "Hint: First find 1/3 of 3/4, then subtract from 3/4.";
      feedback.classList.toggle("correct", correct);
      feedback.classList.toggle("incorrect", !correct);
      markPracticeAttempt(correct, block);
    });
  }
}

// ========== TEST LOGIC ==========

function setupTests() {
  // Test 1, Q2
  const t12 = document.querySelector("[data-action='check-test-1-2']");
  if (t12) {
    t12.addEventListener("click", () => {
      const block = t12.closest(".question-block");
      const input = block.querySelector("input");
      const feedback = block.querySelector(".feedback");
      const val = (input.value || "").trim().replace(/\s+/g, "");
      const correct = val === "-9/1" || val === "-9";
      feedback.textContent = correct
        ? "Correct ✅  −9 = −9/1."
        : "Try again. Think: p/q with q = 1.";
      feedback.classList.toggle("correct", correct);
      feedback.classList.toggle("incorrect", !correct);
      if (!block.dataset.scored) {
        if (correct) appState.tests[1].correct += 1;
        else addRevisionItem(
          "test 1",
          block.querySelector("p")?.textContent || "Test question"
        );
        block.dataset.scored = "true";
      }
    });
  }

  // Test 2, Q1
  const t21 = document.querySelector("[data-action='check-test-2-1']");
  if (t21) {
    t21.addEventListener("click", () => {
      const block = t21.closest(".question-block");
      const input = block.querySelector("input");
      const feedback = block.querySelector(".feedback");
      const val = (input.value || "").trim().replace(/\s+/g, "");
      // (-3/4) + (1/2) = (-3/4) + (2/4) = -1/4
      const correct = val === "-1/4";
      feedback.textContent = correct
        ? "Correct ✅  Common denominator 4 → −3/4 + 2/4 = −1/4."
        : "Check again. Make denominators equal to 4.";
      feedback.classList.toggle("correct", correct);
      feedback.classList.toggle("incorrect", !correct);
      if (!block.dataset.scored) {
        if (correct) appState.tests[2].correct += 1;
        else addRevisionItem(
          "test 2",
          block.querySelector("p")?.textContent || "Test question"
        );
        block.dataset.scored = "true";
      }
    });
  }

  // Test 3, Q1
  const t31 = document.querySelector("[data-action='check-test-3-1']");
  if (t31) {
    t31.addEventListener("click", () => {
      const block = t31.closest(".question-block");
      const input = block.querySelector("input");
      const feedback = block.querySelector(".feedback");
      const val = (input.value || "").trim().replace(/\s+/g, "");
      // One simple answer: (1/4 + 1/2) / 2 = 3/8
      const correct = val === "3/8";
      feedback.textContent = correct
        ? "Correct ✅  Midpoint: (1/4 + 1/2) ÷ 2 = 3/8."
        : "Hint: Take the average of 1/4 and 1/2.";
      feedback.classList.toggle("correct", correct);
      feedback.classList.toggle("incorrect", !correct);
      if (!block.dataset.scored) {
        if (correct) appState.tests[3].correct += 1;
        else addRevisionItem(
          "test 3",
          block.querySelector("p")?.textContent || "Test question"
        );
        block.dataset.scored = "true";
      }
    });
  }

  // Finish test buttons
  document.querySelectorAll("[data-action='finish-test']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const testId = btn.getAttribute("data-test-id");
      const testState = appState.tests[testId];
      if (!testState) return;

      // Multiple-choice questions already encoded via data-correct and option-btns
      const blocks = document.querySelectorAll(
        `.question-block[data-test-id="${testId}"]`
      );
      blocks.forEach((block) => {
        // Count correct from selected option buttons
        const selected = block.querySelector(".option-btn.selected");
        if (selected && selected.getAttribute("data-correct") === "true") {
          // We already counted correct via clicks for typed questions only,
          // so we add for MCQs here
          if (!block.dataset.scored) {
            testState.correct += 1;
            block.dataset.scored = "true";
          }
        } else if (!block.dataset.scored) {
          // Wrong or not answered
          const qText = block.querySelector("p")?.textContent || "Test question";
          addRevisionItem(`test ${testId}`, qText);
          block.dataset.scored = "true";
        }
      });

      testState.finished = true;

      const scoreEl = document.getElementById(`testScore${testId}`);
      if (scoreEl) {
        scoreEl.textContent = `Score: ${testState.correct}/${testState.total}`;
      }

      updateTestsSummary();
      updateProgress();
    });
  });
}

function updateTestsSummary() {
  const summary = document.getElementById("testsSummary");
  if (!summary) return;

  const parts = [];
  Object.entries(appState.tests).forEach(([id, t]) => {
    if (t.finished) {
      parts.push(`Test ${id}: ${t.correct}/${t.total}`);
    }
  });

  if (parts.length === 0) {
    summary.textContent = "Complete at least one test to see your summary.";
  } else {
    summary.textContent = parts.join(" · ");
  }
}
// ========== TEACH COMPLETION (SIMPLE) ==========

// Mark a Teach step as completed when student scrolls past it or clicks inside.
// For Version 1, we’ll count all 9 as completed once user visits Teach screen once.

function setupTeachCompletion() {
  const teachScreen = document.getElementById("teach-full");
  if (!teachScreen) return;

  // When the Teach screen becomes active for the first time, mark all 9 as completed.
  let marked = false;

  const observer = new MutationObserver(() => {
    const isActive = teachScreen.classList.contains("active");
    if (isActive && !marked) {
      appState.teachCompleted = 9;
      marked = true;
      updateProgress();
    }
  });

  observer.observe(teachScreen, {
    attributes: true,
    attributeFilter: ["class"]
  });
}

// ========== REWIRE DOMCONTENTLOADED TO INCLUDE PRACTICE & TESTS ==========

// Extend the existing DOMContentLoaded handler with practice, tests, teach completion.
document.addEventListener("DOMContentLoaded", () => {
  // The earlier listener already runs (navigation, preview, paywall).
  // Here we only attach extra handlers that depend on DOM elements.

  setupPracticeHandlers();
  setupTests();
  setupTeachCompletion();
});
