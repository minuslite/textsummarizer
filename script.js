// ===============================
// CONFIGURATION
// ===============================
const API_TOKEN = "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"; // 🔑 Paste your Hugging Face token
const MODEL = "facebook/bart-large-cnn";
const API_URL = `https://api-inference.huggingface.co/models/${MODEL}`;

let activeLen = "short";

const lengthParams = {
  short: { min_length: 30, max_length: 80 },
  medium: { min_length: 60, max_length: 150 },
  long: { min_length: 100, max_length: 250 },
};

// ===============================
// DOM ELEMENTS
// ===============================
const inputEl = document.getElementById("inputText");
const outputEl = document.getElementById("outputBody");
const charCountEl = document.getElementById("charCount");
const btn = document.getElementById("summarizeBtn");
const errorEl = document.getElementById("errorMsg");
const copyBtn = document.getElementById("copyBtn");
const statusDot = document.getElementById("statusDot");

// ===============================
// CHARACTER COUNTER
// ===============================
inputEl.addEventListener("input", () => {
  charCountEl.textContent =
    inputEl.value.length.toLocaleString() + " chars";
});

// ===============================
// LENGTH SELECTION
// ===============================
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document
      .querySelectorAll(".chip")
      .forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    activeLen = chip.dataset.len;
  });
});

// ===============================
// COPY TO CLIPBOARD
// ===============================
copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(outputEl.innerText).then(() => {
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1800);
  });
});

// ===============================
// SUMMARIZE BUTTON
// ===============================
btn.addEventListener("click", async () => {
  const text = inputEl.value.trim();
  errorEl.classList.remove("visible");

  if (!API_TOKEN || !API_TOKEN.startsWith("hf_")) {
    showError("Invalid Hugging Face token. Please check your API key.");
    return;
  }

  if (!text) {
    showError("Please enter some text to summarize.");
    inputEl.focus();
    return;
  }

  if (text.split(/\s+/).length < 20) {
    showError(
      "Text is too short — please paste at least a paragraph."
    );
    return;
  }

  btn.disabled = true;
  btn.classList.add("loading");
  outputEl.innerHTML =
    '<p class="output-placeholder">Summarizing… this may take a few seconds on first run.</p>';
  copyBtn.style.display = "none";
  statusDot.style.display = "none";

  const params = lengthParams[activeLen];

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
        options: {
          wait_for_model: true,
          use_cache: true,
        },
        parameters: {
          min_length: params.min_length,
          max_length: params.max_length,
          do_sample: false,
        },
      }),
    });

    // Capture raw response for better debugging
    const responseText = await res.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error("Invalid response from the API.");
    }

    if (!res.ok) {
      const msg = data?.error || `API Error ${res.status}`;
      if (msg.toLowerCase().includes("loading")) {
        throw new Error(
          "Model is loading on Hugging Face servers — please wait 20 seconds and try again."
        );
      }
      throw new Error(msg);
    }

    const summary = Array.isArray(data)
      ? data[0]?.summary_text
      : data?.summary_text;

    if (!summary) {
      throw new Error(
        "No summary returned. Please try again shortly."
      );
    }

    outputEl.innerHTML = `
      <p style="color:var(--ink); line-height:1.75;">
        ${summary}
      </p>
    `;

    copyBtn.style.display = "block";
    statusDot.style.display = "inline-block";
  } catch (err) {
    outputEl.innerHTML =
      '<p class="output-placeholder">Could not generate summary.</p>';
    showError(err.message || "Failed to fetch. Please try again.");
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
  }
});

// ===============================
// ERROR HANDLER
// ===============================
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.add("visible");
}
