"use strict";

const passwordInput = document.querySelector("#password-input");
const togglePasswordButton = document.querySelector("#toggle-password");
const clearPasswordButton = document.querySelector("#clear-password");
const strengthMeter = document.querySelector("#strength-meter");
const meterFill = document.querySelector("#meter-fill");
const strengthName = document.querySelector("#strength-name");
const scoreValue = document.querySelector("#score-value");
const scoreDescription = document.querySelector("#score-description");
const checksCount = document.querySelector("#checks-count");
const suggestionsList = document.querySelector("#suggestions-list");
const insightsIntro = document.querySelector("#insights-intro");
const crackEstimate = document.querySelector("#crack-estimate");

const commonPasswords = new Set([
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "admin",
  "iloveyou",
  "letmein",
  "monkey",
  "password",
  "password1",
  "qwerty",
  "qwerty123",
  "welcome",
]);

const checkRows = [...document.querySelectorAll(".check-row")];

function containsSequence(password, minimumLength = 3) {
  const normalized = password.toLocaleLowerCase();
  let runLength = 1;

  for (let index = 1; index < normalized.length; index += 1) {
    const difference =
      normalized.codePointAt(index) - normalized.codePointAt(index - 1);
    if (difference === 1 || difference === -1) {
      runLength += 1;
      if (runLength >= minimumLength) return true;
    } else {
      runLength = 1;
    }
  }
  return false;
}

function containsRepeatedPattern(password) {
  return /(.{1,3})\1{2,}/iu.test(password);
}

function assessPassword(password) {
  const characters = [...password];
  const uniqueRatio = characters.length
    ? new Set(characters).size / characters.length
    : 0;
  const checks = {
    length12: characters.length >= 12,
    length16: characters.length >= 16,
    lowercase: /\p{Ll}/u.test(password),
    uppercase: /\p{Lu}/u.test(password),
    number: /\p{N}/u.test(password),
    symbol: /[^\p{L}\p{N}\s]/u.test(password),
    common: !commonPasswords.has(password.toLocaleLowerCase()),
    sequence: !containsSequence(password),
    repeat: !containsRepeatedPattern(password),
  };
  const hasMultipleGroups =
    Number(checks.lowercase) +
      Number(checks.uppercase) +
      Number(checks.number) +
      Number(checks.symbol) >=
    2;
  const suggestions = [];

  if (characters.length < 12) {
    suggestions.push("Use at least 12 characters; a longer passphrase is better.");
  } else if (characters.length < 16) {
    suggestions.push("Aim for 16 or more characters for a stronger passphrase.");
  }
  if (!hasMultipleGroups) {
    suggestions.push("Use a mix of character types, or choose several unrelated words.");
  }
  if (uniqueRatio < 0.5 && characters.length > 0) {
    suggestions.push("Avoid repeating the same characters or short patterns.");
  }
  if (!checks.common) {
    suggestions.push("This is a commonly used password; choose something unique.");
  }
  if (!checks.sequence) {
    suggestions.push("Avoid predictable sequences such as abc or 123.");
  }
  if (!checks.repeat) {
    suggestions.push("Avoid repeating short patterns, such as abcabc.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Good work. Keep this password unique to one account.");
  }

  let score =
    characters.length < 8
      ? 5
      : characters.length < 12
        ? 15
        : characters.length < 16
          ? 28
          : characters.length < 20
            ? 38
            : 48;
  score +=
    9 *
    (Number(checks.lowercase) +
      Number(checks.uppercase) +
      Number(checks.number) +
      Number(checks.symbol));
  score += uniqueRatio >= 0.8 ? 15 : uniqueRatio >= 0.6 ? 10 : uniqueRatio >= 0.4 ? 5 : 0;
  if (!checks.common) score -= 45;
  if (!checks.sequence) score -= 10;
  if (!checks.repeat) score -= 15;
  score = Math.max(0, Math.min(100, score));

  if (characters.length < 12) score = Math.min(score, 39);
  else if (characters.length < 16) score = Math.min(score, 69);

  const strength =
    score < 40 ? "Weak" : score < 60 ? "Fair" : score < 80 ? "Good" : "Strong";

  return { score, strength, checks, suggestions, uniqueRatio };
}

function estimateCrackTime(password, uniqueRatio) {
  const poolSize =
    (/[a-z]/i.test(password) ? 52 : 0) +
    (/\d/.test(password) ? 10 : 0) +
    (/[^\p{L}\p{N}\s]/u.test(password) ? 33 : 0) +
    (/[^\x00-\x7F]/u.test(password) ? 50 : 0);
  const combinations = Math.pow(Math.max(poolSize, 1), [...password].length);
  const adjustedCombinations = combinations * Math.max(uniqueRatio, 0.1);
  const seconds = adjustedCombinations / (1e10 * 2);

  if (seconds < 1) return "Less than a second";
  if (seconds < 60) return "A few seconds";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes (roughly)`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours (roughly)`;
  if (seconds < 31557600) return `${Math.floor(seconds / 86400)} days (roughly)`;
  if (seconds < 31557600 * 1000) {
    return `${Math.floor(seconds / 31557600)} years (roughly)`;
  }
  if (seconds < 31557600 * 1e9) {
    return `${Math.floor(seconds / (31557600 * 1000))} thousand years+`;
  }
  return "Far longer than a human lifetime";
}

function renderPasswordAssessment() {
  const password = passwordInput.value;
  clearPasswordButton.hidden = password.length === 0;

  if (!password) {
    strengthName.textContent = "Waiting for input";
    scoreValue.innerHTML = "—<small>/100</small>";
    scoreDescription.textContent = "Start typing to see your results.";
    meterFill.style.width = "0%";
    strengthMeter.removeAttribute("data-strength");
    strengthMeter.setAttribute("aria-valuenow", "0");
    strengthMeter.setAttribute("aria-valuetext", "Waiting for input");
    checksCount.textContent = "0 / 9";
    crackEstimate.textContent = "Waiting for a password";
    insightsIntro.textContent =
      "Add a password above and we’ll share a few thoughtful ways to make it stronger.";
    suggestionsList.replaceChildren(
      ...[
        "Go for 16 characters or more.",
        "Mix letters, numbers, and symbols.",
        "Try a few unrelated words.",
      ].map(createSuggestion),
    );
    for (const row of checkRows) row.classList.remove("passed");
    return;
  }

  const result = assessPassword(password);
  strengthName.textContent = result.strength;
  scoreValue.innerHTML = `${result.score}<small>/100</small>`;
  scoreDescription.textContent =
    result.strength === "Strong"
      ? "Looking good. A unique password is best."
      : "A few small changes can help.";
  meterFill.style.width = `${result.score}%`;
  strengthMeter.dataset.strength = result.strength;
  strengthMeter.setAttribute("aria-valuenow", String(result.score));
  strengthMeter.setAttribute(
    "aria-valuetext",
    `${result.strength}, ${result.score} out of 100`,
  );

  let passedCount = 0;
  for (const row of checkRows) {
    const passed = result.checks[row.dataset.check];
    row.classList.toggle("passed", passed);
    if (passed) passedCount += 1;
  }
  checksCount.textContent = `${passedCount} / ${checkRows.length}`;
  insightsIntro.textContent =
    result.suggestions.length === 1 &&
    result.suggestions[0].startsWith("Good work")
      ? "You’ve covered the essentials. Keep it unique to each account."
      : "A couple of thoughtful tweaks can make this password harder to guess.";
  suggestionsList.replaceChildren(...result.suggestions.map(createSuggestion));
  crackEstimate.textContent = estimateCrackTime(password, result.uniqueRatio);
}

function createSuggestion(text) {
  const item = document.createElement("li");
  item.textContent = text;
  return item;
}

passwordInput.addEventListener("input", renderPasswordAssessment);

togglePasswordButton.addEventListener("click", () => {
  const showPassword = passwordInput.type === "password";
  passwordInput.type = showPassword ? "text" : "password";
  togglePasswordButton.setAttribute(
    "aria-label",
    showPassword ? "Hide password" : "Show password",
  );
  togglePasswordButton.title = showPassword ? "Hide password" : "Show password";
});

clearPasswordButton.addEventListener("click", () => {
  passwordInput.value = "";
  passwordInput.type = "password";
  togglePasswordButton.setAttribute("aria-label", "Show password");
  togglePasswordButton.title = "Show password";
  passwordInput.focus();
  renderPasswordAssessment();
});

const lengthInput = document.querySelector("#length-input");
const lengthValue = document.querySelector("#length-value");
const generatedPassword = document.querySelector("#generated-password");
const generatorStatus = document.querySelector("#generator-status");
const copyPasswordButton = document.querySelector("#copy-password");

lengthInput.addEventListener("input", () => {
  lengthValue.textContent = lengthInput.value;
});

function secureRandomInteger(maximum) {
  if (!Number.isSafeInteger(maximum) || maximum < 1 || maximum > 2 ** 32) {
    throw new RangeError("Random range must be between 1 and 2^32.");
  }
  const limit = 2 ** 32 - ((2 ** 32) % maximum);
  const buffer = new Uint32Array(1);
  do {
    window.crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % maximum;
}

function generateSecurePassword(length, includeNumbers, includeSymbols) {
  if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
    throw new Error("Secure password generation is unavailable in this browser context.");
  }

  const groups = ["abcdefghijkmnopqrstuvwxyz", "ABCDEFGHJKLMNPQRSTUVWXYZ"];
  if (includeNumbers) groups.push("23456789");
  if (includeSymbols) groups.push("!@#$%&*+-=?_");
  if (length < groups.length) {
    throw new RangeError("Password length is too short for the selected character types.");
  }

  const allCharacters = groups.join("");
  const characters = groups.map(
    (group) => group[secureRandomInteger(group.length)],
  );
  while (characters.length < length) {
    characters.push(allCharacters[secureRandomInteger(allCharacters.length)]);
  }
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const otherIndex = secureRandomInteger(index + 1);
    [characters[index], characters[otherIndex]] = [
      characters[otherIndex],
      characters[index],
    ];
  }
  return characters.join("");
}

document.querySelector("#generate-password").addEventListener("click", () => {
  try {
    const password = generateSecurePassword(
      Number(lengthInput.value),
      document.querySelector("#include-numbers").checked,
      document.querySelector("#include-symbols").checked,
    );
    generatedPassword.textContent = password;
    generatedPassword.classList.remove("placeholder");
    copyPasswordButton.disabled = false;
    generatorStatus.textContent = "Generated on this device. Nothing was saved.";
  } catch (error) {
    generatorStatus.textContent =
      error instanceof Error ? error.message : "Could not generate a password.";
  }
});

copyPasswordButton.addEventListener("click", async () => {
  if (copyPasswordButton.disabled) return;
  const password = generatedPassword.textContent;
  if (!password || password === "Click generate to begin") return;

  try {
    await navigator.clipboard.writeText(password);
    generatorStatus.textContent = "Copied to your clipboard.";
  } catch {
    generatorStatus.textContent =
      "Clipboard access is unavailable. Select and copy the password instead.";
  }
});

renderPasswordAssessment();
generatedPassword.classList.add("placeholder");
