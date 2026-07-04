export const content = {
  name: "Dan McGee-Marin",
  role: "Software Engineer",
  tagline: "I build systems that are fast, reliable, and easy to reason about.",

  about: `Based in Berkeley, CA. I'm a software engineer with a focus on infrastructure, developer tooling, and systems programming. I care about correctness, simplicity, and building things that last.

Currently exploring declarative systems configuration, self-hosted infrastructure, and the intersection of developer experience and operations.`,

  links: {
    github: "https://github.com/Daniel-McGeeMarin",
    linkedin: "",
    email: "mcgeedan@berkeley.edu",
    resume: "",
  },

  projects: [
    {
      name: "NixOS Configuration",
      description:
        "Fully declarative NixOS setup spanning desktop and home server. A single flake manages system config, Home Manager, secrets, and containerized services — rebuilding on new hardware is one command.",
      tags: ["Nix", "Linux", "Infrastructure"],
      url: "https://github.com/Daniel-McGeeMarin",
    },
    {
      name: "Home Server",
      description:
        "Self-hosted stack behind Cloudflare Tunnel: Authelia SSO, Ghost blogs, OCIS file storage, OnlyOffice — all Podman containers declared in Nix. No open ports, no manual config.",
      tags: ["Self-hosted", "Caddy", "Podman", "Authelia"],
      url: "",
    },
  ],

  nav: ["About", "Projects", "Contact"],
}
