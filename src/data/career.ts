export type CareerItem = {
  year: number;
  /** Left out when only the year is known; the quarter ring then rests unlit. */
  quarter?: 1 | 2 | 3 | 4;
  headline: string;
  desc: string;
};

/**
 * The career wheel's milestones, oldest first. The year ring is built from the
 * first and last year here, and a milestone's place on the quarter ring comes
 * from `quarter`. Keep headline and desc free of double quotes: the build copies
 * this list into index.html with a regex (see the seo plugin in vite.config.ts).
 */
export const careerItems: readonly CareerItem[] = [
  {
    year: 2020,
    headline: "Started in Cybersecurity and Software",
    desc: "Started learning cybersecurity and software development, the foundation for everything built since.",
  },
  {
    year: 2023,
    headline: "Freelance Developer, Fiverr",
    desc: "Started freelancing on Fiverr, delivering software projects for clients.",
  },
  {
    year: 2024,
    quarter: 2,
    headline: "First Government Funding, New Gen IDC",
    desc: "Won first government funding under the New Gen IDC programme to build an anti-drone system.",
  },
  {
    year: 2024,
    quarter: 3,
    headline: "Founder, CENTINELS at SRM IST",
    desc: "Founded CENTINELS, the first project-based cybersecurity club at SRM IST.",
  },
  {
    year: 2025,
    quarter: 1,
    headline: "Second Government Funding, EncryptiV",
    desc: "Secured a second round of New Gen IDC funding to develop EncryptiV.",
  },
  {
    year: 2025,
    quarter: 3,
    headline: "Smart India Hackathon Nationals",
    desc: "Qualified for the national round of the Smart India Hackathon.",
  },
  {
    year: 2025,
    quarter: 4,
    headline: "Rocket Avionics Engineer",
    desc: "Third funding, INR 11 lakh from SRM IST, for a rocket with India's first graphite-based motor. I built its long-range telemetry link for sensor data.",
  },
  {
    year: 2025,
    quarter: 4,
    headline: "Open Source Contributor, Kestra",
    desc: "Contributed to the open-source Kestra ecosystem during Hacktoberfest.",
  },
  {
    year: 2026,
    quarter: 1,
    headline: "CTO, Xenkrypt Technologies",
    desc: "EncryptiV grew into Xenkrypt Technologies Pvt. Ltd., where I served as Chief Technology Officer.",
  },
  {
    year: 2026,
    quarter: 3,
    headline: "Software Developer, Talencia Global",
    desc: "Joined Talencia Global as a Software Developer.",
  },
];
