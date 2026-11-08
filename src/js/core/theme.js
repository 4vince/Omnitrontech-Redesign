const root = document.documentElement;

export function getTheme() {
  return root.dataset.theme || "light";
}

export function initTheme() {
  root.dataset.theme = "light";
  root.style.colorScheme = "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", "#f6f5f1");
  return { getTheme };
}
