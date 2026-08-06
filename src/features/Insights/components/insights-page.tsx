"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Ht } from "@/src/data/neighborhoods";
import { InsightCategory, insightArticles, insightCategories } from "@/src/data/insights";
import FindMyProjectModal from "@/src/features/FindMyProject/components/FindMyProjectModal";
import { SiteFooter } from "@/src/features/Home/components/site-footer";

export function InsightsPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<InsightCategory>("All");
  const [isMatcherOpen, setIsMatcherOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 18);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredArticles = useMemo(() => {
    if (activeCategory === "All") return insightArticles;
    return insightArticles.filter((article) => article.category === activeCategory);
  }, [activeCategory]);

  return (
    <main className="insights-page">
      <header className={isScrolled ? "site-header insights-header insights-header-scrolled" : "site-header insights-header"}>
        <Link href="/" className="logo-link" aria-label="Miami New Development home">
          <Image
            src="/images/logo.png"
            alt="Miami New Development"
            width={220}
            height={58}
            className="site-logo h-auto w-[82px] md:w-[96px]"
            priority
          />
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <Link href="/map">
            <span className="insights-nav-link-label">Explore Map</span>
          </Link>
          <button type="button" className="insights-nav-button" onClick={() => setIsMatcherOpen(true)}>
            <span className="insights-nav-link-label">Find My Project</span>
          </button>
          <div className="relative group">
            <button
              type="button"
              className="nav-dropdown insights-nav-button flex items-center gap-1"
              onClick={() => router.push("/neighborhood")}
            >
              <span className="insights-nav-link-label">Neighborhoods</span>
              <span aria-hidden="true">⌄</span>
            </button>
            <div className="absolute top-full left-1/2 z-50 mt-2 grid w-80 -translate-x-1/2 grid-cols-2 gap-x-4 gap-y-2 rounded border border-white/10 bg-[#0C1523]/95 p-4 text-left opacity-0 invisible shadow-2xl backdrop-blur-md transition-all duration-300 group-hover:visible group-hover:opacity-100">
              {Object.entries(Ht).map(([slug, data]) => (
                <button
                  key={slug}
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push(`/neighborhood/${slug}`);
                  }}
                  className="py-1 text-left text-[10px] uppercase tracking-[0.1em] text-gray-300 transition-colors hover:text-[#C9A84C]"
                >
                  {data.name}
                </button>
              ))}
            </div>
          </div>
          <Link href="/waterfront">
            <span className="insights-nav-link-label">Waterfront Estates</span>
          </Link>
          <Link href="/insights" className="insights-nav-active">
            <span className="insights-nav-link-label">Insights</span>
          </Link>
        </nav>
        <div className="insights-header-tools">
          <a href="#insights-briefing" className="insights-header-inquire">
            <span className="insights-nav-link-label">Inquire</span>
          </a>
          <div className="insights-weather-widget" aria-label="Miami weather">
            <span className="insights-weather-icon" aria-hidden="true">
              ☁
            </span>
            <span className="insights-weather-temp">81°</span>
          </div>
        </div>
      </header>

      <section className="insights-hero">
        <div className="insights-shell">
          <div className="insights-kicker">Market Intelligence · Miami New Development</div>
          <h1>
            New Construction
            <br />
            <em>Intelligence</em>
          </h1>
          <p>
            Pre-construction analysis, neighborhood intelligence, and buyer guides updated
            regularly.
          </p>
        </div>
      </section>

      <section className="insights-filter-row">
        <div className="insights-shell">
          <div className="insights-filter-tabs" role="tablist" aria-label="Filter by category">
            {insightCategories.map((category) => {
              const active = category === activeCategory;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={active ? "insights-filter-tab is-active" : "insights-filter-tab"}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="insights-grid-section">
        <div className="insights-shell insights-editorial-grid">
          {filteredArticles.map((article, index) => (
            <Link
              key={article.slug}
              href={`/insights/${article.slug}`}
              className="insights-editorial-card"
            >
              <div className="insights-editorial-img-wrap">
                <img
                  className="insights-editorial-img"
                  src={article.heroImage}
                  alt={article.title}
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </div>
              <div className="insights-editorial-card-body">
                <div className="insights-editorial-category">{article.category}</div>
                <h2 className="insights-editorial-title">{article.title}</h2>
                <p className="insights-editorial-excerpt">{article.excerpt}</p>
                <div className="insights-editorial-meta">
                  <span>{article.date}</span>
                  <span>{article.readTime}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="insights-briefing" id="insights-briefing">
        <div className="insights-shell insights-briefing-inner">
          <div className="insights-briefing-kicker">Exclusive Briefings</div>
          <h2>Receive Miami Market Intelligence</h2>
          <p>
            Zachary Akers&apos;s exclusive list receives pre-launch pricing, off-market inventory, and
            monthly market updates before anything reaches public channels.
          </p>
          <form className="insights-briefing-form">
            <input type="email" placeholder="Your email address" aria-label="Email address" />
            <button type="submit">Join</button>
          </form>
        </div>
      </section>

      <SiteFooter />

      {isMatcherOpen && (
        <FindMyProjectModal
          onClose={() => setIsMatcherOpen(false)}
          onDone={(results) => {
            setIsMatcherOpen(false);
            localStorage.setItem("map-matcher-prefs", JSON.stringify(results.prefs));
            router.push("/map");
          }}
        />
      )}
    </main>
  );
}
