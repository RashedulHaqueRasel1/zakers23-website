"use client";

import Image from "next/image";
import Link from "next/link";
import type { HeroSlide } from "@/src/features/Home/HeroSection/types/hero-section.types";
import { useHeroSlider } from "@/src/features/Home/HeroSection/hooks/use-hero-slider";
import { handleImageError } from "@/src/lib/image-utils";

type HeroSectionProps = {
  slides: HeroSlide[];
};

export function HeroSection({ slides }: HeroSectionProps) {
  const {
    heroRef,
    activeSlide,
    setActiveSlide,
    showNextSlide,
    showPrevSlide,
    handleTouchStart,
    handleTouchEnd,
  } = useHeroSlider({ slideCount: slides.length });

  return (
    <section
      ref={heroRef}
      className="hero hero-scroll-lock"
      id="top"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="hero-sticky-frame">
        {slides.map((slide, index) => (
          <div
            key={slide.title}
            className={`hero-slide ${index === activeSlide ? "is-active" : ""}`}
            aria-hidden={index !== activeSlide}
          >
            <Image
              fill
              priority={index === 0}
              src={slide.image}
              alt={slide.title}
              className="hero-image"
              style={{ objectPosition: slide.position || "center center" }}
              onError={handleImageError}
            />
            <div className="hero-gradient hero-gradient-top" />
            <div className="hero-gradient hero-gradient-bottom" />
            <div className="hero-content">
              <div className="hero-copy">
                <p className="hero-eyebrow">{slide.eyebrow}</p>
                {index === 0 ? <h1>{slide.title}</h1> : <h2>{slide.title}</h2>}
                <p className="hero-supporting">{slide.supporting}</p>
              </div>
              <div className="hero-actions">
                {slide.slug ? (
                  <Link className="cta-primary" href={`/property/${slide.slug}`}>
                    View project
                  </Link>
                ) : (
                  <a className="cta-primary" href="#featured-projects">
                    View project
                  </a>
                )}
                <p className="hero-credit">{slide.credit}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Slide Counter for Mobile */}
        <div className="hero-mobile-counter" aria-hidden="true">
          <span>0{activeSlide + 1}</span>
          <span className="hero-mobile-counter-divider">/</span>
          <span>0{slides.length}</span>
        </div>

        <div className="hero-nav-cluster" aria-label="Hero navigation">
          <button type="button" className="hero-arrow" onClick={showPrevSlide} aria-label="Previous slide">
            <ArrowIcon direction="left" />
          </button>
          <div className="hero-nav">
            {slides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                className={`hero-indicator ${index === activeSlide ? "is-active" : ""}`}
                onClick={() => setActiveSlide(index)}
                aria-label={`Go to ${slide.title}`}
              />
            ))}
          </div>
          <button type="button" className="hero-arrow" onClick={showNextSlide} aria-label="Next slide">
            <ArrowIcon direction="right" />
          </button>
        </div>
      </div>
    </section>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`hero-arrow-icon hero-arrow-icon--${direction}`}
      fill="none"
    >
      <path d={direction === "left" ? "M14 6l-6 6 6 6" : "M10 6l6 6-6 6"} />
    </svg>
  );
}
