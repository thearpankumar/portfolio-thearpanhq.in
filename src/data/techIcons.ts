// Icons drawn onto the tech-stack spheres. Files live in public/images/tech
// (skillicons.dev "light" theme for the SVGs, plus a few from other sources).
export type TechIcon = {
  src: string;
  // draw a rounded tile behind icons that ship without one
  tile?: string;
};

const svg = (name: string): TechIcon => ({ src: `/images/tech/${name}.svg` });
const png = (name: string, tile?: string): TechIcon => ({
  src: `/images/tech/${name}.png`,
  tile,
});

export const techIcons: TechIcon[] = [
  ...[
    "c",
    "python",
    "rust",
    "go",
    "aws",
    "gcp",
    "cloudflare",
    "androidstudio",
    "flutter",
    "kotlin",
    "arduino",
    "raspberrypi",
    "flask",
    "django",
    "graphql",
    "nginx",
    "postgresql",
    "redis",
    "rabbitmq",
    "kafka",
    "pytorch",
    "tensorflow",
    "opencv",
    "anaconda",
    "docker",
    "kubernetes",
    "jenkins",
    "githubactions",
    "terraform",
    "prometheus",
    "grafana",
    "ubuntu",
    "arch",
    "redhat",
    "git",
    "neovim",
    "vscode",
    "postman",
  ].map(svg),
  png("mssql"),
  png("cuda"),
  png("zephyr", "#1c1c1c"),
  { src: "/images/tech/fastapi.svg", tile: "#1c1c1c" },
];
