<div align="center">

# Arpan Kumar — Portfolio

A scroll-driven 3D portfolio: a character that follows you down the page, a starfield behind everything, pinned sections, a shader transition between them and a black hole in the footer.

[![CI & Deploy](https://img.shields.io/github/actions/workflow/status/thearpankumar/portfolio-thearpanhq.in/ci.yml?branch=main&label=CI%20%26%20Deploy&logo=githubactions&logoColor=white&style=flat-square)](https://github.com/thearpankumar/portfolio-thearpanhq.in/actions/workflows/ci.yml)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fthearpanhq.in&label=thearpanhq.in&logo=vercel&logoColor=white&style=flat-square)](https://thearpanhq.in)
[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg?style=flat-square)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/thearpankumar/portfolio-thearpanhq.in?style=flat-square&color=red)](https://github.com/thearpankumar/portfolio-thearpanhq.in/commits/main)
[![Commit activity](https://img.shields.io/github/commit-activity/m/thearpankumar/portfolio-thearpanhq.in?style=flat-square&color=orange)](https://github.com/thearpankumar/portfolio-thearpanhq.in/graphs/commit-activity)
![Repo size](https://img.shields.io/github/repo-size/thearpankumar/portfolio-thearpanhq.in?style=flat-square&color=red)
[![React](https://img.shields.io/github/package-json/dependency-version/thearpankumar/portfolio-thearpanhq.in/react?label=React&logo=react&logoColor=61DAFB&color=20232A&style=flat-square)](https://www.npmjs.com/package/react)
![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?style=flat-square&logo=typescript&logoColor=white)
[![Vite](https://img.shields.io/github/package-json/dependency-version/thearpankumar/portfolio-thearpanhq.in/dev/vite?label=Vite&logo=vite&logoColor=white&color=646CFF&style=flat-square)](https://www.npmjs.com/package/vite)
[![Three.js](https://img.shields.io/github/package-json/dependency-version/thearpankumar/portfolio-thearpanhq.in/three?label=Three.js&logo=threedotjs&logoColor=white&color=000000&style=flat-square)](https://www.npmjs.com/package/three)
[![R3F](https://img.shields.io/github/package-json/dependency-version/thearpankumar/portfolio-thearpanhq.in/@react-three/fiber?label=R3F&logo=react&logoColor=61DAFB&color=000000&style=flat-square)](https://www.npmjs.com/package/@react-three/fiber)
[![GSAP](https://img.shields.io/github/package-json/dependency-version/thearpankumar/portfolio-thearpanhq.in/gsap?label=GSAP&logo=greensock&logoColor=white&color=88CE02&style=flat-square)](https://www.npmjs.com/package/gsap)
![Node](https://img.shields.io/badge/Node-22%2B%20%7C%2024%2B-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)
![WebGL](https://img.shields.io/badge/WebGL-2-990000?style=flat-square&logo=webgl&logoColor=white)
![GLSL](https://img.shields.io/badge/GLSL-shaders-5586A4?style=flat-square&logo=opengl&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

</div>

---
## Preview - **[thearpanhq.in](https://thearpanhq.in)**

### Preloader Section
![Preview](docs/PreLoaderSection.gif)

### Intro Section
![Preview](docs/IntroSection.gif)

### Career Section
![Preview](docs/CareerSection.gif)

### Project Section
![Preview](docs/ProjectSection.gif)

### Tech Stack Section
![Preview](docs/TechStackSection.gif)

### Contact Section
![Preview](docs/ContactSection.gif)

## Highlights

- **3D character** (Three.js) that reacts to the cursor and changes pose as you scroll.
- **Smooth, pinned scrolling** with GSAP ScrollTrigger and ScrollSmoother: About and What I Do hold still while they are read, a wheel-style career timeline, a horizontal Work gallery and a statement that slides across the screen.
- **Shader transitions** (GLSL) between the career, work and tech-stack sections.
- **Physics tech stack**: 50 icon-covered spheres you can push around (react-three-fiber + cannon-es, running in a Web Worker).
- **Always-on starfield** rendered on its own canvas, independent of everything else.
- **Footer** with a looping black-hole video; the side social icons glide into it and settle in a row.
- **Handwritten preloader** ("Bonjour, mon ami !") drawn stroke by stroke on an OffscreenCanvas in a Web Worker, so it stays smooth while the page loads.
- **Resume orb**: a ring of text around the logo that spins and fans out DevOps / Cyber Security / Software Developer buttons on hover.
- Respects `prefers-reduced-motion`.

## Tech stack

| Area | Tools |
| --- | --- |
| Framework | React 19, TypeScript 7, Vite 8 |
| 3D | Three.js, @react-three/fiber, @react-three/drei, @react-three/cannon, @react-three/postprocessing |
| Animation | GSAP (ScrollTrigger, ScrollSmoother, SplitText), CSS `cos()`/`sin()` for the radial menu |
| Quality | ESLint 10 (typescript-eslint), `tsc`, `npm audit` |
| CI/CD | GitHub Actions → Vercel CLI |

## Getting started

Requires **Node 20.19+ or 22.12+** (Vite 8).

```bash
git clone https://github.com/thearpankumar/portfolio-thearpanhq.in.git
cd portfolio-thearpanhq.in
npm ci
npm run dev
```

Open the address Vite prints (usually http://localhost:5173).

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check only |
| `npm run assets:brand` | Regenerate the OG image and icons from `public/images/logo.png` |
| `npm run assets:model` | Compress (Meshopt) and re-encrypt the character model |

## License

[MIT](LICENSE) © 2026 Arpan Kumar
