
const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

const DRAFT_KEY = "quicknotes-draft";
const THEME_KEY = "quicknotes-theme";

function updateCounts() {
  const text = noteText.value;
  const characters = text.length;

  const trimmedText = text.trim();
  const words = trimmedText === ""
    ? 0
    : trimmedText.split(/\s+/).length;

  charCount.textContent = `${characters} / 200 characters`;
  wordCount.textContent = `${words} words`;

  charCount.classList.remove("warning", "over");

  if (characters > 200) {
    charCount.classList.add("over");
  } else if (characters > 180) {
    charCount.classList.add("warning");
  }
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, noteText.value);
}

function clearNote() {
  noteText.value = "";
  localStorage.removeItem(DRAFT_KEY);
  updateCounts();
}

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");

  themeToggle.textContent =
    theme === "dark" ? "Light mode" : "Dark mode";
}

// Restore the saved draft when the page loads.
const savedDraft = localStorage.getItem(DRAFT_KEY);

if (savedDraft !== null) {
  noteText.value = savedDraft;
}

// Restore the saved theme.
const savedTheme = localStorage.getItem(THEME_KEY);
const initialTheme = savedTheme === "dark" ? "dark" : "light";

applyTheme(initialTheme);
updateCounts();

// Update counters and save the draft whenever the user types.
noteText.addEventListener("input", function () {
  updateCounts();
  saveDraft();
});

// Clear the note when the Clear button is clicked.
clearBtn.addEventListener("click", clearNote);

// Toggle the theme and remember the choice.
themeToggle.addEventListener("click", function () {
  const isDark = document.body.classList.contains("dark");
  const newTheme = isDark ? "light" : "dark";

  applyTheme(newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
});

// Clear the note when Escape is pressed inside the textarea.
noteText.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    clearNote();
  }
});