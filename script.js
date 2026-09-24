// Seletores da interface
const passwordField = document.querySelector("#generated-password");
const copyButton = document.querySelector("#copy-password");
const lengthSlider = document.querySelector("#password-length");
const lengthValue = document.querySelector("#password-length-value");
const typeCheckboxes = [...document.querySelectorAll('input[name="character-types"]')];
const generateButton = document.querySelector("#generate-password");
const strengthBar = document.querySelector("#password-strength-bar");
const strengthText = document.querySelector("#password-strength-text");
const feedbackMessage = document.querySelector("#feedback-message");

// Grupos de caracteres disponíveis para cada opção
const characterSets = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
};

let feedbackTimeout;

/** Escolhe um inteiro uniforme com a fonte criptográfica do navegador.
 * crypto.getRandomValues fornece valores aleatórios seguros para senhas;
 * Math.random não oferece garantias criptográficas e não deve ser usado aqui.
 */
function secureRandomInt(maxExclusive) {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1) {
    throw new RangeError("O limite aleatório precisa ser um inteiro positivo.");
  }

  const range = 0x1_0000_0000;
  const limit = Math.floor(range / maxExclusive) * maxExclusive;
  const randomValue = new Uint32Array(1);

  // Rejeita a faixa excedente para evitar viés na escolha dos caracteres.
  do {
    crypto.getRandomValues(randomValue);
  } while (randomValue[0] >= limit);

  return randomValue[0] % maxExclusive;
}

function getSelectedTypes() {
  return typeCheckboxes
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);
}

function pickCharacter(characters) {
  return characters[secureRandomInt(characters.length)];
}

function shuffleCharacters(characters) {
  // Fisher–Yates com escolhas seguras para não revelar a ordem dos tipos.
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomInt(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
  }

  return characters;
}

function showFeedback(message, isError = false) {
  window.clearTimeout(feedbackTimeout);
  feedbackMessage.textContent = message;
  feedbackMessage.classList.toggle("feedback-message--error", isError);

  if (message) {
    // Reinicia a animação mesmo quando uma mensagem se repete.
    feedbackMessage.classList.remove("feedback-message--visible");
    void feedbackMessage.offsetWidth;
    feedbackMessage.classList.add("feedback-message--visible");
    feedbackTimeout = window.setTimeout(() => {
      feedbackMessage.textContent = "";
      feedbackMessage.classList.remove("feedback-message--visible", "feedback-message--error");
    }, 3500);
  }
}

function generatePassword() {
  const selectedTypes = getSelectedTypes();
  const passwordLength = Number(lengthSlider.value);

  if (selectedTypes.length === 0) {
    showFeedback("Selecione pelo menos um tipo de caractere.", true);
    return;
  }

  if (passwordLength < selectedTypes.length) {
    showFeedback(
      `Para incluir todos os tipos selecionados, escolha pelo menos ${selectedTypes.length} caracteres.`,
      true,
    );
    return;
  }

  const passwordCharacters = selectedTypes.map((type) => pickCharacter(characterSets[type]));
  const allSelectedCharacters = selectedTypes.map((type) => characterSets[type]).join("");

  while (passwordCharacters.length < passwordLength) {
    passwordCharacters.push(pickCharacter(allSelectedCharacters));
  }

  passwordField.value = shuffleCharacters(passwordCharacters).join("");
  updateStrength(passwordField.value, selectedTypes.length);
  showFeedback("Senha gerada com sucesso!");
}

function updateLengthDisplay() {
  const currentLength = lengthSlider.value;
  lengthValue.value = currentLength;
  lengthValue.textContent = currentLength;
  lengthSlider.setAttribute("aria-valuenow", currentLength);
}

function calculateStrength(password, selectedTypeCount) {
  const lengthScore = Math.min(password.length / 32, 1) * 50;
  const varietyScore = (Math.min(selectedTypeCount, 4) / 4) * 50;
  const score = Math.round(lengthScore + varietyScore);

  if (score < 30) return { score, level: "fraca", label: "Fraca" };
  if (score < 55) return { score, level: "media", label: "Média" };
  if (score < 80) return { score, level: "forte", label: "Forte" };
  return { score, level: "muito-forte", label: "Muito forte" };
}

function updateStrength(password, selectedTypeCount) {
  const strength = calculateStrength(password, selectedTypeCount);
  const levels = ["fraca", "media", "forte", "muito-forte"];

  strengthBar.classList.remove(...levels);
  strengthBar.classList.add(strength.level);
  strengthBar.value = strength.score;
  strengthBar.setAttribute("aria-valuenow", String(strength.score));
  strengthBar.setAttribute("aria-valuetext", `${strength.label}, ${strength.score}%`);
  strengthText.textContent = `Força: ${strength.label}`;
}

async function copyWithClipboardApi(text) {
  await navigator.clipboard.writeText(text);
}

function copyWithFallback(text) {
  const temporaryField = document.createElement("textarea");
  temporaryField.value = text;
  temporaryField.setAttribute("readonly", "");
  temporaryField.style.position = "fixed";
  temporaryField.style.opacity = "0";
  document.body.append(temporaryField);
  temporaryField.select();

  const copied = document.execCommand("copy");
  temporaryField.remove();

  if (!copied) {
    throw new Error("Não foi possível copiar a senha.");
  }
}

async function copyPassword() {
  const password = passwordField.value;

  if (!password) {
    showFeedback("Gere uma senha antes de copiar.", true);
    return;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await copyWithClipboardApi(password);
    } else {
      copyWithFallback(password);
    }
    showFeedback("Senha copiada!");
  } catch {
    try {
      copyWithFallback(password);
      showFeedback("Senha copiada!");
    } catch {
      showFeedback("Não foi possível copiar. Selecione e copie a senha manualmente.", true);
    }
  }
}

function keepAtLeastOneTypeSelected(event) {
  if (getSelectedTypes().length > 0) return;

  event.currentTarget.checked = true;
  showFeedback("Mantenha pelo menos um tipo de caractere selecionado.", true);
}

// Liga os controles às ações correspondentes.
lengthSlider.addEventListener("input", updateLengthDisplay);
generateButton.addEventListener("click", generatePassword);
copyButton.addEventListener("click", copyPassword);
typeCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", keepAtLeastOneTypeSelected);
});

// Mostra o tamanho inicial e já apresenta uma senha ao abrir a página.
updateLengthDisplay();
generatePassword();
