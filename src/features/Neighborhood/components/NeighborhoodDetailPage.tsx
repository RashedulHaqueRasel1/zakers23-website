"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import { Ht, getNeighborhoodNames, getNeighborhoodSlug } from "@/src/data/neighborhoods";
import projectsRaw from "@/src/data/miami-projects.json";
import FindMyProjectModal from "@/src/features/FindMyProject/components/FindMyProjectModal";
import { SiteFooter } from "@/src/features/Home/components/site-footer";
import { submitInquiry } from "@/src/lib/inquiry";
import { useInquiry } from "@/src/features/inquiry/components/inquiry-provider";

// Type definitions
interface MapProject {
  id: number;
  slug: string;
  name: string;
  neighborhood: string;
  stage: string;
  lat: number;
  lng: number;
  minPrice: number | null;
  maxPrice: number | null;
  minBed: number | null;
  maxBed: number | null;
  priceFrom: string;
  completion: string;
  units: number | null;
  stories?: number | null;
  height?: number | null;
  pricePerSqft: number | null;
  comingSoon?: boolean;
  badge?: string;
  img: string;
}

interface StageConfig {
  label: string;
  dot: string;
  border: string;
}

const STAGES: Record<string, StageConfig> = {
  preconstruction: { label: "Pre-Construction", dot: "#f59e0b", border: "#d97706" },
  under_construction: { label: "Under Construction", dot: "#0284c7", border: "#0369a1" },
  topped_off: { label: "Topped Off", dot: "#6366f1", border: "#4f46e5" },
  move_in_ready: { label: "Move-In Ready", dot: "#10b981", border: "#059669" },
};

function getStageConfig(stage: string): StageConfig {
  return STAGES[stage] || { label: "Pre-Construction", dot: "#f59e0b", border: "#d97706" };
}

// Helper to format price numbers into short text (e.g. $3M, $500K)
function formatPriceNum(val: number): string {
  if (val >= 1000000) {
    const millions = val / 1000000;
    return `$${millions.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (val >= 1000) {
    return `$${(val / 1000).toFixed(0)}K`;
  }
  return `$${val}`;
}

// Formats a generic string price (e.g., "$1.5M")
function formatPriceStr(price: string | number | null | undefined): string {
  if (price === null || price === undefined) return "—";
  const str = String(price).trim();
  if (!str) return "—";
  if (str.startsWith("$")) return str;
  const num = parseFloat(str);
  if (!isNaN(num)) {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1).replace(/\.0$/, "")}M+`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K+`;
    return `$${num}`;
  }
  return str;
}

// Extracts years from completion text
function extractYears(completion: string | null | undefined): number[] {
  if (!completion) return [];
  const matches = [...String(completion).matchAll(/\b20\d{2}\b/g)];
  return matches.map((m) => parseInt(m[0], 10));
}

// Calculates stats for dashboard
function calculateStats(projects: MapProject[]) {
  const count = projects.length;
  const mins = projects.map((o) => o.minPrice).filter((o): o is number => o != null && o > 0);
  const maxs = projects.map((o) => o.maxPrice).filter((o): o is number => o != null && o > 0);
  
  const minVal = mins.length ? Math.min(...mins) : null;
  const maxVal = maxs.length ? Math.max(...maxs) : minVal;
  const priceLabel = minVal != null && maxVal != null ? `${formatPriceNum(minVal)} – ${formatPriceNum(maxVal)}` : "Contact for pricing";
  
  const psfList = projects
    .map((o) => o.pricePerSqft)
    .filter((o): o is number => typeof o === "number" && !Number.isNaN(o));
  const avgSqft = psfList.length > 0 ? Math.round(psfList.reduce((sum, val) => sum + val, 0) / psfList.length) : null;
  const avgPsfLabel = avgSqft != null ? `$${avgSqft.toLocaleString()}/sf` : "—";
  
  const years = projects.flatMap((o) => extractYears(o.completion));
  let deliveryLabel = "—";
  if (years.length) {
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    deliveryLabel = minYear === maxYear ? `${minYear}` : `${minYear}–${maxYear}`;
  }
  
  return { count, priceLabel, avgPsfLabel, deliveryLabel };
}

// Helper to get project primary image
function getImageUrl(path: string | null | undefined): string {
  if (!path) return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=60";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `https://frasermiami.s3.amazonaws.com/${path.replace(/^\//, "")}`;
}

export default function NeighborhoodDetailPage({ slug }: { slug: string }) {
  const router = useRouter();
  const { openInquiry } = useInquiry();
  const [isMatcherOpen, setIsMatcherOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<string>("all");

  // Form intake state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Retrieve neighborhood metadata
  const hood = Ht[slug];

  // Get matching projects in this neighborhood
  const allHoodProjects = useMemo(() => {
    const names = getNeighborhoodNames(slug);
    return (projectsRaw as MapProject[]).filter((p) => names.includes(p.neighborhood));
  }, [slug]);

  // Compute stats
  const stats = useMemo(() => calculateStats(allHoodProjects), [allHoodProjects]);

  // Compute list of available stages in this neighborhood
  const availableStages = useMemo(() => {
    const stages = new Set(allHoodProjects.map((p) => p.stage).filter(Boolean));
    return Object.keys(STAGES).filter((key) => stages.has(key));
  }, [allHoodProjects]);

  // Apply stage filter
  const filteredProjects = useMemo(() => {
    if (stageFilter === "all") return allHoodProjects;
    return allHoodProjects.filter((p) => p.stage === stageFilter);
  }, [allHoodProjects, stageFilter]);

  // Group by tier if neighborhood has tiers defined (e.g. Coconut Grove)
  const tieredSections = useMemo(() => {
    if (!hood?.tiers) return null;
    const boutique = filteredProjects.filter((p) => (p as any).neighborhoodTier === "boutique");
    const main = filteredProjects.filter((p) => (p as any).neighborhoodTier !== "boutique");
    return [
      { key: "main", ...hood.tiers.main, projects: main },
      { key: "boutique", ...hood.tiers.boutique, projects: boutique },
    ].filter((section) => section.projects.length > 0);
  }, [hood, filteredProjects]);

  // Handle Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim()) {
      setFormStatus("error");
      return;
    }
    setFormStatus("sending");

    try {
      await submitInquiry({
        name: formName,
        email: formEmail,
        message: formMessage,
        source: "Website",
        details: { Neighborhood: hood.name },
      });
      setFormStatus("done");
      setFormName("");
      setFormEmail("");
      setFormMessage("");
    } catch {
      setFormStatus("error");
    }
  };

  // Setup Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current || allHoodProjects.length === 0) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      mapContainerRef.current.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          background: #10131a;
          color: #ffffff;
          padding: 20px;
          text-align: center;
          font-family: var(--font-sans), sans-serif;
        ">
          <p style="font-family: var(--font-serif), serif; font-size: 18px; margin-bottom: 8px; color: #f3e7c4;">Map Preview</p>
          <p style="font-size: 11px; color: rgba(250, 250, 248, 0.44); max-width: 320px; line-height: 1.5; letter-spacing: 0.05em; text-transform: uppercase;">
            Please add your Mapbox Access Token to <code>.env.local</code> to activate the interactive map.
          </p>
          <div style="margin-top: 16px; font-size: 10px; color: #c9a84c; font-weight: 500; letter-spacing: 0.1em;">
            [ NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ]
          </div>
        </div>
      `;
      return;
    }

    mapboxgl.accessToken = token;

    // Remove existing map if it was initialized
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Determine center
    let center: [number, number] = [-80.19179, 25.761681]; // Brickell fallback
    if (slug === "south-of-fifth") center = [-80.134, 25.767];
    
    if (allHoodProjects.length > 0) {
      const lats = allHoodProjects.map(p => p.lat);
      const lngs = allHoodProjects.map(p => p.lng);
      center = [
        lngs.reduce((a, b) => a + b, 0) / lngs.length,
        lats.reduce((a, b) => a + b, 0) / lats.length
      ];
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: center,
      zoom: 12.5,
      scrollZoom: false,
      attributionControl: true
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    // Circle markers setup
    const prices = allHoodProjects.map((p) => p.maxPrice ?? p.minPrice).filter((v): v is number => v != null && v > 0);
    const minP = prices.length ? Math.min(...prices) : null;
    const maxP = prices.length ? Math.max(...prices) : null;

    const bounds = new mapboxgl.LngLatBounds();

    allHoodProjects.forEach((proj) => {
      const priceVal = proj.maxPrice ?? proj.minPrice;
      
      // Radius calculation mapping between 12px and 28px (diameter)
      let diameter = 18;
      if (priceVal && minP && maxP && minP !== maxP) {
        diameter = 12 + Math.min(1, Math.max(0, (priceVal - minP) / (maxP - minP))) * 16;
      }

      const isTrophy = priceVal != null && maxP != null && priceVal >= maxP * 0.85;

      const markerEl = document.createElement("div");
      markerEl.className = "cursor-pointer group relative";
      markerEl.style.width = `${diameter}px`;
      markerEl.style.height = `${diameter}px`;
      markerEl.style.borderRadius = "50%";
      markerEl.style.backgroundColor = isTrophy ? "rgba(201, 168, 76, 0.45)" : "rgba(201, 168, 76, 0.15)";
      markerEl.style.border = "2.5px solid #C9A84C";
      markerEl.style.display = "flex";
      markerEl.style.alignItems = "center";
      markerEl.style.justifyContent = "center";
      markerEl.style.transition = "transform 0.2s ease, background-color 0.2s ease";

      if (isTrophy) {
        const dot = document.createElement("div");
        dot.style.width = "6px";
        dot.style.height = "6px";
        dot.style.backgroundColor = "#C9A84C";
        dot.style.borderRadius = "50%";
        markerEl.appendChild(dot);
      }

      const popup = new mapboxgl.Popup({ offset: diameter / 2 + 5, closeButton: false })
        .setHTML(`<div class="font-sans text-[11px] tracking-[0.05em] uppercase font-semibold text-[#1c1f26] p-1">${proj.name}</div>`);

      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([proj.lng, proj.lat])
        .setPopup(popup)
        .addTo(map);

      // Interactivity
      markerEl.addEventListener("click", () => {
        router.push(`/property/${proj.slug}`);
      });

      markerEl.addEventListener("mouseenter", () => {
        markerEl.style.transform = "scale(1.15)";
        markerEl.style.backgroundColor = "rgba(201, 168, 76, 0.75)";
        popup.addTo(map);
      });

      markerEl.addEventListener("mouseleave", () => {
        markerEl.style.transform = "scale(1)";
        markerEl.style.backgroundColor = isTrophy ? "rgba(201, 168, 76, 0.45)" : "rgba(201, 168, 76, 0.15)";
        popup.remove();
      });

      bounds.extend([proj.lng, proj.lat]);
    });

    // Fit map bounds to encompass all project locations
    if (allHoodProjects.length > 1) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 15 });
    } else if (allHoodProjects.length === 1) {
      map.setCenter([allHoodProjects[0].lng, allHoodProjects[0].lat]);
      map.setZoom(14);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [allHoodProjects, slug, router]);

  if (!hood) {
    return (
      <div className="min-h-screen bg-[#0C1523] text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-serif mb-4">Neighborhood Not Found</h1>
        <p className="text-sm text-[#A3A8B6] mb-6">The requested neighborhood does not exist.</p>
        <Link href="/neighborhood" className="text-[#C9A84C] hover:underline">
          &larr; Back to all neighborhoods
        </Link>
      </div>
    );
  }

  // Filter labels and message configurations
  const hasInventory = allHoodProjects.length > 0;
  const contactFormSubtitle = !hasInventory
    ? `New construction rarely comes to ${hood.name}. Register to hear first when a resale or off-market residence opens up here.`
    : "Request current availability. Unit-level pricing, floor plans, and current incentives.";
  const contactFormBtnLabel = !hasInventory ? "Register for first access" : "Submit Inquiry";
  const contactFormSuccessMsg = !hasInventory
    ? `You're on the list. I'll reach out the moment something worth seeing comes up in ${hood.name}.`
    : `${hood.name} availability details will be sent your way shortly.`;

  return (
    <main className="neighborhood-page">
      {/* Premium Header/Navbar */}
      <header className="site-header absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 bg-[#FAF8F3]/90 backdrop-blur-md border-b border-[#FAF8F3]/5">
        <Link href="/" className="logo-link">
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
          <Link href="/map">Explore Map</Link>
          <button
            type="button"
            className="hover:text-[#C9A84C] transition-colors text-black"
            onClick={() => setIsMatcherOpen(true)}
          >
            Find My Project
          </button>
          <div className="relative group">
            <button
              type="button"
              className="nav-dropdown flex items-center gap-1 text-[#C9A84C]"
              onClick={() => router.push("/neighborhood")}
            >
              Neighborhoods
              <span aria-hidden="true">⌄</span>
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-[#FAF8F3]/95 backdrop-blur-md border border-[#FAF8F3]/10 p-4 rounded shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 grid grid-cols-2 gap-x-4 gap-y-2 text-left z-50">
              {Object.entries(Ht).map(([s, data]) => (
                <button
                  key={s}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/neighborhood/${s}`);
                  }}
                  className="text-left text-[#1c1f26] hover:text-[#C9A84C] transition-colors text-[10px] py-1 tracking-[0.1em] uppercase"
                >
                  {data.name}
                </button>
              ))}
            </div>
          </div>
          <a href="/waterfront">Waterfront Estates</a>
          <a href="/insights">Insights</a>
          <span className="nav-divider" aria-hidden="true">
            ·
          </span>
          <a
            href="/#contact"
            onClick={(event) => {
              event.preventDefault();
              openInquiry();
            }}
            style={{ cursor: "pointer" }}
          >
            Inquire
          </a>
        </nav>
      </header>

      {/* Main Neighborhood Banner & Intro */}
      <section className="neighborhood-header">
        <div className="neighborhood-container">
          <nav className="neighborhood-breadcrumbs">
            <Link href="/">Home</Link>
            <span className="mx-2">&middot;</span>
            <Link href="/neighborhood">Neighborhoods</Link>
            <span className="mx-2">&middot;</span>
            <span className="text-[#1c1f26]">{hood.name}</span>
          </nav>
          
          <h1 className="neighborhood-title">{hood.headline}</h1>
          <p className="neighborhood-lead">{hood.description}</p>

          {/* Stats Dashboard Grid */}
          {hasInventory && (
            <div className="neighborhood-stats-grid">
              <div className="ns-item">
                <span className="ns-label">Active Projects</span>
                <span className="ns-value">{stats.count}</span>
              </div>
              <div className="ns-item">
                <span className="ns-label">Price Range</span>
                <span className="ns-value">{stats.priceLabel}</span>
              </div>
              <div className="ns-item">
                <span className="ns-label">Avg $/SF</span>
                <span className="ns-value">{stats.avgPsfLabel}</span>
              </div>
              <div className="ns-item">
                <span className="ns-label">Est. Delivery</span>
                <span className="ns-value">{stats.deliveryLabel}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Leaflet Dark map section */}
      {hasInventory && (
        <section className="neighborhood-map-section">
          <div className="neighborhood-container">
            <div className="neighborhood-map-wrap" ref={mapContainerRef} />
          </div>
        </section>
      )}

      {/* Editorial Content */}
      <section className="neighborhood-editorial-section">
        <div className="neighborhood-container">
          <div className="editorial-layout">
            <div className="editorial-sidebar">
              <h2 className="editorial-sidebar-title">Local Insight</h2>
            </div>
            <div className="editorial-content">
              {hood.editorial.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Inventory & Projects List */}
      {hasInventory && (
        <section className="neighborhood-inventory-section">
          <div className="neighborhood-container">
            <div className="inventory-header-row">
              <span className="inventory-count-text">
                {filteredProjects.length} {filteredProjects.length === 1 ? "Project" : "Projects"} in {hood.name}
              </span>
              
              {/* Construction stage filter pills */}
              <div className="stage-tabs">
                <button
                  type="button"
                  onClick={() => setStageFilter("all")}
                  className={`stage-tab-btn ${stageFilter === "all" ? "stage-tab-btn--active" : ""}`}
                >
                  All
                </button>
                {availableStages.map((stage) => {
                  const conf = getStageConfig(stage);
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setStageFilter(stage)}
                      className={`stage-tab-btn ${stageFilter === stage ? "stage-tab-btn--active" : ""}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: conf.dot }} />
                      {conf.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid display */}
            {tieredSections ? (
              <div className="space-y-12">
                {tieredSections.map((tier) => (
                  <div key={tier.key}>
                    <h3 className="project-tier-title">{tier.label}</h3>
                    {tier.description && <p className="project-tier-description">{tier.description}</p>}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {tier.projects.map((proj) => {
                        const conf = getStageConfig(proj.stage);
                        const displayMeta = [
                          proj.stories ? `${proj.stories} stories` : null,
                          proj.units ? `${proj.units} residences` : null,
                          proj.neighborhood,
                        ]
                          .filter(Boolean)
                          .join(" · ");

                        return (
                          <div
                            key={proj.slug}
                            onClick={() => router.push(`/property/${proj.slug}`)}
                            className="neighborhood-property-card"
                          >
                            <div className="npc-image-wrap">
                              <img src={getImageUrl(proj.img)} alt={proj.name} loading="lazy" />
                              {proj.comingSoon && (
                                <span className="npc-badge npc-badge--coming-soon">Coming Soon</span>
                              )}
                              {proj.badge && !proj.comingSoon && (
                                <span className="npc-badge">{proj.badge}</span>
                              )}
                            </div>
                            
                            <div className="npc-details">
                              <div className="npc-header">
                                <div className="npc-title-row">
                                  <h4 className="npc-name">{proj.name}</h4>
                                  <span className="npc-dot" style={{ background: conf.dot }} />
                                </div>
                                <span className="npc-meta">{displayMeta}</span>
                              </div>
                              
                              <div className="npc-footer">
                                <div className="npc-price-block">
                                  <span className="npc-label">Price From</span>
                                  <span className="npc-value">{formatPriceStr(proj.priceFrom)}</span>
                                </div>
                                <div className="npc-stage-block">
                                  <span className="npc-label">Construction Stage</span>
                                  <span className="npc-value">{conf.label}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProjects.map((proj) => {
                    const conf = getStageConfig(proj.stage);
                    const displayMeta = [
                      proj.stories ? `${proj.stories} stories` : null,
                      proj.units ? `${proj.units} residences` : null,
                      proj.neighborhood,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <div
                        key={proj.slug}
                        onClick={() => router.push(`/property/${proj.slug}`)}
                        className="neighborhood-property-card"
                      >
                        <div className="npc-image-wrap">
                          <img src={getImageUrl(proj.img)} alt={proj.name} loading="lazy" />
                          {proj.comingSoon && (
                            <span className="npc-badge npc-badge--coming-soon">Coming Soon</span>
                          )}
                          {proj.badge && !proj.comingSoon && (
                            <span className="npc-badge">{proj.badge}</span>
                          )}
                        </div>
                        
                        <div className="npc-details">
                          <div className="npc-header">
                            <div className="npc-title-row">
                              <h4 className="npc-name">{proj.name}</h4>
                              <span className="npc-dot" style={{ background: conf.dot }} />
                            </div>
                            <span className="npc-meta">{displayMeta}</span>
                          </div>
                          
                          <div className="npc-footer">
                            <div className="npc-price-block">
                              <span className="npc-label">Price From</span>
                              <span className="npc-value">{formatPriceStr(proj.priceFrom)}</span>
                            </div>
                            <div className="npc-stage-block">
                              <span className="npc-label">Construction Stage</span>
                              <span className="npc-value">{conf.label}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredProjects.length === 0 && (
                  <p className="mt-8 text-[#7b8089] text-sm">No projects in this stage.</p>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Private Inquiry Intake Form */}
      <section className="neighborhood-contact-section">
        <div className="neighborhood-container max-w-[800px] mx-auto px-6 text-center">
          <h2 className="contact-info-title text-[#1c1f26] mb-2">Considering {hood.name}?</h2>
          <p className="contact-info-desc text-[#5f6575] mb-8">{contactFormSubtitle}</p>
          
          <div className="max-w-[640px] mx-auto text-left">
            {formStatus === "done" ? (
              <div className="p-6 bg-green-500/10 border border-green-500/20 rounded text-center">
                <h4 className="text-xl font-serif text-green-600 mb-2">Request Received</h4>
                <p className="text-xs text-[#535862] leading-relaxed">{contactFormSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group-custom">
                    <input
                      type="text"
                      placeholder="Name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="form-input-custom"
                    />
                  </div>
                  
                  <div className="form-group-custom">
                    <input
                      type="email"
                      required
                      placeholder="Email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className={`form-input-custom ${formStatus === "error" && !formEmail.trim() ? "border-[#C9A84C]" : ""}`}
                    />
                    {formStatus === "error" && !formEmail.trim() && (
                      <span className="text-[10px] text-[#C9A84C] mt-1">Please enter a valid email address.</span>
                    )}
                  </div>
                </div>
                
                <div className="form-group-custom">
                  <textarea
                    placeholder="What are you looking for? (optional)"
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    rows={4}
                    className="form-input-custom resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formStatus === "sending"}
                  className="form-submit-btn-custom"
                >
                  {formStatus === "sending" ? "Sending..." : "SUBMIT"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Explore other neighborhoods section */}
      <section className="explore-neighborhoods-section">
        <div className="neighborhood-container max-w-[1125px] mx-auto px-6 text-left">
          <span className="text-[10px] tracking-[0.25em] uppercase text-[#B38E36] font-semibold mb-6 block">
            Explore Other Neighborhoods
          </span>
          
          <div className="flex flex-wrap gap-3">
            {Object.entries(Ht)
              .filter(([s]) => s !== slug)
              .map(([s, data]) => (
                <Link
                  key={s}
                  href={`/neighborhood/${s}`}
                  className="px-5 py-2.5 bg-[#f1f3f6] hover:bg-[#C9A84C]/10 text-[#5f6575] hover:text-[#C9A84C] rounded-full text-xs font-light tracking-wider transition-all duration-200 border border-transparent hover:border-[#C9A84C]/30"
                >
                  {data.name}
                </Link>
              ))}
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* Matcher wizard modal */}
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
