import { contactSteps } from "../content/home.js";
import { findService } from "../content/services.js";
import { site } from "../content/site.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function errorId(input) {
  return `error-${input.name}`;
}

function getErrorNode(input) {
  const field = input.closest(".field");
  if (!field) return null;
  let node = field.querySelector(".field-error");
  if (!node) {
    node = document.createElement("p");
    node.className = "field-error";
    node.id = errorId(input);
    node.innerHTML = '<i class="ph ph-warning-circle" aria-hidden="true"></i><span></span>';
    field.append(node);
  }
  return node;
}

function setFieldError(input, message) {
  const field = input.closest(".field");
  const node = getErrorNode(input);
  if (!field || !node) return;
  field.classList.add("has-error");
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", node.id);
  node.querySelector("span").textContent = message;
}

function clearFieldError(input) {
  const field = input.closest(".field");
  if (!field) return;
  const node = field.querySelector(".field-error");
  field.classList.remove("has-error");
  input.removeAttribute("aria-invalid");
  if (node) {
    input.removeAttribute("aria-describedby");
    node.remove();
  }
}

function validateField(input) {
  const value = input.value.trim();
  const name = input.name;

  if (!value && name === "subject") return "";
  if (!value) {
    const label = input.closest(".field")?.querySelector("label")?.textContent || "This field";
    return `Enter ${label.toLowerCase().replace("optional", "").replace(/[?.!]+$/, "").trim()}.`;
  }
  if (name === "name" && value.length < 2) return "Enter your name as you would like us to use it.";
  if (name === "email" && !EMAIL_PATTERN.test(value)) return "Enter a valid email address, such as you@company.com.";
  if (name === "subject" && value.length < 3) return "Add a short subject so we can route your message.";
  if (name === "message" && value.length < 20) return "Add a little more detail (at least 20 characters).";
  return "";
}

function buildMailto({ name, email, subject, message }) {
  const body = [
    `Name: ${name}`,
    `Email: ${email}`,
    "",
    message,
  ].join("\n");
  return `mailto:${site.email}?subject=${encodeURIComponent(subject ? `Website enquiry: ${subject}` : "Website enquiry")}&body=${encodeURIComponent(body)}`;
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

export function initContact() {
  const stepsMount = document.querySelector("[data-contact-steps]");
  if (stepsMount) {
    stepsMount.innerHTML = contactSteps
      .map(
        (step) => `<li class="contact-step">
          <span>${step.label}</span>
          <p>${step.body}</p>
        </li>`,
      )
      .join("");
  }

  const form = document.querySelector("[data-contact-form]");
  const card = document.querySelector("[data-contact-card]");
  if (!form || !card) return;

  const fields = [...form.querySelectorAll("[data-field]")];
  const submit = form.querySelector("[type='submit']");
  const formError = form.querySelector("[data-form-error]");
  const honeypot = form.querySelector("[data-honeypot]");
  const note = form.querySelector("[data-form-note]");
  const endpoint = (import.meta.env.VITE_CONTACT_ENDPOINT || "").trim();
  const buttonMarkup = submit?.innerHTML || "Send message";

  // Prefill the subject from ?service=intelligent-automation.
  const params = new URLSearchParams(window.location.search);
  const requestedService = findService(params.get("service"));
  const subjectInput = form.querySelector("[name='subject']");
  if (requestedService && subjectInput && !subjectInput.value) {
    subjectInput.value = requestedService.name;
  }

  if (note) {
    const requirement = "Name, email, and a short message are required. Subject is optional.";
    note.textContent = requestedService
      ? `Prefilled for ${requestedService.name}. Change it if needed. ${requirement}`
      : requirement;
  }

  fields.forEach((input) => {
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") clearFieldError(input);
    });
    input.addEventListener("blur", () => {
      if (input.value.trim() && input.getAttribute("aria-invalid") === "true") {
        const message = validateField(input);
        if (!message) clearFieldError(input);
      }
    });
  });

  function showFormError(message, fallbackHref = "") {
    if (!formError) return;
    formError.hidden = false;
    const text = formError.querySelector("[data-form-error-text]");
    if (text) text.textContent = message;
    const fallbackLink = formError.querySelector("[data-form-error-link]");
    if (fallbackLink) {
      fallbackLink.hidden = !fallbackHref;
      if (fallbackHref) fallbackLink.href = fallbackHref;
    }
    formError.focus?.();
  }

  function hideFormError() {
    if (formError) formError.hidden = true;
  }

  function setBusy(busy) {
    if (!submit) return;
    submit.disabled = busy;
    submit.setAttribute("aria-busy", String(busy));
    submit.innerHTML = busy
      ? '<span class="spinner" aria-hidden="true"></span><span>Sending</span>'
      : buttonMarkup;
  }

  async function send(payload) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...payload,
          page: window.location.href,
          sentAt: new Date().toISOString(),
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function showSuccess(payload) {
    form.hidden = true;
    hideFormError();

    const success = document.createElement("div");
    success.className = "form-success";
    success.setAttribute("role", "status");
    success.innerHTML = `
      <span class="form-success__icon"><i class="ph ph-check" aria-hidden="true"></i></span>
      <h3 tabindex="-1" data-success-title>Message received.</h3>
      <p>Thank you, ${escapeHtml(payload.name.split(" ")[0])}. We will reply within two working days, usually sooner. If it is urgent, email <a href="mailto:${site.email}">${site.email}</a> directly.</p>
    `;
    card.append(success);
    const title = success.querySelector("[data-success-title]");
    title?.focus();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideFormError();

    if (honeypot && honeypot.value.trim()) return;

    let firstInvalid = null;
    fields.forEach((input) => {
      const message = validateField(input);
      if (message) {
        setFieldError(input, message);
        if (!firstInvalid) firstInvalid = input;
      } else {
        clearFieldError(input);
      }
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const payload = {
      name: form.elements.namedItem("name").value.trim(),
      email: form.elements.namedItem("email").value.trim(),
      subject: form.elements.namedItem("subject").value.trim(),
      message: form.elements.namedItem("message").value.trim(),
    };

    if (!endpoint) {
      showFormError(
        "This form is not connected yet. Nothing was sent. Use this link to send your message by email.",
        buildMailto(payload),
      );
      return;
    }

    setBusy(true);
    try {
      await send(payload);
      showSuccess(payload);
    } catch (error) {
      console.error("Could not submit the contact enquiry.", error);
      showFormError(
        `Something went wrong, and your message is still here. Use this link to send it by email, or try again.`,
        buildMailto(payload),
      );
      setBusy(false);
      submit?.focus();
    }
  });
}
