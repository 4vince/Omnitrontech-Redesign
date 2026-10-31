const root = document.documentElement;

export function getTheme() {
  return "dark";
}

export function initTheme() {
  root.dataset.theme = "dark";
  root.style.colorScheme = "dark";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", "#05070b");
  return { getTheme };
}
