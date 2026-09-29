import { useEffect, useRef } from "react";
import { MdArrowOutward, MdCopyright } from "react-icons/md";
import "./styles/Contact.css";

const socials = [
  { label: "Github", href: "https://github.com/thearpankumar" },
  { label: "Linkedin", href: "https://linkedin.com/in/thearpankumar" },
  { label: "Twitter", href: "#" },
  { label: "Instagram", href: "https://instagram.com/arpankumar1119" },
];

const Contact = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Only decode the video while the footer is actually on screen
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { rootMargin: "100px" }
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return (
    <footer className="contact-section" id="contact">
      <div className="contact-hole" aria-hidden>
        <video
          ref={videoRef}
          src="/videos/blackhole.webm"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      </div>

      <div className="contact-container section-container">
        <p className="contact-kicker">Contact</p>
        <h3 className="contact-title">
          Let&apos;s build something <span>together</span>
        </h3>
        <a
          className="contact-mail"
          href="mailto:arpankumar1119@gmail.com"
          data-cursor="disable"
        >
          arpankumar1119@gmail.com <MdArrowOutward />
        </a>

        <div className="contact-flex">
          {/* Desktop: the fixed side icons glide into these slots (SocialIcons.tsx) */}
          <div className="contact-box contact-icons-box">
            <h4>Find me</h4>
            <div className="contact-icons-slot" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span className="contact-icon-target" key={i} />
              ))}
            </div>
          </div>
          {/* Small screens have no side icons, so keep the phone number */}
          <div className="contact-box contact-phone">
            <h4>Phone</h4>
            <a href="tel:+9199999999" data-cursor="disable">
              +91 99999 99999
            </a>
          </div>
          <div className="contact-box contact-socials">
            <h4>Social</h4>
            <div className="contact-social-list">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="disable"
                  className="contact-social"
                >
                  {s.label} <MdArrowOutward />
                </a>
              ))}
            </div>
          </div>
          <div className="contact-box contact-credit">
            <h2>
              Designed and Developed <br /> by <span>Arpan Kumar</span>
            </h2>
            <h5>
              <MdCopyright /> 2026
            </h5>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Contact;
