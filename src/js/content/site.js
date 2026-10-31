export const site = {
  name: "Omnitron",
  email: "hello@omnitron.tech",
  location: "Singapore",
  region: "Asia-Pacific",
  nav: [
    { label: "Home", href: "/" },
    { label: "AI Solutions", href: "/ai-solutions/" },
    { label: "Contact", href: "/contact/" },
  ],
  cta: { label: "Start the conversation", href: "/contact/" },
  socials: [
    {
      label: "Omnitron on LinkedIn",
      href: "https://linkedin.com",
      icon: "ph-linkedin-logo",
    },
    {
      label: "Omnitron on X",
      href: "https://x.com",
      icon: "ph-x-logo",
    },
  ],
};

export function currentPage() {
  return document.body.dataset.page || "home";
}
