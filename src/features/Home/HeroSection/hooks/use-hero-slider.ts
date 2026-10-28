"use client";

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";

type UseHeroSliderOptions = {
  slideCount: number;
};

export function useHeroSlider({ slideCount }: UseHeroSliderOptions) {
  const lenis = useLenis();
  const [activeSlide, setActiveSlide] = useState(0);
  const heroRef = useRef<HTMLElement | null>(null);
  const isAnimatingRef = useRef(false);
  const wheelDeltaRef = useRef(0);

  const goToSlide = (index: number) => {
    const boundedIndex = Math.max(0, Math.min(index, slideCount - 1));

    setActiveSlide(boundedIndex);
    isAnimatingRef.current = true;

    window.setTimeout(() => {
      isAnimatingRef.current = false;
    }, 650);
  };

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const showNextSlide = () => {
    const nextIndex = (activeSlide + 1) % slideCount;
    goToSlide(nextIndex);
  };

  const showPrevSlide = () => {
    const prevIndex = (activeSlide - 1 + slideCount) % slideCount;
    goToSlide(prevIndex);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    touchStartXRef.current = event.touches[0].clientX;
    touchStartYRef.current = event.touches[0].clientY;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = event.changedTouches[0].clientY - touchStartYRef.current;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        showNextSlide();
      } else {
        showPrevSlide();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleHeroWheel = (event: React.WheelEvent<HTMLElement>) => {
    if (!heroRef.current || window.innerWidth < 1024 || Math.abs(event.deltaY) < 3) {
      return;
    }

    const rect = heroRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const inHeroWindow = rect.top <= 1 && rect.bottom >= viewportHeight - 1;
    
    if (!inHeroWindow) {
      lenis?.start();
      return;
    }

    const tryingToAdvance = event.deltaY > 0 && activeSlide < slideCount - 1;
    const tryingToReverse = event.deltaY < 0 && activeSlide > 0;

    if (tryingToAdvance || tryingToReverse) {
      lenis?.stop();
      if (event.cancelable) {
        event.preventDefault();
      }
    } else {
      lenis?.start();
      return;
    }

    wheelDeltaRef.current += event.deltaY;

    if (isAnimatingRef.current || Math.abs(wheelDeltaRef.current) < 22) {
      return;
    }

    if (tryingToAdvance) {
      wheelDeltaRef.current = 0;
      goToSlide(activeSlide + 1);
    } else if (tryingToReverse) {
      wheelDeltaRef.current = 0;
      goToSlide(activeSlide - 1);
    }
  };

  useEffect(() => {
    const onWindowWheel = (event: WheelEvent) => {
      if (!heroRef.current || window.innerWidth < 1024 || Math.abs(event.deltaY) < 3) {
        return;
      }

      const rect = heroRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const inHeroWindow = rect.top <= 1 && rect.bottom >= viewportHeight - 1;

      if (!inHeroWindow) {
        lenis?.start();
        return;
      }

      const tryingToAdvance = event.deltaY > 0 && activeSlide < slideCount - 1;
      const tryingToReverse = event.deltaY < 0 && activeSlide > 0;

      if (tryingToAdvance || tryingToReverse) {
        lenis?.stop();
        event.preventDefault();
      } else {
        lenis?.start();
        return;
      }

      wheelDeltaRef.current += event.deltaY;

      if (isAnimatingRef.current || Math.abs(wheelDeltaRef.current) < 22) {
        return;
      }

      if (tryingToAdvance) {
        wheelDeltaRef.current = 0;
        goToSlide(activeSlide + 1);
      } else if (tryingToReverse) {
        wheelDeltaRef.current = 0;
        goToSlide(activeSlide - 1);
      }
    };

    window.addEventListener("wheel", onWindowWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWindowWheel);
      lenis?.start();
    };
  }, [activeSlide, slideCount, lenis]);

  // Auto-swap slides every 3 seconds ONLY on mobile (< 1024px)
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      // Only swap on mobile/tablet screens (< 1024px) and when page is active
      if (typeof window === "undefined" || window.innerWidth >= 1024 || document.hidden) {
        return;
      }

      // Pause if hero is scrolled out of view
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
          return;
        }
      }

      goToSlide((activeSlide + 1) % slideCount);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeSlide, slideCount]);

  return {
    heroRef,
    activeSlide,
    setActiveSlide: goToSlide,
    showNextSlide,
    showPrevSlide,
    handleHeroWheel,
    handleTouchStart,
    handleTouchEnd,
  };
}
