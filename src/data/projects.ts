import adaptationGeneImg from "../assets/projects/adaptation-gene.svg";
import attendixImg from "../assets/projects/attendix.svg";
import axionyxImg from "../assets/projects/axionyx.svg";
import blackiceosImg from "../assets/projects/blackiceos.svg";
import ccuMembraneImg from "../assets/projects/ccu-membrane.svg";
import encrypt5ProtocolsImg from "../assets/projects/encrypt5-protocols.svg";
import encryptivImg from "../assets/projects/encryptiv.svg";
import instructifyImg from "../assets/projects/instructify.svg";
import jetayuImg from "../assets/projects/jetayu.svg";
import kestraAiImg from "../assets/projects/kestra-ai.svg";
import kestraDocumentdbImg from "../assets/projects/kestra-documentdb.svg";
import kestraOdooImg from "../assets/projects/kestra-odoo.svg";
import medlensImg from "../assets/projects/medlens.svg";
import mfauthImg from "../assets/projects/mfauth.svg";
import multilingualRagImg from "../assets/projects/multilingual-rag.svg";
import nginxMlkemImg from "../assets/projects/nginx-mlkem.svg";
import plantdocImg from "../assets/projects/plantdoc.svg";
import qkdMailImg from "../assets/projects/qkd-mail.svg";
import sentrixImg from "../assets/projects/sentrix.svg";
import tridantImg from "../assets/projects/tridant.svg";

export type Project = {
  title: string;
  description: string;
  year: string;
  tags: readonly string[];
  /** Thumbnail URL — imported from src/assets so Vite hashes it. */
  image: string;
  /** Where the card links to. Without one the card isn't a link. */
  url?: string;
};

const GITHUB = "https://github.com/thearpankumar";

/**
 * The Work section's glass capsules, in the order they ride up the helix. Swap `image` for a
 * real screenshot by dropping it in src/assets/projects and changing the import above.
 * Keep titles to ~18 characters and descriptions to ~70 so a card's text fits its slab.
 */
export const projects: readonly Project[] = [
  {
    title: "Axionyx",
    description:
      "AI-assisted control and monitoring of modular biomedical lab devices.",
    year: "2025",
    tags: ["Flutter", "ESP32", "Next.js"],
    image: axionyxImg,
    url: `${GITHUB}/Axionyx`,
  },
  {
    title: "Multilingual RAG",
    description:
      "Gemini-first document Q&A with a GPU-accelerated Qdrant RAG fallback.",
    year: "2025",
    tags: ["FastAPI", "Qdrant", "Gemini"],
    image: multilingualRagImg,
    url: `${GITHUB}/GPUaccelerated-multilingual-RAG`,
  },
  {
    title: "Tridant Firmware",
    description:
      "Rocket and CanSat flight firmware with LoRa telemetry to a base station.",
    year: "2026",
    tags: ["C++", "Teensy", "LoRa"],
    image: tridantImg,
    url: `${GITHUB}/Tridant-Rocket-Firmware`,
  },
  {
    title: "QKD Mail Client",
    description:
      "Rust + Tauri email client secured with QKD, ML-KEM and TLS 1.3.",
    year: "2025",
    tags: ["Rust", "Tauri", "PQC"],
    image: qkdMailImg,
    url: `${GITHUB}/MailClient_with_QKD`,
  },
  {
    title: "Encrypt5 Protocols",
    description:
      "Quantum-resistant toolkit: GPU AES, Kyber/Dilithium, Double Ratchet.",
    year: "2024",
    tags: ["CUDA", "Rust", "PQC"],
    image: encrypt5ProtocolsImg,
    url: `${GITHUB}/Encrypt5_SecurityProtocols`,
  },
  {
    title: "BlackIceOS",
    description:
      "Agentic AI OS that runs the desktop by voice or text for security work.",
    year: "2025",
    tags: ["MCP", "Linux", "Gemini"],
    image: blackiceosImg,
    url: `${GITHUB}/Project-BlackIceOS`,
  },
  {
    title: "Instructify",
    description:
      "AI live classroom with an on-device tutor and auto-generated notes.",
    year: "2025",
    tags: ["Next.js", "WebRTC", "FastAPI"],
    image: instructifyImg,
    url: `${GITHUB}/Instructify`,
  },
  {
    title: "EncryptiV",
    description: "Cloud-native file encryption as microservices on Kubernetes.",
    year: "2024",
    tags: ["Kubernetes", "Flask", "RabbitMQ"],
    image: encryptivImg,
    url: `${GITHUB}/Micro-services-Encrypt5`,
  },
  {
    title: "CCU Membrane ML",
    description:
      "XGBoost ranking of nano-materials by CO₂ adsorption for carbon capture.",
    year: "2025",
    tags: ["XGBoost", "Python", "ML"],
    image: ccuMembraneImg,
    url: `${GITHUB}/CCU-Prediction-Nano-Enabled-Membrane-ML`,
  },
  {
    title: "Adaptation Gene ML",
    description:
      "Predicts which D. radiodurans genes drive extreme stress survival.",
    year: "2025",
    tags: ["Python", "Genomics", "ML"],
    image: adaptationGeneImg,
    url: `${GITHUB}/Adaptation-Gene-Prediction`,
  },
  {
    title: "Nginx ML-KEM",
    description:
      "One script to serve Nginx over post-quantum TLS 1.3 with OQS.",
    year: "2025",
    tags: ["Bash", "Nginx", "OQS"],
    image: nginxMlkemImg,
    url: `${GITHUB}/nginx-mlkem`,
  },
  {
    title: "MedLens AI",
    description:
      "DICOM viewer with Gemini prompt-guided detection on medical scans.",
    year: "2024",
    tags: ["Gemini", "DICOM", "Streamlit"],
    image: medlensImg,
    url: `${GITHUB}/AI-Medical-Image-Scanner`,
  },
  {
    title: "PlantDoc",
    description:
      "SIH 2024: CNN that detects plant and rice-leaf disease from photos.",
    year: "2024",
    tags: ["TensorFlow", "Keras", "Streamlit"],
    image: plantdocImg,
    url: `${GITHUB}/ML-Plantdoc`,
  },
  {
    title: "MFAuth",
    description:
      "My own working MFA: RFC 6238 TOTP, HOTP and JWT-secured sessions.",
    year: "2024",
    tags: ["Node.js", "TOTP", "JWT"],
    image: mfauthImg,
    url: `${GITHUB}/MFAuth`,
  },
  {
    title: "JETayu",
    description:
      "Mars-rover automation code for Team RUDRA: IMU, sensors, HC-12 radio.",
    year: "2023",
    tags: ["C++", "Arduino", "Pico"],
    image: jetayuImg,
    url: `${GITHUB}/JETayu`,
  },
  {
    title: "KestraAI",
    description:
      "Open-source contributor to Kestra, the universal workflow orchestrator.",
    year: "2025",
    tags: ["Java", "Open Source", "Kestra"],
    image: kestraAiImg,
    url: `${GITHUB}/kestra-ai`,
  },
  {
    title: "Kestra Odoo Plugin",
    description:
      "Official Kestra plugin for Odoo ERP over XML-RPC, merged upstream.",
    year: "2025",
    tags: ["Java", "Kestra", "Odoo"],
    image: kestraOdooImg,
    url: "https://github.com/kestra-io/plugin-odoo",
  },
  {
    title: "Kestra DocumentDB",
    description:
      "Official Kestra plugin for DocumentDB insert and read, merged upstream.",
    year: "2025",
    tags: ["Java", "Kestra", "DocumentDB"],
    image: kestraDocumentdbImg,
    url: "https://github.com/kestra-io/plugin-documentdb",
  },
  {
    title: "Sentrix",
    description:
      "AI-native orchestrator for an ecosystem of 1500+ security tools.",
    year: "2025",
    tags: ["AI Agents", "Security", "1500+ Tools"],
    image: sentrixImg,
  },
  {
    title: "Attendix",
    description:
      "Geotagged attendance with WebAuthn biometrics and anti-spoof checks.",
    year: "2026",
    tags: ["Rust", "WebAuthn", "MediaPipe"],
    image: attendixImg,
    url: `${GITHUB}/Attendix-tgl`,
  },
];
