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
    "Hello! I'm Dan, a student at UC Berkeley majoring in EECS and Business. I really enjoy digging into tough problems, especially navigating the initial ambiguity where the path forward isn't clear and it's largely about learning and troubleshooting. A lot of this mindset comes from years of tinkering with Arch Linux, where I often have to be resourceful in order to fix my poor computer after my latest customization imploded it! I really like clever solutions that simplify things for people, whether that's rethinking a user experience to be radically easier or writing a script/agentic workflow to automate a time-consuming task.",
    "My goal is to build well designed and managed institutions capable of transforming both small and large scale communities. I believe these kind of institutions not only need engineering skills to identify core problems (or opportunities) and design technical solutions, but also business knowledge to design the institutional framework required for these solutions to have a lasting impact. I'm especially interested in applying this approach in areas like education and finance to build the kinds of sustainable systems that become engines for opportunity and community growth.",
    "Some of my favorite books are Why Nations Fail, Plato's Republic, and Weapons of Math Destruction. I'd love to chat about any of them, so feel free to send me an email!",
    "When I'm not working, you can usually find me reading, fixing my Linux setup (after it inevitably breaks in my quest to get sub 8 second boot), or playing Poker and MTG.",
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

// Apps that actually run live, in-browser, on this site — backed by packages/* in the
// monorepo (see CLAUDE.md). Shown both as a quick-jump list in the sidebar and as
// highlighted cards on the Portfolio page. `status: "soon"` renders as non-clickable.
export const webApps = [
  {
    name: "Poker Odds Simulator",
    description: "Monte Carlo hand-equity simulator — see how your odds shift street by street.",
    tags: ["Python", "Monte Carlo"],
    status: "live",
    href: "/apps/poker",
    noAI: true,
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
