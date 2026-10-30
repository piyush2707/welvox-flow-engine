
(() => {
  "use strict";

  const canvas = document.getElementById("canvas");
  const nodeLayer = document.getElementById("nodeLayer");
  const connections = document.getElementById("connections");
  const emptyState = document.getElementById("canvasEmpty");
  const properties = document.getElementById("propertiesContent");

  if (!canvas || !nodeLayer || !properties) return;

  const STORAGE_KEY = "welvox-flow-builder-v1";

  const defaults = {
    trigger: {
      title: "Workflow trigger",
      description: "Starts this workflow"
    },
    action: {
      title: "New action",
      description: "Configure the task to perform"
    },
    condition: {
      title: "Check condition",
      description: "Define a rule to evaluate"
    },
    output: {
      title: "Workflow output",
      description: "Return or finish the result"
    }
  };

  let nodes = [];
  let selectedId = null;
  let zoom = 100;
  let drag = null;

  const $ = (id) => document.getElementById(id);

  function makeId() {
    return "node-" + Date.now() + "-" +
      Math.floor(Math.random() * 100000);
  }

  function showToast(message) {
    const toast = $("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2400);
  }

  function getCanvasWidth() {
    return Math.max(canvas.scrollWidth, canvas.clientWidth);
  }

  function addNode(type) {
    const preset = defaults[type];
    if (!preset) return;

    const index = nodes.length;
    const width = getCanvasWidth();

    const node = {
      id: makeId(),
      type,
      title: preset.title,
      description: preset.description,
      x: Math.max(24, Math.round((width - 220) / 2)),
      y: 45 + index * 155
    };

    nodes.push(node);
    selectedId = node.id;

    render();
    showToast("Block added");
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
  }

  function render() {
    nodeLayer.replaceChildren();

    if (emptyState) {
      emptyState.style.display =
        nodes.length ? "none" : "";
    }

    nodes.forEach((node, index) => {
      const card = createElement("button", "flow-node");
      card.type = "button";
      card.style.left = node.x + "px";
      card.style.top = node.y + "px";
      card.dataset.id = node.id;
      card.classList.toggle(
        "selected",
        node.id === selectedId
      );

      const type = createElement(
        "span",
        "node-type",
        node.type.toUpperCase()
      );

      const title = createElement(
        "strong",
        "node-title",
        node.title
      );

      const description = createElement(
        "span",
        "node-description",
        node.description
      );

      card.append(type, title, description);

      card.addEventListener("click", () => {
        selectedId = node.id;
        render();
      });

      card.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;

        selectedId = node.id;

        drag = {
          id: node.id,
          startX: event.clientX,
          startY: event.clientY,
          originalX: node.x,
          originalY: node.y,
          moved: false
        };

        card.setPointerCapture(event.pointerId);
        renderProperties();
      });

      card.addEventListener("pointermove", (event) => {
        if (!drag || drag.id !== node.id) return;

        const dx = (event.clientX - drag.startX) /
          (zoom / 100);
        const dy = (event.clientY - drag.startY) /
          (zoom / 100);

        if (Math.abs(dx) + Math.abs(dy) > 3) {
          drag.moved = true;
        }

        if (!drag.moved) return;

        node.x = Math.max(0, drag.originalX + dx);
        node.y = Math.max(0, drag.originalY + dy);

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
  }

  function renderProperties() {
    properties.replaceChildren();

    const node = nodes.find(
      item => item.id === selectedId
    );

    if (!node) {
      properties.appendChild(
        createElement(
          "p",
          "property-empty",
          "Select a block to edit its settings."
        )
      );
      return;
    }

    const titleLabel = createElement(
      "label",
      "",
      "BLOCK NAME"
    );

    const titleInput = createElement("input");
    titleInput.type = "text";
    titleInput.value = node.title;
    titleInput.maxLength = 80;

    titleInput.addEventListener("input", () => {
      node.title = titleInput.value;
      updateNodeText(node);
      updateCanvasTitle();
    });

    const descriptionLabel = createElement(
      "label",
      "",
      "DESCRIPTION"
    );

    const descriptionInput = createElement("textarea");
    descriptionInput.value = node.description;
    descriptionInput.maxLength = 240;
    descriptionInput.rows = 4;

    descriptionInput.addEventListener("input", () => {
      node.description = descriptionInput.value;
      updateNodeText(node);
    });

    const deleteButton = createElement(
      "button",
      "delete-node",
      "Delete block"
    );
    deleteButton.type = "button";

    deleteButton.addEventListener("click", () => {
      nodes = nodes.filter(
        item => item.id !== selectedId
      );

      selectedId = null;
      render();
      showToast("Block deleted");
    });

    properties.append(
      titleLabel,
      titleInput,
      descriptionLabel,
      descriptionInput,
      deleteButton
    );
  }

  function updateNodeText(node) {
    const card = nodeLayer.querySelector(
      `[data-id="${node.id}"]`
    );

    if (!card) return;

    const title = card.querySelector(".node-title");
    const description = card.querySelector(
      ".node-description"
    );

    if (title) title.textContent = node.title;
    if (description) {
      description.textContent = node.description;
    }
  }

  function drawConnections() {
    if (!connections) return;

    connections.replaceChildren();

    const ns = "http://www.w3.org/2000/svg";

    nodes.slice(0, -1).forEach((node, index) => {
      const next = nodes[index + 1];

      const x1 = node.x + 105;
      const y1 = node.y + 88;
      const x2 = next.x + 105;
      const y2 = next.y;

      const path = document.createElementNS(
        ns,
        "path"
      );

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

    connections.setAttribute(
      "width",
      Math.max(canvas.scrollWidth, 570)
    );

    connections.setAttribute(
      "height",
      Math.max(canvas.scrollHeight, 800)
    );
  }

  function updateCanvasTitle() {
    const input = $("workflowName");
    const title = $("canvasTitle");

    if (input && title) {
      title.textContent =
        input.value.trim() || "Untitled workflow";
    }
  }

  function updateCount() {
    const count = $("blockCount");

    if (count) {
      count.textContent = nodes.length + " blocks";
    }
  }

  function saveWorkflow() {
    const input = $("workflowName");

    const workflow = {
      name: input ? input.value.trim() : "Untitled workflow",
      nodes,
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(workflow)
      );

      showToast("Workflow saved on this device");
    } catch (error) {
      showToast("Could not save workflow");
    }
  }

  function loadWorkflow() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const workflow = JSON.parse(saved);

      if (!workflow || !Array.isArray(workflow.nodes)) {
        return;
      }

      nodes = workflow.nodes.filter(node =>
        node &&
        typeof node.id === "string" &&
        defaults[node.type] &&
        Number.isFinite(node.x) &&
        Number.isFinite(node.y)
      );

      const input = $("workflowName");

      if (input && typeof workflow.name === "string") {
        input.value = workflow.name;
      }

      updateCanvasTitle();
    } catch (error) {
      nodes = [];
    }
  }

  function changeZoom(amount) {
    zoom = Math.min(150, Math.max(60, zoom + amount));

    canvas.style.zoom = zoom / 100;

    const label = $("zoomLabel");
    if (label) label.textContent = zoom + "%";
  }

  document.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => {
      addNode(button.dataset.add);
    });
  });

  if ($("firstBlockButton")) {
    $("firstBlockButton").addEventListener(
      "click",
      () => addNode("trigger")
    );
  }

  if ($("saveButton")) {
    $("saveButton").addEventListener(
      "click",
      saveWorkflow
    );
  }

  if ($("clearButton")) {
    $("clearButton").addEventListener("click", () => {
      if (!nodes.length) return;

      if (confirm("Clear all blocks from this workflow?")) {
        nodes = [];
        selectedId = null;
        render();
        showToast("Canvas cleared");
      }
    });
  }

  if ($("zoomIn")) {
    $("zoomIn").addEventListener(
      "click",
      () => changeZoom(10)
    );
  }

  if ($("zoomOut")) {
    $("zoomOut").addEventListener(
      "click",
      () => changeZoom(-10)
    );
  }

  if ($("workflowName")) {
    $("workflowName").addEventListener(
      "input",
      updateCanvasTitle
    );
  }

  loadWorkflow();
  render();
  updateCanvasTitle();
})();
