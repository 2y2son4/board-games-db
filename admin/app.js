const actionEl = document.getElementById("action");
const idsEl = document.getElementById("ids");
const languageEl = document.getElementById("language");
const sizeEl = document.getElementById("size");
const goBtn = document.getElementById("go");
const outputEl = document.getElementById("output");

const idsField = document.getElementById("ids-field");
const languageField = document.getElementById("language-field");
const sizeField = document.getElementById("size-field");

function toggleFields() {
  const needsIds = ["import", "update"].includes(actionEl.value);
  const isImport = actionEl.value === "import";
  idsField.classList.toggle("hidden", !needsIds);
  languageField.classList.toggle("hidden", !isImport);
  sizeField.classList.toggle("hidden", !isImport);
}

actionEl.addEventListener("change", toggleFields);
toggleFields();

goBtn.addEventListener("click", async () => {
  const action = actionEl.value;
  const ids = idsEl.value.trim();

  if (["import", "update"].includes(action) && !ids) {
    outputEl.textContent = "⚠ Please enter at least one BGG ID.";
    return;
  }

  goBtn.disabled = true;
  outputEl.textContent = "Running…\n";

  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        ids,
        language: languageEl.value,
        size: sizeEl.value,
      }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      outputEl.textContent += decoder.decode(value, { stream: true });
      outputEl.scrollTop = outputEl.scrollHeight;
    }
    idsEl.value = "";
  } catch (err) {
    outputEl.textContent += `\nError: ${err.message}`;
  } finally {
    goBtn.disabled = false;
  }
});
