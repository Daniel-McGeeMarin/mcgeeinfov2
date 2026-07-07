export const profile = {
  name: "Dan McGee Marin",
  tagline: "EECS + Business @ Berkeley. I like digging into problems that are messy before they're clear.",
  avatar: "/images/profile.webp",
  resumeUrl: "/resume.pdf",
  links: {
    github: "https://github.com/DanielMcGeeMarin",
    linkedin: "https://www.linkedin.com/in/DanielMcgeeMarin/",
    email: "mailto:mcgeedan@berkeley.edu",
  },
}

export const about = {
  image: "/images/about.webp",
  paragraphs: [
    "I study EECS and Business at UC Berkeley and like tackling problems that force you to think clearly about systems, constraints, and user interactions. A lot of this comes from working deeply with Linux and from building tools, workflows, and automation that simplify messy processes.",
    "My recent experience spans full-stack engineering, ML workflows, economic data analysis, and automation projects from building AI agents at GenPF and Farther to running modeling pipelines at Berkeley Nanotech and Flux Robotics. Across these, I like clean, reliable solutions that reduce friction for users.",
    "I'm interested in engineering work that fits into real team and organizational workflows. For example, at ReNewport, I worked with a small team to ship an air quality dashboard used across the city by residents, planners, and advocacy groups. I find these kind of projects make you think beyond code, as how a tool fits into a group/communities workflow, how to turn it into an organization that can be maintained without your direct management, and how scale past a single deployment become major components of the puzzle.",
    "Long term, I'm interested in helping build and manage organizations that support research, education, and community development. I see institutions as systems with their own constraints: teams, incentives, culture, and the technical infrastructure that makes their work possible.",
    "Outside of work, I read a lot (Why Nations Fail, Republic, and Weapons of Math Destruction are favorites), tune my Linux setup, and play Poker and Magic The Gathering.",
  ],
  interests: [
    "Python, Java, R, MATLAB",
    "Machine Learning & AI",
    "Full-Stack Development",
    "Data Analysis & Modeling",
    "Circuit Design & Hardware",
    "Entrepreneurship",
  ],
}

// Apps that actually run live, in-browser, on this site. Most are backed by packages/* in
// the monorepo (see CLAUDE.md); some (Session Timer) are pure frontend with no backend at
// all. Shown both as a quick-jump list in the sidebar and as highlighted cards on the
// Portfolio page. `status: "soon"` renders as non-clickable.
export const webApps = [
  {
    name: "Poker Odds Simulator",
    description: "Monte Carlo hand-equity simulator — see how your odds shift street by street.",
    tags: ["Python", "Monte Carlo"],
    status: "live",
    href: "/apps/poker",
    noAI: true,
  },
  {
    name: "Session Timer",
    description: "Paste a schedule, run through it segment by segment with alarms and smart snoozing.",
    tags: ["React", "Web Audio API"],
    status: "live",
    href: "/apps/session-timer",
  },
  {
    name: "Job Browser",
    description: "Private internship aggregator — pulls Summer 2027 listings from GitHub sources, deduplicates by canonical URL, enriches via page scraping, and tracks applications in a personal queue.",
    tags: ["Python", "SQLite", "FastAPI"],
    status: "live",
    href: "/apps/jobs",
    private: true,
  },
]

// Standalone project writeups — mostly coursework/personal builds without a hosted demo.
// Only include a githubUrl when there's a real public repo; a lot of these are Berkeley
// coursework repos that stay private per academic-integrity policy, so no link is fabricated.
export const projects = [
  {
    title: "Sentiment-Driven Trading Algorithm",
    description: "Analyzed celebrity social media sentiment to forecast short-term equity moves, and built a backtested trading model.",
    image: "/images/projects/sentiment.webp",
    tags: ["Python", "NumPy", "Matplotlib"],
  },
  {
    title: "NGordnet",
    description: "Built a tool to trace language change across NGram/WordNet datasets using graph traversal and time-series visualizations.",
    image: "/images/projects/ngordnet.webp",
    tags: ["Java", "WordNet", "NGram"],
  },
  {
    title: "Build Your Own World",
    description: "Built a 2D game engine with procedural worlds using Prim's algorithm for graph-based world generation and A* for pathfinding.",
    image: "/images/projects/byow.webp",
    tags: ["Java", "A*", "Prim's Algorithm"],
  },
  {
    title: "Scheme (Lisp) Interpreter in Python",
    description: "Built a Scheme interpreter in Python, implementing recursive eval/apply and optimizing the REPL for efficiency.",
    image: "/images/projects/scheme.webp",
    tags: ["Python", "Scheme", "ASTs"],
  },
  {
    title: "Treble Boost Guitar Pedal",
    description: "Designed and built a signal amplifier and filter in LTSpice, testing with an analyzer and a real guitar to confirm sound shaping.",
    image: "/images/projects/guitar.webp",
    tags: ["Circuits", "LTSpice"],
  },
  {
    title: "Ground-Up Voice Recognition Model",
    description: "Built with NumPy, SVD, and PCA in Python, applying dimensionality reduction to reach 95% accuracy.",
    image: "/images/projects/voicerec.webp",
    tags: ["NumPy", "SVD", "PCA"],
  },
  {
    title: "Self-Hosted Ubuntu Home Server",
    description: "Deployed and secured a home server on Ubuntu, hosting Docker containers like Nextcloud alongside a personal website.",
    image: "/images/projects/server.webp",
    tags: ["Ubuntu", "Docker", "Nginx"],
  },
  {
    title: "Time-Based One-Time Password App",
    description: "Open-source TOTP app: a PyQt desktop app paired with a browser extension for one-click OTP entry.",
    image: "/images/projects/saifu.webp",
    tags: ["PyQt", "Android"],
    links: [{ type: "github", url: "https://github.com/saifuTOTP/SaifuQT" }],
  },
  {
    title: "XiaDrum",
    description: "ML classification model running on an Arduino device to alert deaf users in warzones to gunshots and sirens.",
    image: "/images/projects/xiadrum.webp",
    tags: ["Arduino", "Machine Learning", "C++"],
    links: [
      { type: "video", url: "https://youtu.be/1NAGmKSUVCw" },
      { type: "doc", url: "https://docs.google.com/document/d/1K67M3En9TeIwjuI9g7NHuw_1mYvBYwCCJZ-rnfCE9f8/edit?usp=sharing" },
    ],
  },
]
