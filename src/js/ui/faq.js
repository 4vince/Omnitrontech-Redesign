import { faqs } from "../content/faqs.js";

export function initFaq() {
  const mount = document.querySelector("[data-faq]");
  if (!mount) return;

  mount.innerHTML = `
    <div class="faq-list">
      ${faqs
        .map(
          (item, index) => {
            const open = index === 0;
            const triggerId = `faq-trigger-${index}`;
            const panelId = `faq-panel-${index}`;
            return `<div class="faq-item${open ? " is-open" : ""}">
              <h3>
                <button class="faq-trigger" id="${triggerId}" type="button" aria-expanded="${open}" aria-controls="${panelId}">
                  <span>${item.question}</span>
                  <i class="ph ph-plus" aria-hidden="true"></i>
                </button>
              </h3>
              <div class="faq-panel" id="${panelId}" role="region" aria-labelledby="${triggerId}"${
                open ? "" : ' aria-hidden="true"'
              }>
                <div><p>${item.answer}</p></div>
              </div>
            </div>`;
          },
        )
        .join("")}
    </div>
  `;

  const items = [...mount.querySelectorAll(".faq-item")];
  const triggers = [...mount.querySelectorAll(".faq-trigger")];

  function setOpen(item, open) {
    const trigger = item.querySelector(".faq-trigger");
    const panel = item.querySelector(".faq-panel");
    item.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", String(open));
    if (open) panel.removeAttribute("aria-hidden");
    else panel.setAttribute("aria-hidden", "true");
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const item = trigger.closest(".faq-item");
      const willOpen = !item.classList.contains("is-open");
      items.forEach((other) => setOpen(other, false));
      if (willOpen) setOpen(item, true);
    });
  });

  // Initial state needs the aria-hidden attribute applied consistently.
  items.forEach((item, index) => setOpen(item, index === 0));
}
