
(() => {
  "use strict";

  const STORAGE_KEY = "welvox-flow-engine-v1";
  const canvas = document.getElementById("canvas");
  const nodeLayer = document.getElementById("nodeLayer");
  const connections = document.getElementById("connections");
  const emptyState = document.getElementById("canvasEmpty");
  const properties = document.getElementById("propertiesContent");

  if (!canvas || !nodeLayer || !properties) return;

  const $ = id => document.getElementById(id);

  const presets = {
    trigger: ["Workflow trigger", "Starts this workflow"],
    action: ["New action", "Configure the task to perform"],
    condition: ["Check condition", "Define a rule to evaluate"],
    output: ["Workflow output", "Return or finish the result"]
  };

  let nodes = [];
  let selectedId = null;
  let workflowId = null;
  let createdAt = new Date().toISOString();
  let description = "Created with the visual workflow builder.";
  let zoom = 100;
  let drag = null;
  let toastTimer;

  function id() {
    return "wf-" + Date.now().toString(36) +
      Math.random().toString(36).slice(2, 7);
  }

  function toast(message) {
    const element = $("toast");
    if (!element) return;

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      () => element.classList.remove("show"),
      2500
    );
  }

  function readStore() {
    try {
      const data = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );

      return {
        workflows: Array.isArray(data.workflows)
          ? data.workflows : [],
        history: Array.isArray(data.history)
          ? data.history : []
      };
    } catch (error) {
      return { workflows: [], history: [] };
    }
  }

  function writeStore(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      toast("Could not save browser data.");
      return false;
    }
  }

  function loadExisting() {
    const params = new URLSearchParams(location.search);
    const requestedId = params.get("id");
    const store = readStore();

    if (!requestedId) return;

    const workflow = store.workflows.find(
      item => item.id === requestedId
    );

    if (!workflow || !Array.isArray(workflow.steps)) {
      toast("Workflow not found. Starting a new one.");
      return;
    }

    workflowId = workflow.id;
    createdAt = workflow.createdAt || createdAt;
    if (workflow.description) description = workflow.description;

    const nameInput = $("workflowName");
    if (nameInput) nameInput.value = workflow.name || "";

    nodes = workflow.steps.map((step, index) => ({
      id: step.id || id(),
      type: presets[step.nodeType] ? step.nodeType
        : presets[step.type] ? step.type : "action",
      title: step.title || "New step",
      description: step.detail || "",
      x: Number.isFinite(step.x) ? step.x : 170,
      y: Number.isFinite(step.y) ? step.y : 45 + index * 155
    }));
  }

  function create(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  }

  function addNode(type) {
    if (!presets[type]) return;

    const index = nodes.length;

    nodes.push({
      id: id(),
      type,
      title: presets[type][0],
      description: presets[type][1],
      x: Math.max(24, (canvas.clientWidth - 220) / 2),
      y: 45 + index * 155
    });

    selectedId = nodes[nodes.length - 1].id;
    render();
    toast("Block added");
  }

  function render() {
    nodeLayer.replaceChildren();

    if (emptyState) {
      emptyState.style.display = nodes.length ? "none" : "";
    }

    nodes.forEach(node => {
      const card = create("button", "flow-node");
      card.type = "button";
      card.style.touchAction = "none";
      card.dataset.id = node.id;
      card.style.left = node.x + "px";
      card.style.top = node.y + "px";
      card.classList.toggle("selected", node.id === selectedId);

      card.append(
        create("span", "node-type", node.type.toUpperCase()),
        create("strong", "node-title", node.title),
        create("span", "node-description", node.description)
      );

      card.addEventListener("click", () => {
        selectedId = node.id;
        render();
      });

      card.addEventListener("pointerdown", event => {
        if (event.button !== 0) return;

        selectedId = node.id;

        drag = {
          id: node.id,
          startX: event.clientX,
          startY: event.clientY,
          x: node.x,
          y: node.y,
          moved: false
        };

        card.setPointerCapture(event.pointerId);
        renderProperties();
      });

      card.addEventListener("pointermove", event => {
        if (!drag || drag.id !== node.id) return;

        const dx = (event.clientX - drag.startX) / (zoom / 100);
        const dy = (event.clientY - drag.startY) / (zoom / 100);

        if (Math.abs(dx) + Math.abs(dy) > 3) {
          drag.moved = true;
        }

        if (!drag.moved) return;

        node.x = Math.max(0, drag.x + dx);
        node.y = Math.max(0, drag.y + dy);

        card.style.left = node.x + "px";
        card.style.top = node.y + "px";
        drawConnections();
      });

      card.addEventListener("pointerup", () => {
        if (!drag || drag.id !== node.id) return;

        const moved = drag.moved;
        drag = null;

        if (moved) {
          render();
        } else {
          selectedId = node.id;
          render();
        }
      });

      card.addEventListener("pointercancel", () => {
        drag = null;
      });

      nodeLayer.appendChild(card);
    });

    renderProperties();
    drawConnections();
    updateCount();
    updateTitle();
  }

  function renderProperties() {
    properties.replaceChildren();

    const node = nodes.find(item => item.id === selectedId);

    if (!node) {
      properties.appendChild(
        create("p", "property-empty", "Select a block to edit its settings.")
      );
      return;
    }

    const titleLabel = create("label", "", "BLOCK NAME");
    const titleInput = create("input");
    titleInput.value = node.title;
    titleInput.maxLength = 100;

    titleInput.addEventListener("input", () => {
      node.title = titleInput.value;
      updateNode(node);
    });

    const descriptionLabel = create("label", "", "DESCRIPTION");
    const descriptionInput = create("textarea");
    descriptionInput.value = node.description;
    descriptionInput.maxLength = 500;
    descriptionInput.rows = 4;

    descriptionInput.addEventListener("input", () => {
      node.description = descriptionInput.value;
      updateNode(node);
    });

    const deleteButton = create("button", "delete-node", "Delete block");
    deleteButton.type = "button";

    deleteButton.addEventListener("click", () => {
      nodes = nodes.filter(item => item.id !== selectedId);
      selectedId = null;
      render();
      toast("Block deleted");
    });

    properties.append(
      titleLabel,
      titleInput,
      descriptionLabel,
      descriptionInput,
      deleteButton
    );
  }

  function updateNode(node) {
    const card = nodeLayer.querySelector(
      `[data-id="${node.id}"]`
    );

    if (!card) return;

    card.querySelector(".node-title").textContent = node.title;
    card.querySelector(".node-description").textContent =
      node.description;
  }

  function drawConnections() {
    if (!connections) return;

    connections.replaceChildren();

    const ns = "http://www.w3.org/2000/svg";

    nodes.slice(0, -1).forEach((node, index) => {
      const next = nodes[index + 1];

      const path = document.createElementNS(ns, "path");
      const x1 = node.x + 105;
      const y1 = node.y + 88;
      const x2 = next.x + 105;
      const y2 = next.y;
      const middle = (y1 + y2) / 2;

      path.setAttribute(
        "d",
        `M ${x1} ${y1} C ${x1} ${middle}, ${x2} ${middle}, ${x2} ${y2}`
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#c8ff00");
      path.setAttribute("stroke-width", "2");

      connections.appendChild(path);
    });

    connections.setAttribute("width", Math.max(canvas.scrollWidth, 570));
    connections.setAttribute("height", Math.max(canvas.scrollHeight, 800));
  }

  function updateTitle() {
    const input = $("workflowName");
    const title = $("canvasTitle");

    if (input && title) {
      title.textContent = input.value.trim() || "Untitled workflow";
    }
  }

  function updateCount() {
    const count = $("blockCount");
    if (count) count.textContent = nodes.length + " blocks";
  }

  function saveWorkflow() {
    const input = $("workflowName");
    const name = input ? input.value.trim() : "";

    if (!name) {
      toast("Enter a workflow name first.");
      if (input) input.focus();
      return;
    }

    if (!nodes.length) {
      toast("Add at least one block first.");
      return;
    }

    const store = readStore();

    const workflow = {
      id: workflowId || id(),
      name,
      description,
      steps: nodes.map(node => ({
        id: node.id,
        type: node.type === "condition" ? "action" : node.type,
        title: node.title,
        detail: node.description,
        nodeType: node.type,
        x: Math.round(node.x),
        y: Math.round(node.y)
      })),
      createdAt,
      updatedAt: new Date().toISOString()
    };

    workflowId = workflow.id;

    const index = store.workflows.findIndex(
      item => item.id === workflow.id
    );

    if (index >= 0) {
      store.workflows[index] = workflow;
    } else {
      store.workflows.unshift(workflow);
    }

    if (writeStore(store)) {
      toast("Saved to My workflows!");
    }
  }

  function changeZoom(amount) {
    zoom = Math.max(60, Math.min(150, zoom + amount));
    canvas.style.zoom = zoom / 100;

    const label = $("zoomLabel");
    if (label) label.textContent = zoom + "%";
  }

  document.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => addNode(button.dataset.add));
  });

  if ($("firstBlockButton")) {
    $("firstBlockButton").addEventListener("click", () => addNode("trigger"));
  }

  if ($("saveButton")) {
    $("saveButton").addEventListener("click", saveWorkflow);
  }

  if ($("clearButton")) {
    $("clearButton").addEventListener("click", () => {
      if (!nodes.length) return;

      if (confirm("Clear all blocks from this workflow?")) {
        nodes = [];
        selectedId = null;
        render();
        toast("Canvas cleared");
      }
    });
  }

  if ($("zoomIn")) {
    $("zoomIn").addEventListener("click", () => changeZoom(10));
  }

  if ($("zoomOut")) {
    $("zoomOut").addEventListener("click", () => changeZoom(-10));
  }

  if ($("workflowName")) {
    $("workflowName").addEventListener("input", updateTitle);
  }

  loadExisting();
  render();
  updateTitle();
})();
