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
  // Profile URLs only. A bare domain (https://x.com) sends visitors to a
  // login wall, so an empty href hides that icon until the real link exists.
  socials: [
    {
      label: "Omnitron on LinkedIn",
      href: "",
      icon: "ph-linkedin-logo",
    },
    {
      label: "Omnitron on X",
      href: "",
      icon: "ph-x-logo",
    },
  ],
};

export function currentPage() {
  return document.body.dataset.page || "home";
}
