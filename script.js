// =============================================================================
// Frontend logic.
// The browser NEVER talks to Groq directly and never sees the API key.
// It only calls our own serverless function at /api/generate.
// =============================================================================

const MAX_CHARS = 2000;

const form = document.getElementById("postForm");
const textarea = document.getElementById("postText");
const charCount = document.getElementById("charCount");
const generateBtn = document.getElementById("generateBtn");
const errorMsg = document.getElementById("errorMsg");
const results = document.getElementById("results");

// ---- Live character counter ----
textarea.addEventListener("input", () => {
  const length = textarea.value.length;
  charCount.textContent = length;
  charCount.parentElement.classList.toggle("is-near-limit", length > MAX_CHARS * 0.9);
});

// ---- Generate button ----
form.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the page from reloading
  hideError();

  const text = textarea.value.trim();
  const tone = form.querySelector('input[name="tone"]:checked').value;
  const channel = form.querySelector('input[name="channel"]:checked').value;

  // Quick checks in the browser (the server checks again)
  if (!text) {
    showError("Please paste a post first.");
    textarea.focus();
    return;
  }
  if (text.length > MAX_CHARS) {
    showError(`Post is too long (max ${MAX_CHARS} characters).`);
    return;
  }

  setLoading(true);

  try {
    // Send the post to our serverless function
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, tone, channel }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // 429 = rate limit; other errors come with a friendly message from the server
      if (response.status === 429) {
        throw new Error("Too many requests, try again in a minute.");
      }
      throw new Error(data.error || "Something went wrong. Please try again.");
    }

    showResults(data);
  } catch (err) {
    // fetch itself throws a TypeError when there is no connection
    const message = err instanceof TypeError ? "Network error. Check your connection and try again." : err.message;
    showError(message);
  } finally {
    setLoading(false);
  }
});

// ---- Copy buttons ----
document.querySelectorAll(".copy-btn").forEach((button) => {
  button.addEventListener("click", async () => {
    const text = document.getElementById(button.dataset.target).textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied!";
    } catch {
      button.textContent = "Copy failed";
    }
    setTimeout(() => (button.textContent = "Copy"), 1500);
  });
});

// ---- Helpers ----
function showResults(data) {
  // textContent (not innerHTML) so AI output can never inject HTML into the page
  document.getElementById("out-sl").textContent = data.sl;
  document.getElementById("out-en").textContent = data.en;
  document.getElementById("out-fr").textContent = data.fr;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  generateBtn.innerHTML = isLoading ? '<span class="spinner" aria-hidden="true"></span> Generating…' : "Generate";
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.hidden = false;
}

function hideError() {
  errorMsg.hidden = true;
}
