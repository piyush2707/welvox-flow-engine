
const menuButton = document.getElementById("menuButton");
const sidebar = document.getElementById("sidebar");
const promptInput = document.getElementById("promptInput");
const promptMessage = document.getElementById("promptMessage");

menuButton.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

function showMessage(message) {
  promptMessage.textContent = message;
}

document.getElementById("generateButton").addEventListener("click", () => {
  const prompt = promptInput.value.trim();

  if (!prompt) {
    showMessage("Describe what you want to automate first.");
    promptInput.focus();
    return;
  }

  showMessage(
    "Your description is ready. Workflow generation will be enabled when the Python backend is connected."
  );
});

function comingSoon(feature) {
  showMessage(feature + " will be available in an upcoming development stage.");
}

document.getElementById("manualButton").addEventListener("click", () => {
  comingSoon("The visual workflow editor");
});

document.getElementById("newWorkflowButton").addEventListener("click", () => {
  comingSoon("Workflow creation");
});

document.getElementById("templatesButton").addEventListener("click", () => {
  comingSoon("Workflow templates");
});

document.getElementById("projectsButton").addEventListener("click", () => {
  comingSoon("Saved workflows");
});

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    comingSoon(button.querySelector("span").textContent);
    sidebar.classList.remove("open");
  });
});
