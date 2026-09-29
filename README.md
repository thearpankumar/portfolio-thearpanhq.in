<div align="center">

# Arpan Kumar — Portfolio

A scroll-driven 3D portfolio: a character that follows you down the page, a starfield behind everything, pinned sections, a shader transition between them and a black hole in the footer.

**[thearpanhq.in](https://thearpanhq.in)**

[![CI & Deploy](https://github.com/thearpankumar/portfolio-thearpanhq.in/actions/workflows/ci.yml/badge.svg)](https://github.com/thearpankumar/portfolio-thearpanhq.in/actions/workflows/ci.yml)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fthearpanhq.in&label=thearpanhq.in&logo=vercel&logoColor=white)](https://thearpanhq.in)
[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE)
![Last commit](https://img.shields.io/github/last-commit/thearpankumar/portfolio-thearpanhq.in?color=red)
![Repo size](https://img.shields.io/github/repo-size/thearpankumar/portfolio-thearpanhq.in?color=red)

![React](https://img.shields.io/badge/React-18-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r168-000000?logo=threedotjs&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-3.15-88CE02?logo=greensock&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel&logoColor=white)

</div>

---
## Preview 

![Preview](public/readme/preview.gif)

## Highlights

- **3D character** (Three.js) that reacts to the cursor and changes pose as you scroll.
- **Smooth, pinned scrolling** with GSAP ScrollTrigger and ScrollSmoother: About and What I Do hold still while they are read, a wheel-style career timeline, a horizontal Work gallery and a statement that slides across the screen.
- **Shader transitions** (GLSL) between the career, work and tech-stack sections.
- **Physics tech stack**: 50 icon-covered spheres you can push around (react-three-fiber + Rapier).
- **Always-on starfield** rendered on its own canvas, independent of everything else.
- **Footer** with a looping black-hole video; the side social icons glide into it and settle in a row.
- **Handwritten preloader** ("Bonjour, mon ami !") drawn stroke by stroke on an OffscreenCanvas in a Web Worker, so it stays smooth while the page loads.
- **Resume orb**: a ring of text around the logo that spins and fans out DevOps / Cyber Security / Software Developer buttons on hover.
- Respects `prefers-reduced-motion`.

## Tech stack

| Area | Tools |
| --- | --- |
| Framework | React 18, TypeScript, Vite 7 |
| 3D | Three.js, @react-three/fiber, @react-three/drei, @react-three/rapier, @react-three/postprocessing |
| Animation | GSAP (ScrollTrigger, ScrollSmoother, SplitText), CSS `cos()`/`sin()` for the radial menu |
| Quality | ESLint (typescript-eslint), `tsc`, `npm audit` |
| CI/CD | GitHub Actions → Vercel CLI |

## Getting started

Requires **Node 20.19+ or 22.12+** (Vite 7).

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

## License

[MIT](LICENSE) © 2026 Arpan Kumar
