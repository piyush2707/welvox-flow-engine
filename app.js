
"use strict";

/* WELVOX FLOW ENGINE — V0.1.0 */

const STORAGE_KEY = "welvox-flow-engine-v1";

const sidebar = document.getElementById("sidebar");
const menuButton = document.getElementById("menuButton");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const toastElement = document.getElementById("toast");

let workflows = [];
let history = [];
let currentDraft = null;
let toastTimer = null;

const templates = {
  content: {
    name: "Content pipeline",
    description: "A structured process for planning and reviewing content.",
    steps: [
      { type: "trigger", title: "Content idea received", detail: "Start when a new content idea is submitted." },
      { type: "action", title: "Organize the brief", detail: "Collect the topic, audience and key points." },
      { type: "action", title: "Review content", detail: "Check clarity, accuracy and completeness." },
      { type: "output", title: "Prepare for publishing", detail: "Mark the content as ready for the next stage." }
    ]
  },
  support: {
    name: "Support triage",
    description: "Organize incoming support requests and prepare follow-up.",
    steps: [
      { type: "trigger", title: "New request received", detail: "A support request enters the workflow." },
      { type: "action", title: "Review request", detail: "Read the request and identify its main topic." },
      { type: "action", title: "Set priority", detail: "Assign a priority based on urgency." },
      { type: "output", title: "Prepare follow-up", detail: "Record the next action for the support team." }
    ]
  },
  research: {
    name: "Research brief",
    description: "Turn a research question into a structured review process.",
    steps: [
      { type: "trigger", title: "Research question added", detail: "Begin with a clear research question." },
      { type: "action", title: "Collect sources", detail: "Gather relevant information and references." },
      { type: "action", title: "Review findings", detail: "Compare findings and identify key themes." },
      { type: "output", title: "Prepare research brief", detail: "Organize the findings into a concise brief." }
    ]
  },
  daily: {
    name: "Daily review",
    description: "A repeatable structure for reviewing daily work.",
    steps: [
      { type: "trigger", title: "Start daily review", detail: "Begin the daily review process." },
      { type: "action", title: "Collect open tasks", detail: "List the tasks that still need attention." },
      { type: "action", title: "Review progress", detail: "Check completed work and current blockers." },
      { type: "output", title: "Create daily summary", detail: "Record priorities and next steps." }
    ]
  }
};

/* ------------------------------
   GENERAL HELPERS
------------------------------ */

function makeId() {
  return "wf-" + Date.now().toString(36) + "-" +
    Math.random().toString(36).slice(2, 7);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (character) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character];
  });
}

function showToast(message) {
  toastElement.textContent = message;
  toastElement.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toastElement.classList.remove("show");
  }, 2600);
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    workflows = Array.isArray(saved.workflows) ? saved.workflows : [];
    history = Array.isArray(saved.history) ? saved.history : [];
  } catch (error) {
    workflows = [];
    history = [];
    showToast("Saved data could not be read. A fresh workspace is ready.");
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      workflows: workflows,
      history: history
    }));
    return true;
  } catch (error) {
    showToast("Browser storage is full or unavailable.");
    return false;
  }
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function makeStep(type, title, detail) {
  return {
    id: makeId(),
    type: type || "action",
    title: title || "New step",
    detail: detail || ""
  };
}

/* ------------------------------
   NAVIGATION
------------------------------ */

function openSidebar() {
  sidebar.classList.add("open");
  sidebarBackdrop.classList.add("active");
  document.body.classList.add("menu-open");
  menuButton.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarBackdrop.classList.remove("active");
  document.body.classList.remove("menu-open");
  menuButton.setAttribute("aria-expanded", "false");
}

menuButton.addEventListener("click", function () {
  if (sidebar.classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

sidebarBackdrop.addEventListener("click", closeSidebar);

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeSidebar();
  }
});

function setView(viewName) {
  const target = document.getElementById("view-" + viewName);
  if (!target) return;

  document.querySelectorAll(".view").forEach(function (view) {
    view.classList.remove("active");
  });

  target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(function (item) {
    item.classList.toggle("active", item.dataset.view === viewName);
  });

  const labels = {
    dashboard: "Overview",
    workflows: "My workflows",
    templates: "Templates",
    activity: "Execution history",
    builder: "Workflow editor"
  };

  document.getElementById("breadcrumbCurrent").textContent =
    labels[viewName] || "Workspace";

  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (viewName === "workflows") renderWorkflows();
  if (viewName === "activity") renderActivity();
  if (viewName === "dashboard") renderDashboard();
}

document.addEventListener("click", function (event) {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    event.preventDefault();
    setView(viewButton.dataset.view);
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    const action = actionButton.dataset.action;

    if (action === "new-workflow") {
      createNewWorkflow();
    }
  }
});

/* ------------------------------
   WORKFLOW BUILDER
------------------------------ */

function createNewWorkflow() {
  currentDraft = {
    id: makeId(),
    name: "Untitled workflow",
    description: "",
    steps: [
      makeStep("trigger", "Workflow started", "Define what starts this workflow."),
      makeStep("action", "First action", "Describe the action to perform.")
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  openBuilder();
}

function createFromTemplate(templateKey) {
  const template = templates[templateKey];
  if (!template) return;

  currentDraft = {
    id: makeId(),
    name: template.name,
    description: template.description,
    steps: template.steps.map(function (step) {
      return makeStep(step.type, step.title, step.detail);
    }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  openBuilder();
  showToast("Template loaded. Customize your workflow.");
}

function openBuilder() {
  if (!currentDraft) return;

  document.getElementById("workflowName").value = currentDraft.name;
  document.getElementById("workflowDescription").value = currentDraft.description;
  document.getElementById("builderTitle").textContent = currentDraft.name;
  document.getElementById("builderStatus").textContent = "Draft";

  renderSteps();
  setView("builder");
}

function updateDraftFields() {
  if (!currentDraft) return;

  currentDraft.name = document.getElementById("workflowName").value;
  currentDraft.description = document.getElementById("workflowDescription").value;
  document.getElementById("builderTitle").textContent =
    currentDraft.name.trim() || "Untitled workflow";
}

document.getElementById("workflowName").addEventListener("input", updateDraftFields);
document.getElementById("workflowDescription").addEventListener("input", updateDraftFields);

function renderSteps() {
  const container = document.getElementById("stepList");

  if (!currentDraft || currentDraft.steps.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><strong>No steps yet.</strong><p>Add a step to start building your workflow.</p></div>';
    return;
  }

  container.innerHTML = currentDraft.steps.map(function (step, index) {
    return `
      <article class="step-card" data-step-id="${escapeHTML(step.id)}">
        <div class="step-card-top">
          <span class="step-number">STEP ${index + 1}</span>
          <button class="step-remove" type="button" data-remove-step="${escapeHTML(step.id)}">Remove ×</button>
        </div>

        <label>STEP TYPE</label>
        <select data-step-field="type">
          <option value="trigger" ${step.type === "trigger" ? "selected" : ""}>Trigger</option>
          <option value="action" ${step.type === "action" ? "selected" : ""}>Action</option>
          <option value="output" ${step.type === "output" ? "selected" : ""}>Output</option>
        </select>

        <label>STEP NAME</label>
        <input data-step-field="title" maxlength="100"
          value="${escapeHTML(step.title)}" placeholder="Name this step">

        <label>WHAT HAPPENS?</label>
        <textarea data-step-field="detail" maxlength="500"
          placeholder="Describe what this step does...">${escapeHTML(step.detail)}</textarea>
      </article>
    `;
  }).join("");
}

document.getElementById("stepList").addEventListener("input", updateStepFromEvent);
document.getElementById("stepList").addEventListener("change", updateStepFromEvent);

function updateStepFromEvent(event) {
  const field = event.target.dataset.stepField;
  if (!field || !currentDraft) return;

  const card = event.target.closest("[data-step-id]");
  if (!card) return;

  const step = currentDraft.steps.find(function (item) {
    return item.id === card.dataset.stepId;
  });

  if (!step) return;

  step[field] = event.target.value;
}

document.getElementById("stepList").addEventListener("click", function (event) {
  const removeButton = event.target.closest("[data-remove-step]");
  if (!removeButton || !currentDraft) return;

  currentDraft.steps = currentDraft.steps.filter(function (step) {
    return step.id !== removeButton.dataset.removeStep;
  });

  renderSteps();
  showToast("Step removed.");
});

function addStep() {
  if (!currentDraft) return;

  currentDraft.steps.push(
    makeStep("action", "New action", "Describe what this step should do.")
  );

  renderSteps();
  showToast("New step added.");
}

document.getElementById("addStepButton").addEventListener("click", addStep);
document.getElementById("addStepBottom").addEventListener("click", addStep);

/* ------------------------------
   SAVE AND OPEN WORKFLOWS
------------------------------ */

function saveCurrentWorkflow() {
  if (!currentDraft) return;

  updateDraftFields();

  const name = currentDraft.name.trim();
  if (!name) {
    showToast("Please enter a workflow name.");
    document.getElementById("workflowName").focus();
    return;
  }

  if (currentDraft.steps.length === 0) {
    showToast("Add at least one step before saving.");
    return;
  }

  const existingIndex = workflows.findIndex(function (workflow) {
    return workflow.id === currentDraft.id;
  });

  currentDraft.name = name;
  currentDraft.updatedAt = new Date().toISOString();

  if (existingIndex >= 0) {
    workflows[existingIndex] = currentDraft;
  } else {
    workflows.unshift(currentDraft);
  }

  if (!saveData()) return;

  document.getElementById("builderStatus").textContent = "Saved";
  renderDashboard();
  showToast("Workflow saved in this browser.");
}

document.getElementById("saveWorkflowButton").addEventListener("click", saveCurrentWorkflow);

function openWorkflow(workflowId) {
  const workflow = workflows.find(function (item) {
    return item.id === workflowId;
  });

  if (!workflow) {
    showToast("Workflow not found.");
    return;
  }

  currentDraft = JSON.parse(JSON.stringify(workflow));
  openBuilder();
}

function deleteWorkflow(workflowId) {
  const workflow = workflows.find(function (item) {
    return item.id === workflowId;
  });

  if (!workflow) return;

  if (!confirm('Delete "' + workflow.name + '"? This cannot be undone.')) return;

  workflows = workflows.filter(function (item) {
    return item.id !== workflowId;
  });

  saveData();
  renderWorkflows();
  renderDashboard();
  showToast("Workflow deleted.");
}

/* ------------------------------
   WORKFLOW PREVIEW RUNNER
------------------------------ */

function runCurrentWorkflow() {
  if (!currentDraft) return;

  updateDraftFields();

  const missing = currentDraft.steps.filter(function (step) {
    return !step.title.trim();
  });

  if (!currentDraft.name.trim()) {
    showToast("Give your workflow a name first.");
    return;
  }

  if (currentDraft.steps.length === 0 || missing.length > 0) {
    showToast("Add at least one complete step before running.");
    return;
  }

  const record = {
    id: makeId(),
    workflowId: currentDraft.id,
    workflowName: currentDraft.name,
    status: "Preview completed",
    stepCount: currentDraft.steps.length,
    date: new Date().toISOString(),
    details: currentDraft.steps.map(function (step) {
      return {
        title: step.title,
        type: step.type
      };
    })
  };

  history.unshift(record);

  if (history.length > 100) {
    history = history.slice(0, 100);
  }

  saveData();
  renderDashboard();

  showToast("Preview completed. No external actions were executed.");
}

document.getElementById("runWorkflowButton").addEventListener("click", runCurrentWorkflow);

/* ------------------------------
   RENDER WORKFLOW LISTS
------------------------------ */

function workflowRowHTML(workflow) {
  return `
    <article class="workflow-row">
      <div class="workflow-row-main">
        <strong>${escapeHTML(workflow.name)}</strong>
        <p>${escapeHTML(workflow.description || "No description")}</p>
        <p>${workflow.steps.length} steps · Updated ${escapeHTML(formatDate(workflow.updatedAt))}</p>
      </div>
      <div class="workflow-row-actions">
        <button class="small-button" data-open-workflow="${escapeHTML(workflow.id)}">Edit</button>
        <button class="small-button danger" data-delete-workflow="${escapeHTML(workflow.id)}">Delete</button>
      </div>
    </article>
  `;
}

function renderWorkflows() {
  const searchInput = document.getElementById("workflowSearch");
  const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

  const filtered = workflows.filter(function (workflow) {
    return workflow.name.toLowerCase().includes(query) ||
      (workflow.description || "").toLowerCase().includes(query);
  });

  document.getElementById("workflowCount").textContent =
    filtered.length + (filtered.length === 1 ? " workflow" : " workflows");

  const container = document.getElementById("workflowList");

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">◇</span>
        <strong>${query ? "No matching workflows." : "Your workspace is ready."}</strong>
        <p>${query ? "Try a different search." : "Create a workflow or start with a template."}</p>
        ${query ? "" : '<button class="primary-button" data-action="new-workflow">Create your first workflow</button>'}
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(workflowRowHTML).join("");
}

document.getElementById("workflowSearch").addEventListener("input", renderWorkflows);

document.addEventListener("click", function (event) {
  const openButton = event.target.closest("[data-open-workflow]");
  if (openButton) {
    openWorkflow(openButton.dataset.openWorkflow);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-workflow]");
  if (deleteButton) {
    deleteWorkflow(deleteButton.dataset.deleteWorkflow);
    return;
  }
});

/* ------------------------------
   TEMPLATES
------------------------------ */

document.getElementById("templateGrid").addEventListener("click", function (event) {
  const card = event.target.closest("[data-template]");
  if (!card) return;

  createFromTemplate(card.dataset.template);
});

/* ------------------------------
   EXECUTION HISTORY
------------------------------ */

function renderActivity() {
  const container = document.getElementById("activityList");

  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">◷</span>
        <strong>No execution records yet.</strong>
        <p>Open a workflow and choose Run preview to record a test run.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = history.map(function (record) {
    return `
      <article class="workflow-row">
        <div class="workflow-row-main">
          <strong>${escapeHTML(record.workflowName)}</strong>
          <p>${escapeHTML(record.status)} · ${record.stepCount} steps</p>
          <p>${escapeHTML(formatDate(record.date))}</p>
        </div>
        <span class="small-button">${escapeHTML(record.status)}</span>
      </article>
    `;
  }).join("");
}

/* ------------------------------
   DASHBOARD
------------------------------ */

function renderDashboard() {
  document.getElementById("statWorkflows").textContent = workflows.length;
  document.getElementById("statExecutions").textContent = history.length;

  const recent = document.getElementById("recentWorkflows");

  if (workflows.length === 0) {
    recent.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">⌁</span>
        <strong>Your next workflow starts here.</strong>
        <p>Workflows you create will appear in this space.</p>
      </div>
    `;
    return;
  }

  recent.innerHTML = workflows.slice(0, 3).map(workflowRowHTML).join("");
}

/* ------------------------------
   DASHBOARD ACTIONS
------------------------------ */

document.getElementById("generateButton").addEventListener("click", function () {
  const prompt = document.getElementById("promptInput").value.trim();
  const message = document.getElementById("promptMessage");

  if (!prompt) {
    message.textContent = "Describe your workflow idea first.";
    document.getElementById("promptInput").focus();
    return;
  }

  currentDraft = {
    id: makeId(),
    name: prompt.length > 55 ? prompt.slice(0, 52) + "..." : prompt,
    description: prompt,
    steps: [
      makeStep("trigger", "Start workflow", "Define when this process begins."),
      makeStep("action", "Review the request", "Review the information provided: " + prompt),
      makeStep("output", "Record the result", "Describe the expected result of this workflow.")
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  message.textContent = "A starter workflow draft is ready. Review and customize its steps.";
  openBuilder();
});

document.getElementById("profileButton").addEventListener("click", function () {
  showToast("Welvox Flow Engine · Local browser workspace · V0.1.0");
});

/* ------------------------------
   START APPLICATION
------------------------------ */

loadData();
renderDashboard();
renderWorkflows();
renderActivity();
closeSidebar();
setView("dashboard");
