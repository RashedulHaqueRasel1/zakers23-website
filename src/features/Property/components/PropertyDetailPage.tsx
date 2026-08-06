"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import projectsRaw from "@/src/data/miami-projects.json";
import { SiteFooter } from "@/src/features/Home/components/site-footer";
import FindMyProjectModal from "@/src/features/FindMyProject/components/FindMyProjectModal";
import { Ht } from "@/src/data/neighborhoods";

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
  imgs?: string[];
  wellnessScore?: number | null;
  statusRemark?: string;
  developer?: string;
}

const STAGES: Record<string, { label: string; dot: string; index: number }> = {
  preconstruction: { label: "Pre-Construction", dot: "#f59e0b", index: 0 },
  under_construction: { label: "Under Construction", dot: "#0284c7", index: 1 },
  topped_off: { label: "Topped Off", dot: "#6366f1", index: 2 },
  move_in_ready: { label: "Completed", dot: "#10b981", index: 3 },
};

const STAGE_STEPS = [
  { key: "preconstruction", label: "Planning" },
  { key: "under_construction", label: "Construction" },
  { key: "topped_off", label: "Completing" },
  { key: "move_in_ready", label: "Delivered" }
];

const fallbackImages = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1000&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1000&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1000&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1000&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1000&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1000&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1000&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1000&auto=format&fit=crop&q=80",
];

function getImageUrl(path: string | null | undefined): string {
  if (!path) return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=60";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `https://frasermiami.s3.amazonaws.com/${path.replace(/^\//, "")}`;
}

function getSafeImage(imgs: string[] | undefined, primaryImg: string, index: number): string {
  if (imgs && imgs.length > index) {
    return getImageUrl(imgs[index]);
  }
  if (index === 0) return getImageUrl(primaryImg);
  return fallbackImages[index % fallbackImages.length];
}

function formatPriceStr(price: string | number | null | undefined): string {
  if (price === null || price === undefined) return "—";
  const str = String(price).trim();
  if (!str) return "—";
  if (str.startsWith("$")) return str;
  const num = parseFloat(str);
  if (!isNaN(num)) {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2).replace(/\.00$/, "")}M+`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K+`;
    return `$${num}`;
  }
  return str;
}

export default function PropertyDetailPage({ slug }: { slug: string }) {
  const router = useRouter();
  const [isMatcherOpen, setIsMatcherOpen] = useState(false);
  const [activeImgIdx, setActiveImgIdx] = useState<number | null>(null);

  // Find current project
  const project = useMemo(() => {
    return (projectsRaw as MapProject[]).find((p) => p.slug === slug);
  }, [slug]);

  // Form intake state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  // Compare state
  const [isCompared, setIsCompared] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && project) {
      const stored = localStorage.getItem("zakers23-compare-projects");
      if (stored) {
        try {
          const list = JSON.parse(stored) as number[];
          setIsCompared(list.includes(project.id));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [project]);

  const handleToggleCompare = () => {
    if (!project || typeof window === "undefined") return;
    const stored = localStorage.getItem("zakers23-compare-projects");
    let list: number[] = [];
    if (stored) {
      try {
        list = JSON.parse(stored) as number[];
      } catch (e) {
        console.error(e);
      }
    }

    if (list.includes(project.id)) {
      list = list.filter((id) => id !== project.id);
      setIsCompared(false);
    } else {
      if (list.length >= 2) {
        list.shift(); // remove oldest
      }
      list.push(project.id);
      setIsCompared(true);
    }

    localStorage.setItem("zakers23-compare-projects", JSON.stringify(list));
    window.dispatchEvent(new Event("compare-changed"));
  };

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Gallery images array
  const galleryImgs = useMemo(() => {
    if (!project) return [];
    if (project.imgs && project.imgs.length > 0) return project.imgs;
    return [project.img];
  }, [project]);

  // Related projects list
  const relatedProjects = useMemo(() => {
    if (!project) return [];
    const list = (projectsRaw as MapProject[])
      .filter((p) => p.slug !== project.slug)
      .filter((p) => p.neighborhood === project.neighborhood || p.neighborhood.includes(project.neighborhood));

    if (list.length >= 4) return list.slice(0, 4);

    const remaining = (projectsRaw as MapProject[])
      .filter((p) => p.slug !== project.slug && !list.some((item) => item.slug === p.slug));
    return [...list, ...remaining].slice(0, 4);
  }, [project]);

  // Keyboard controls for Lightbox
  useEffect(() => {
    if (activeImgIdx === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveImgIdx(null);
      } else if (e.key === "ArrowRight") {
        setActiveImgIdx((prev) => (prev !== null && galleryImgs.length > 0 ? (prev + 1) % galleryImgs.length : prev));
      } else if (e.key === "ArrowLeft") {
        setActiveImgIdx((prev) => (prev !== null && galleryImgs.length > 0 ? (prev - 1 + galleryImgs.length) % galleryImgs.length : prev));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImgIdx, galleryImgs]);

  // Map Setup Effect
  useEffect(() => {
    if (!mapContainerRef.current || !project) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      mapContainerRef.current.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          background: #f6f4f0;
          color: #1c1f26;
          padding: 20px;
          text-align: center;
          font-family: var(--font-sans), sans-serif;
        ">
          <p style="font-family: var(--font-serif), serif; font-size: 18px; margin-bottom: 8px;">Map Preview</p>
          <p style="font-size: 11px; color: #8c8376; max-width: 320px; line-height: 1.5; letter-spacing: 0.05em; text-transform: uppercase;">
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

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [project.lng, project.lat],
      zoom: 14.5,
      scrollZoom: false,
      attributionControl: true
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    // Custom marker elements
    const markerEl = document.createElement("div");
    markerEl.style.width = "20px";
    markerEl.style.height = "20px";
    markerEl.style.background = "rgba(179, 142, 54, 0.4)";
    markerEl.style.border = "2px solid #B38E36";
    markerEl.style.borderRadius = "50%";
    markerEl.style.display = "flex";
    markerEl.style.alignItems = "center";
    markerEl.style.justifyContent = "center";

    const innerDot = document.createElement("div");
    innerDot.style.width = "8px";
    innerDot.style.height = "8px";
    innerDot.style.background = "#B38E36";
    innerDot.style.borderRadius = "50%";
    markerEl.appendChild(innerDot);

    const popup = new mapboxgl.Popup({ offset: 15, closeButton: false })
      .setHTML(`<div class="font-sans text-[11px] tracking-[0.05em] uppercase font-semibold text-[#1c1f26] p-1">${project.name}</div>`);

    const marker = new mapboxgl.Marker(markerEl)
      .setLngLat([project.lng, project.lat])
      .setPopup(popup)
      .addTo(map);

    // Auto open popup
    popup.addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [project]);

  // Handle inquiry submit
  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim()) {
      setFormStatus("error");
      return;
    }
    setFormStatus("sending");

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setFormStatus("done");
      setFormName("");
      setFormEmail("");
      setFormMessage("");
    } catch {
      setFormStatus("error");
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] text-[#1c1f26] flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-serif mb-4">Project Not Found</h1>
        <p className="text-sm text-[#535862] mb-6">The requested development project does not exist.</p>
        <Link href="/" className="text-[#B38E36] hover:underline">
          &larr; Back to Home
        </Link>
      </div>
    );
  }

  const stageConfig = STAGES[project.stage] || { label: "Pre-Construction", dot: "#f59e0b", index: 0 };
  const currentStageIndex = stageConfig.index;

  // Mock specs details
  const minBed = project.minBed || 1;
  const maxBed = project.maxBed || 5;
  const basePriceNum = project.minPrice || 2150000;

  // Address lookup
  const projectAddress = useMemo(() => {
    if (project.slug === "cipriani-residences-brickell") {
      return "1420 South Miami Avenue, Miami, FL 33131";
    }
    const streetNum = 100 + (project.id * 12) % 2800;
    if (project.neighborhood.toLowerCase() === "brickell") {
      return `${streetNum} Brickell Avenue, Miami, FL 33131`;
    }
    if (project.neighborhood.toLowerCase() === "downtown miami") {
      return `${streetNum} Biscayne Boulevard, Miami, FL 33132`;
    }
    if (project.neighborhood.toLowerCase() === "edgewater") {
      return `${streetNum} NE 24th Street, Miami, FL 33137`;
    }
    return `${streetNum} Collins Avenue, Miami Beach, FL 33139`;
  }, [project]);

  // Progress percentage logic
  const progressPercentage = useMemo(() => {
    if (project.slug === "cipriani-residences-brickell") return 87;
    if (project.stage === "preconstruction") return 15;
    if (project.stage === "under_construction") return 48;
    if (project.stage === "topped_off") return 80;
    if (project.stage === "move_in_ready") return 100;
    return 15;
  }, [project]);

  const floorPlanLines = useMemo(() => {
    const lines = [];
    const linesCount = Math.max(3, maxBed - minBed + 1);
    for (let i = 0; i < linesCount; i++) {
      const bed = minBed + i;
      const bath = Math.max(1, bed + (i % 2 === 0 ? 0.5 : 0));
      const size = 1070 + i * 1150 + (i % 3) * 200;
      const priceFactor = 1 + i * 0.52;
      const priceVal = basePriceNum * priceFactor;
      lines.push({
        line: `Residence - Line 0${i + 1}`,
        beds: bed,
        baths: bath,
        size: size,
        price: formatPriceStr(priceVal),
      });
    }
    return lines;
  }, [minBed, maxBed, basePriceNum]);

  const paragraphs = useMemo(() => {
    const stageLabel = stageConfig.label.toLowerCase();
    return [
      `A tribute to classic Italian design and sophisticated modern living, ${project.name} rises in the heart of Miami's highly coveted ${project.neighborhood} neighborhood. This monumental tower is currently ${stageLabel}, combining elegant waterfront styling with five-star hospitality and residential services. Every detail of the building is curated to offer an unmatched level of privacy, comfort, and premium resort-caliber amenities.`,
      `Boasting panoramic views across Biscayne Bay and the vibrant Miami skyline, the building will house ${project.units || "exclusive"} residences. Featuring ${minBed} to ${maxBed} bedroom floor plans, each layout is finished with custom European materials, high ceilings, and expansive wrap-around terraces. From the private elevator foyer to the floor-to-ceiling glass, ${project.name} represents the absolute pinnacle of Miami new development.`,
      `Residences are priced from ${project.priceFrom || "pricing on request"}, offering buyers an elite opportunity to secure a home in South Florida's premier lifestyle hub. With delivery estimated for ${project.completion}, the project stands as one of the most anticipated additions to the city's residential landscape.`
    ];
  }, [project, stageConfig, minBed, maxBed]);

  return (
    <main className="property-page bg-[#FAF8F3] min-h-screen text-[#1c1f26]">
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
              {Object.entries(Ht).map(([slug, data]) => (
                <button
                  key={slug}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/neighborhood/${slug}`);
                  }}
                  className="text-left text-[#1c1f26] hover:text-[#C9A84C] transition-colors text-[10px] py-1 tracking-[0.1em] uppercase"
                >
                  {data.name}
                </button>
              ))}
            </div>
          </div>
          <Link href="/waterfront">Waterfront Estates</Link>
          <Link href="/insights">Insights</Link>
          <span className="nav-divider" aria-hidden="true">
            ·
          </span>
          <Link href="/#contact">Inquire</Link>
        </nav>
      </header>

      {/* Hero Container - Rounded Grid Collage */}
      <section className="max-w-[1140px] mx-auto px-6 pt-28 pb-8">
        <div className="relative overflow-hidden rounded-[8px] bg-[#FAF8F3]">
          <div className="property-hero-collage grid grid-cols-1 md:grid-cols-[2.1fr_1fr] gap-[4px] h-[340px] md:h-[450px] bg-[#FAF8F3]">
            <div className="relative h-full w-full overflow-hidden cursor-pointer" onClick={() => setActiveImgIdx(0)}>
              <Image
                fill
                priority
                src={getSafeImage(project.imgs, project.img, 0)}
                alt={project.name}
                className="object-cover transition-transform duration-700 hover:scale-[1.02]"
              />

              {/* Topped Off / Status Badge */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2 z-20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
                <span className="text-[8px] md:text-[9px] text-white font-mono tracking-[0.14em] uppercase">
                  {project.statusRemark || `${stageConfig.label} · Est. ${project.completion}`}
                </span>
              </div>
            </div>

            <div className="hidden md:grid grid-rows-2 gap-[4px] h-full relative">
              <div className="relative h-full w-full overflow-hidden cursor-pointer" onClick={() => setActiveImgIdx(1)}>
                <Image
                  fill
                  src={getSafeImage(project.imgs, project.img, 1)}
                  alt={`${project.name} Rendering 2`}
                  className="object-cover transition-transform duration-700 hover:scale-[1.02]"
                />
              </div>
              <div className="relative h-full w-full overflow-hidden cursor-pointer" onClick={() => setActiveImgIdx(2)}>
                <Image
                  fill
                  src={getSafeImage(project.imgs, project.img, 2)}
                  alt={`${project.name} Rendering 3`}
                  className="object-cover transition-transform duration-700 hover:scale-[1.02]"
                />
              </div>

              {/* Photo Count Indicator */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImgIdx(0);
                }}
                className="absolute bottom-3 right-3 bg-black/75 hover:bg-black/90 backdrop-blur-sm text-[9px] text-white font-mono tracking-[0.1em] px-3 py-1.5 rounded-full z-20 cursor-pointer transition-colors"
              >
                +{galleryImgs.length} photos
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content metadata & Spec layout */}
      <section className="max-w-[1140px] mx-auto px-6 pb-20">
        {/* Back Button & Compare trigger */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.back()}
            className="text-[#8f96ab] hover:text-[#1c1f26] text-[10px] tracking-[0.2em] uppercase transition-colors flex items-center gap-1"
          >
            &larr; Back
          </button>
          
          <button
            onClick={handleToggleCompare}
            className={`text-[9px] tracking-[0.25em] uppercase transition-all px-4 py-2.5 border flex items-center gap-2 font-semibold ${
              isCompared
                ? "bg-[#B38E36] border-[#B38E36] text-white"
                : "border-[#1c1f26] text-[#1c1f26] hover:bg-[#1c1f26] hover:text-white"
            }`}
          >
            {isCompared ? "✓ Compared" : "+ Compare Development"}
          </button>
        </div>

        {/* Kicker & Title */}
        <span className="text-[10px] tracking-[0.3em] uppercase text-[#B38E36] font-semibold block mb-2">
          {project.neighborhood} &middot; New Construction
        </span>
        <h1 className="text-3xl md:text-5xl font-serif font-normal text-[#1c1f26] leading-[1.1] mb-2">
          {project.name}
        </h1>
        <p className="text-xs text-[#8f96ab] tracking-[0.05em] font-light mb-8">
          {projectAddress}
        </p>

        {/* Core Stats Cards - Two Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white border border-[#e8e4db] rounded-[4px] p-6 shadow-sm">
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#8f96ab] block mb-2">From</span>
            <strong className="text-3xl md:text-4xl font-serif font-normal text-[#1c1f26]">
              {formatPriceStr(project.minPrice)}
            </strong>
          </div>

          <div className="bg-white border border-[#e8e4db] rounded-[4px] p-6 shadow-sm">
            <span className="text-[9px] uppercase tracking-[0.2em] text-[#8f96ab] block mb-2">Delivery</span>
            <strong className="text-3xl md:text-4xl font-serif font-normal text-[#1c1f26]">
              {project.completion}
            </strong>
          </div>
        </div>

        {/* Specs Table Layout ("BUILDING") */}
        <div className="mb-14">
          <h4 className="text-[10px] uppercase tracking-[0.25em] text-[#8c8376] font-semibold">
            Building
          </h4>
          <div className="border-b border-[#ddd8cd] mt-2 mb-6" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0">
            <div>
              <div className="flex justify-between items-center py-3 border-b border-[#ddd8cd]/60 text-xs">
                <span className="text-[#8f96ab] font-light">Units</span>
                <span className="text-[#1c1f26] font-mono font-medium">{project.units || "—"}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[#ddd8cd]/60 text-xs">
                <span className="text-[#8f96ab] font-light">Height</span>
                <span className="text-[#1c1f26] font-medium">
                  {project.stories ? `${project.stories} Stories (${project.stories * 12} ft)` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[#ddd8cd]/60 md:border-b-0 text-xs">
                <span className="text-[#8f96ab] font-light">Developer</span>
                <span className="text-[#1c1f26] font-medium text-right max-w-[200px] truncate">
                  {project.developer || "Visionary Group"}
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center py-3 border-b border-[#ddd8cd]/60 text-xs">
                <span className="text-[#8f96ab] font-light">Bedrooms</span>
                <span className="text-[#1c1f26] font-mono font-medium">{minBed} – {maxBed}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[#ddd8cd]/60 text-xs">
                <span className="text-[#8f96ab] font-light">Size range (SF)</span>
                <span className="text-[#1c1f26] font-mono font-medium">
                  {project.minPrice ? `${(1070 + (project.id % 3) * 110).toLocaleString()} – ${(6093 - (project.id % 2) * 500).toLocaleString()}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b-0 text-xs">
                <span className="text-[#8f96ab] font-light">HOA</span>
                <span className="text-[#1c1f26] font-mono font-medium">
                  ${(1.45 + (project.id % 5) * 0.1).toFixed(2)}/sf
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Momentum / Construction Progress */}
        <div className="mb-14">
          <h4 className="text-[10px] uppercase tracking-[0.25em] text-[#8c8376] font-semibold">
            Momentum
          </h4>
          <div className="border-b border-[#ddd8cd] mt-2 mb-6" />

          <div className="flex justify-between items-end mb-4">
            <span className="text-[9px] uppercase tracking-[0.18em] text-[#8f96ab]">
              CONSTRUCTION PROGRESS
            </span>
            <span className="text-[10px] font-mono font-medium text-[#1c1f26]">
              {progressPercentage}% Est. {project.completion}
            </span>
          </div>

          {/* Progress Slider Line */}
          <div className="relative w-full py-4">
            <div className="absolute top-[20px] left-0 right-0 h-[2px] bg-[#d9d3c5]" />
            <div
              className="absolute top-[20px] left-0 h-[2px] bg-[#1c1f26] transition-all duration-700"
              style={{ width: `${progressPercentage}%` }}
            />

            {/* Indicator nodes */}
            <div className="relative flex justify-between z-10">
              {STAGE_STEPS.map((step, idx) => {
                const stepPercentage = idx * 33.3;
                const isActive = progressPercentage >= stepPercentage;
                return (
                  <div key={step.key} className="flex flex-col items-center w-[20%] text-center">
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${isActive
                        ? "bg-[#1c1f26] border-[#1c1f26]"
                        : "bg-white border-[#d9d3c5]"
                        }`}
                    />
                    <span className={`mt-3 text-[9px] tracking-[0.05em] uppercase font-mono ${isActive ? "text-[#1c1f26] font-medium" : "text-[#8f96ab] font-light"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Vertical slider handle marker */}
            <div
              className="absolute top-[13px] w-4 h-4 rounded-full bg-[#B38E36] border-2 border-white shadow-md z-20 transition-all duration-700 -ml-2"
              style={{ left: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Project CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-start mt-10">
          <a
            href="#contact-section"
            className="px-8 py-4 bg-[#1c1f26] text-[#b79255] text-[10px] uppercase tracking-[0.25em] font-semibold text-center transition-colors rounded-[2px] "
          >
            INQUIRE ABOUT THIS PROJECT
          </a>
          <a
            href="#floor-plans"
            className="px-8 py-4 border border-[#1c1f26] hover:bg-[#1c1f26] hover:text-white text-[#1c1f26] text-[10px] uppercase tracking-[0.25em] font-semibold text-center transition-colors rounded-[2px]"
          >
            VIEW RESIDENCE PLANS
          </a>
        </div>
      </section>

      {/* 3. EDITORIAL STORY SECTION */}
      <section className="property-story-editorial py-20 bg-[#ffffff] border-y border-[#ddd8cd] text-[#1c1f26]">
        <div className="property-container max-w-[1140px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-20 items-center">
            <div>
              <div className="mb-6 flex items-center gap-4">
                <span className="h-px w-6 bg-[#B38E36]" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#B38E36] font-semibold">
                  THE STORY
                </span>
              </div>
              <h2 className="text-3xl md:text-[40px] font-normal leading-[1.1] tracking-[-0.02em] font-serif text-[#1c1f26] mb-8">
                Visionary Architecture &amp; Luxury Residences
              </h2>
              <div className="text-base font-light leading-[1.8] text-[#535862] flex flex-col gap-6">
                <p>{paragraphs[0]}</p>
                <p>{paragraphs[1]}</p>
              </div>
            </div>
            <div className="relative aspect-[0.74/1] w-full max-w-[420px] mx-auto bg-[#f6f4f0] rounded-[3px] overflow-hidden shadow-xl border border-[#e2e8f0]">
              <Image
                fill
                src={getSafeImage(project.imgs, project.img, 3)}
                alt="Luxury Lounge Space"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECONDARY EDITORIAL SECTION */}
      <section className="property-story-life py-20 bg-[#FAF8F3] border-b border-[#ddd8cd] text-[#1c1f26]">
        <div className="property-container max-w-[1140px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-12 lg:gap-20 items-center">
            <div className="relative aspect-[16/10] w-full bg-[#f6f4f0] rounded-[3px] overflow-hidden shadow-lg border border-[#ddd8cd] order-2 lg:order-1">
              <Image
                fill
                src={getSafeImage(project.imgs, project.img, 4)}
                alt="Luxury Dining Space"
                className="object-cover"
              />
            </div>
            <div className="order-1 lg:order-2">
              <div className="mb-6 flex items-center gap-4">
                <span className="h-px w-6 bg-[#B38E36]" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#B38E36] font-semibold">
                  THE LIFE
                </span>
              </div>
              <h2 className="text-3xl md:text-[40px] font-normal leading-[1.1] tracking-[-0.02em] font-serif text-[#1c1f26] mb-8">
                Refined Styling &amp; Curated Amenities
              </h2>
              <div className="text-base font-light leading-[1.8] text-[#535862] flex flex-col gap-6 mb-10">
                <p>{paragraphs[2]}</p>
              </div>

              {/* Stats Mini Dashboard */}
              <div className="grid grid-cols-3 border-t border-[#ddd8cd] pt-8">
                <div>
                  <span className="text-[9px] uppercase tracking-[0.15em] text-[#8f96ab] block mb-1">Status</span>
                  <strong className="text-sm font-serif text-[#1c1f26]">{stageConfig.label}</strong>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-[0.15em] text-[#8f96ab] block mb-1">Delivering</span>
                  <strong className="text-sm font-serif text-[#1c1f26]">{project.completion}</strong>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-[0.15em] text-[#8f96ab] block mb-1">Wellness Score</span>
                  <strong className="text-sm font-serif text-[#B38E36]">{project.wellnessScore ? `${project.wellnessScore}/100` : "TBD"}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. LANDSCAPE FULL-WIDTH BANNER 1 */}
      <section className="relative h-[300px] md:h-[450px] bg-[#0c1523] w-full">
        <Image
          fill
          src={getSafeImage(project.imgs, project.img, 5)}
          alt={`${project.name} Wide View`}
          className="object-cover opacity-95"
        />
        <div className="absolute inset-0 bg-black/10" />
      </section>

      {/* 6. PROPERTY GALLERY SECTION WITH SLIDER */}
      <section className="property-gallery py-20 bg-[#ffffff] border-b border-[#ddd8cd] text-[#1c1f26]">
        <div className="property-container max-w-[1140px] mx-auto px-6">
          <div className="mb-12 flex justify-between items-end">
            <div>
              <span className="text-[10px] tracking-[0.3em] uppercase text-[#B38E36] font-semibold block mb-2">
                VISUAL NARRATIVE
              </span>
              <h2 className="text-3xl font-serif font-normal text-[#1c1f26]">
                Project Gallery
              </h2>
            </div>
            <div className="flex gap-2">
              <span className="text-xs font-mono text-[#8f96ab]">Click any image to expand</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {galleryImgs.slice(0, 8).map((imgUrl, idx) => (
              <div
                key={idx}
                className="group relative aspect-[1.4/1] overflow-hidden rounded-[2px] border border-[#e2e8f0] cursor-pointer bg-[#f6f4f0]"
                onClick={() => setActiveImgIdx(idx)}
              >
                <img
                  src={getImageUrl(imgUrl)}
                  alt={`${project.name} - Slide ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-[#0C1523]/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <span className="text-white text-[9px] uppercase tracking-[0.2em] font-semibold bg-[#B38E36]/90 px-3 py-1.5 rounded-[1px]">
                    Expand
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. PROPERTY HIGHLIGHTS (SPECS GRID) */}
      <section className="property-highlights py-20 bg-[#FAF8F3] border-b border-[#ddd8cd] text-[#1c1f26]">
        <div className="property-container max-w-[1140px] mx-auto px-6">
          <span className="text-[10px] tracking-[0.3em] uppercase text-[#B38E36] font-semibold block mb-1">
            SPECIFICATIONS &amp; FEATURES
          </span>
          <h2 className="text-3xl md:text-[40px] font-normal leading-[1.1] tracking-[-0.02em] font-serif text-[#1c1f26] mb-12">
            Highlights &amp; Scope
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-xs uppercase tracking-[0.2em] text-[#B38E36] font-semibold mb-4 border-b border-[#ddd8cd] pb-2">Developer</h4>
              <p className="text-xs font-light leading-relaxed text-[#535862]">
                {project.developer || "Visionary real estate group"} focuses on acquiring and building iconic architectural marvels in South Florida's high-barrier residential corridors.
              </p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.2em] text-[#B38E36] font-semibold mb-4 border-b border-[#ddd8cd] pb-2">Scope</h4>
              <p className="text-xs font-light leading-relaxed text-[#535862]">
                Rising {project.stories || "—"} stories high and containing {project.units || "—"} residential estates, this development represents a landmark design and density.
              </p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.2em] text-[#B38E36] font-semibold mb-4 border-b border-[#ddd8cd] pb-2">Pool &amp; Spa</h4>
              <p className="text-xs font-light leading-relaxed text-[#535862]">
                A resort-style pool deck with panoramic bay views, private poolside cabanas, saunas, massage rooms, and state-of-the-art thermal lounges.
              </p>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.2em] text-[#B38E36] font-semibold mb-4 border-b border-[#ddd8cd] pb-2">Wellness</h4>
              <p className="text-xs font-light leading-relaxed text-[#535862]">
                Certified multi-dimensional wellness facilities featuring custom air purification, water filtration systems, yoga yards, and healthy restaurant offerings.
              </p>
            </div>
          </div>

          {/* Details Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 border border-[#ddd8cd] rounded-[3px]">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#8f96ab] block mb-2">Amenities</span>
              <ul className="text-xs font-light leading-relaxed text-[#535862] space-y-2 list-disc pl-4">
                <li>24/7 lobby concierge, doorman, and valet parking services.</li>
                <li>Exclusive resident-only signature restaurant and cocktail lounge.</li>
                <li>State-of-the-art simulator rooms for golf and racing.</li>
                <li>Lushly landscaped resort sun deck and screening room.</li>
              </ul>
            </div>
            <div className="bg-white p-8 border border-[#ddd8cd] rounded-[3px]">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#8f96ab] block mb-2">Residences</span>
              <ul className="text-xs font-light leading-relaxed text-[#535862] space-y-2 list-disc pl-4">
                <li>Soaring 10-foot ceilings with floor-to-ceiling glass paneling.</li>
                <li>Private elevator foyer entries for select layout configurations.</li>
                <li>European kitchens with premium Wolf and Sub-Zero appliances.</li>
                <li>Expansive terraces with glass railings showcasing the waterfront.</li>
              </ul>
            </div>
            <div className="bg-white p-8 border border-[#ddd8cd] rounded-[3px]">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#8f96ab] block mb-2">Wellness Spa</span>
              <ul className="text-xs font-light leading-relaxed text-[#535862] space-y-2 list-disc pl-4">
                <li>Hydrotherapy pool circuit, steam rooms, and Finnish saunas.</li>
                <li>Cold plunge pool, ice fountain, and custom sensory showers.</li>
                <li>Certified treatment rooms for therapeutic massages and facial treatments.</li>
                <li>Dedicated fitness center with advanced Pilates and cardio equipment.</li>
              </ul>
            </div>
            <div className="bg-white p-8 border border-[#ddd8cd] rounded-[3px]">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#8f96ab] block mb-2">Escrow Terms</span>
              <ul className="text-xs font-light leading-relaxed text-[#535862] space-y-2 list-disc pl-4">
                <li>10% Deposit due upon Reservation of the residence.</li>
                <li>10% Deposit due upon execution of the Contract.</li>
                <li>10% Deposit due at Groundbreaking / Commencement.</li>
                <li>10% Deposit due at Topping Off of the building structure.</li>
                <li>50% Balance due at Closing and delivery of the keys.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 8. LANDSCAPE FULL-WIDTH BANNER 2 */}
      <section className="relative h-[300px] md:h-[450px] bg-[#0c1523] w-full">
        <Image
          fill
          src={getSafeImage(project.imgs, project.img, 6)}
          alt={`${project.name} Panoramic View`}
          className="object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-black/10" />
      </section>

      {/* 9. INVENTORY & AVAILABILITY TABLE */}
      <section className="property-inventory py-20 bg-[#ffffff] border-b border-[#ddd8cd] text-[#1c1f26]" id="floor-plans">
        <div className="property-container max-w-[1140px] mx-auto px-6">
          <div className="mb-10 text-center">
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#B38E36] font-semibold block mb-2">
              PRICING &amp; LAYOUTS
            </span>
            <h2 className="text-3xl font-serif font-normal text-[#1c1f26]">
              {project.name} Floor Plans &amp; Availability
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-[#ddd8cd]">
              <thead>
                <tr className="bg-[#FAF8F3] border-b border-[#ddd8cd] text-[10px] uppercase tracking-[0.2em] text-[#8f96ab]">
                  <th className="p-4 pl-6">Line</th>
                  <th className="p-4">Beds</th>
                  <th className="p-4">Baths</th>
                  <th className="p-4">Size (SF)</th>
                  <th className="p-4">Price Range</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ddd8cd] text-xs text-[#535862] font-mono">
                {floorPlanLines.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF8F3]/50 transition-colors">
                    <td className="p-4 pl-6 font-serif text-sm font-normal text-[#1c1f26]">{row.line}</td>
                    <td className="p-4">{row.beds} Beds</td>
                    <td className="p-4">{row.baths} Baths</td>
                    <td className="p-4">{row.size.toLocaleString()} SF</td>
                    <td className="p-4 font-serif text-[#B38E36]">{row.price}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em] text-[#10b981] font-semibold bg-emerald-500/10 px-2 py-1 rounded-[2px]">
                        Available
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right font-sans">
                      <a href="#contact-section" className="text-[#B38E36] uppercase tracking-[0.15em] text-[10px] font-semibold hover:underline">
                        Inquire &rarr;
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 text-center">
            <a
              href="#contact-section"
              className="inline-block px-8 py-3.5 border border-[#1c1f26] hover:bg-[#1c1f26] hover:text-white text-[#1c1f26] text-[10px] uppercase tracking-[0.25em] font-semibold transition-colors"
            >
              REQUEST ALL FLOOR PLANS
            </a>
          </div>
        </div>
      </section>

      {/* 10. LOCATION & MAP */}
      <section className="property-location bg-[#FAF8F3] py-20 text-[#1c1f26] border-b border-[#ddd8cd] relative z-0">
        <div className="property-container max-w-[1140px] mx-auto px-6">
          <div className="mb-10 text-left">
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#B38E36] font-semibold block mb-2">
              NEIGHBORHOOD SETTING
            </span>
            <h2 className="text-3xl font-serif font-normal text-[#1c1f26]">
              Location &amp; Setting
            </h2>
          </div>
          <div className="property-map-wrap relative h-[420px] rounded-[3px] border border-[#ddd8cd] overflow-hidden" ref={mapContainerRef} />
        </div>
      </section>

      {/* 11. DINING SEPARATOR IMAGE */}
      <section className="relative h-[300px] md:h-[450px] bg-[#0c1523] w-full">
        <Image
          fill
          src={getSafeImage(project.imgs, project.img, 7)}
          alt={`${project.name} Dining rendering`}
          className="object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-black/10" />
      </section>

      {/* 12. AMENITIES GRID WITH ICONS */}
      <section className="property-amenities-highlight py-20 bg-[#ffffff] border-b border-[#ddd8cd] text-[#1c1f26]">
        <div className="property-container max-w-[1140px] mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#B38E36] font-semibold block mb-2">
              RESORT LIFE
            </span>
            <h2 className="text-3xl font-serif font-normal text-[#1c1f26]">
              Highlighted Amenities
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            <div className="flex flex-col items-center text-center p-4 border border-[#ddd8cd] rounded-[2px] bg-[#FAF8F3]/50">
              <span className="text-3xl mb-4 block text-[#B38E36]">🌊</span>
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#1c1f26]">Lap Pool</h4>
              <p className="text-[9px] text-[#535862] mt-2 font-light">Waterfront sun decks</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 border border-[#ddd8cd] rounded-[2px] bg-[#FAF8F3]/50">
              <span className="text-3xl mb-4 block text-[#B38E36]">🍽️</span>
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#1c1f26]">Private Dining</h4>
              <p className="text-[9px] text-[#535862] mt-2 font-light">Chef-led menu rooms</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 border border-[#ddd8cd] rounded-[2px] bg-[#FAF8F3]/50">
              <span className="text-3xl mb-4 block text-[#B38E36]">🧘</span>
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#1c1f26]">Wellness Spa</h4>
              <p className="text-[9px] text-[#535862] mt-2 font-light">Saunas and plunges</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 border border-[#ddd8cd] rounded-[2px] bg-[#FAF8F3]/50">
              <span className="text-3xl mb-4 block text-[#B38E36]">🔑</span>
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#1c1f26]">Valet Service</h4>
              <p className="text-[9px] text-[#535862] mt-2 font-light">24/7 staff support</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 border border-[#ddd8cd] rounded-[2px] bg-[#FAF8F3]/50">
              <span className="text-3xl mb-4 block text-[#B38E36]">💪</span>
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#1c1f26]">Fitness Center</h4>
              <p className="text-[9px] text-[#535862] mt-2 font-light">Advanced equipment</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 border border-[#ddd8cd] rounded-[2px] bg-[#FAF8F3]/50">
              <span className="text-3xl mb-4 block text-[#B38E36]">☀️</span>
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#1c1f26]">Rooftop Terrace</h4>
              <p className="text-[9px] text-[#535862] mt-2 font-light">Panoramic heights</p>
            </div>
          </div>
        </div>
      </section>

      {/* 13. BROKER ADVISOR PROFILE ("Brett Fraser") */}
      <section className="property-broker py-20 bg-[#FAF8F3] border-b border-[#ddd8cd] text-[#1c1f26]">
        <div className="property-container max-w-[1140px] mx-auto px-6">
          <div className="bg-white border border-[#ddd8cd] rounded-[4px] shadow-xl p-8 md:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 lg:gap-14 items-center">
              <div className="relative aspect-[0.82/1] w-full max-w-[280px] mx-auto rounded-[3px] overflow-hidden bg-[#d9d1c5] border border-[#e2e8f0]">
                <Image
                  fill
                  src="https://frasermiami.s3.amazonaws.com/brett-fraser-headshot.jpg"
                  alt="Brett Fraser"
                  className="object-cover"
                />
              </div>

              <div className="flex flex-col justify-between h-full text-left">
                <div>
                  <span className="text-[9px] uppercase tracking-[0.28em] text-[#8f96ab] font-semibold block mb-2">
                    LUXURY REAL ESTATE ADVISOR
                  </span>
                  <h3 className="text-3xl md:text-4xl font-serif font-normal text-[#1c1f26] mb-3">
Zachary Akers
                  </h3>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#7c8498] font-light mb-6">
                    MR LUXURY GROUP &middot; ONE SOTHEBY&apos;S INTERNATIONAL REALTY
                  </p>
                  <p className="text-xs md:text-sm font-light leading-relaxed text-[#535862] max-w-[580px] mb-8">
                    Born and raised in the Cayman Islands, Brett advises a global clientele on South Florida's prime new construction market. Specializing in off-market options and pre-launch pricing, he coordinates unit-level presentations for developments before they hit the general public.
                  </p>
                </div>

                {/* Highlight Counters */}
                <div className="grid grid-cols-3 border-y border-[#ddd8cd] py-6 mb-8 max-w-[640px]">
                  <div>
                    <strong className="block text-2xl font-serif font-normal text-[#1c1f26]">15+</strong>
                    <span className="text-[9px] uppercase tracking-[0.15em] text-[#8c8376] mt-1 block">Years Experience</span>
                  </div>
                  <div>
                    <strong className="block text-2xl font-serif font-normal text-[#1c1f26]">$1.2B+</strong>
                    <span className="text-[9px] uppercase tracking-[0.15em] text-[#8c8376] mt-1 block">Career Sales</span>
                  </div>
                  <div>
                    <strong className="block text-2xl font-serif font-normal text-[#1c1f26]">#3</strong>
                    <span className="text-[9px] uppercase tracking-[0.15em] text-[#8c8376] mt-1 block">Ranked Team</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                  <a
                    href="#contact-section"
                    className="px-6 py-3.5 bg-[#bb9751] hover:bg-[#a88543] text-white text-[10px] uppercase tracking-[0.2em] font-semibold text-center transition-colors rounded-[2px]"
                  >
                    SCHEDULE PRIVATE PRESENTATION
                  </a>
                  <div className="flex gap-6 justify-center sm:justify-start items-center text-xs font-mono">
                    <a href="tel:7864758134" className="hover:text-[#bb9751] transition-colors">
                      📞 786.475.8134
                    </a>
                    <a href="mailto:brett@frasermiami.com" className="hover:text-[#bb9751] transition-colors">
                      ✉ Email Advisor
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 14. INQUIRY INTAKE FORM */}
      <section className="property-inquiry bg-[#ffffff] py-20 text-[#1c1f26] border-b border-[#ddd8cd]" id="contact-section">
        <div className="property-container max-w-[800px] mx-auto px-6 text-center">
          <span className="text-[10px] tracking-[0.3em] uppercase text-[#B38E36] font-semibold block mb-2">
            PRIVATE INTAKE
          </span>
          <h2 className="contact-info-title text-[#1c1f26] mb-2 text-3xl font-serif font-normal">
            Request Availability &amp; Presentation
          </h2>
          <p className="contact-info-desc text-[#5f6575] mb-8 font-light text-sm max-w-[540px] mx-auto">
            Schedule a private virtual presentation or receive unit-level availability, floor plans, and incentives for {project.name}.
          </p>

          <div className="max-w-[640px] mx-auto text-left mt-10">
            {formStatus === "done" ? (
              <div className="p-8 bg-green-500/5 border border-green-500/20 rounded text-center">
                <h4 className="text-xl font-serif text-green-600 mb-2">Inquiry Received</h4>
                <p className="text-xs text-[#535862] leading-relaxed">
                  Thank you. Availability and presentation options for {project.name} will be sent to your email shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group-custom">
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="form-input-custom"
                    />
                  </div>

                  <div className="form-group-custom">
                    <input
                      type="email"
                      required
                      placeholder="Your Email Address"
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
                    placeholder={`Interested in ${project.name}. Please send unit-level pricing, floor plans, and current incentives.`}
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    rows={4}
                    className="form-input-custom resize-none"
                  />
                </div>

                <div className="text-center pt-2">
                  <button
                    type="submit"
                    disabled={formStatus === "sending"}
                    className="form-submit-btn-custom min-w-[200px]"
                  >
                    {formStatus === "sending" ? "Sending..." : "SUBMIT REQUEST"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 15. EXPLORE OTHER PROPERTIES */}
      <section className="property-related bg-[#FAF8F3] py-20 text-[#1c1f26] border-t border-[#e2e8f0]">
        <div className="property-container max-w-[1140px] mx-auto px-6">
          <div className="mb-12 text-left">
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#B38E36] font-semibold block mb-2">
              DISCOVER MORE
            </span>
            <h2 className="text-3xl font-serif font-normal text-[#1c1f26]">
              Other Exquisite Developments
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProjects.map((proj) => {
              const conf = STAGES[proj.stage] || { label: "Pre-Construction", dot: "#f59e0b" };
              const displayMeta = [
                proj.stories ? `${proj.stories} stories` : null,
                proj.units ? `${proj.units} units` : null,
                proj.neighborhood,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <div
                  key={proj.slug}
                  onClick={() => router.push(`/property/${proj.slug}`)}
                  className="neighborhood-property-card bg-white cursor-pointer"
                >
                  <div className="npc-image-wrap relative aspect-[1.3/1]">
                    <img src={getImageUrl(proj.img)} alt={proj.name} loading="lazy" className="w-full h-full object-cover" />
                    {proj.comingSoon && (
                      <span className="npc-badge npc-badge--coming-soon">Coming Soon</span>
                    )}
                    {proj.badge && !proj.comingSoon && (
                      <span className="npc-badge">{proj.badge}</span>
                    )}
                  </div>

                  <div className="npc-details p-5">
                    <div className="npc-header pb-4 border-b border-[#FAF8F3] mb-4">
                      <div className="npc-title-row flex justify-between items-center mb-1">
                        <h4 className="npc-name text-[16px] font-serif font-normal text-[#1c1f26] truncate max-w-[85%]">{proj.name}</h4>
                        <span className="npc-dot w-2 h-2 rounded-full" style={{ background: conf.dot }} />
                      </div>
                      <span className="npc-meta text-[10px] text-[#8f96ab] font-light block">{displayMeta}</span>
                    </div>

                    <div className="npc-footer flex justify-between items-center mt-auto">
                      <div className="npc-price-block">
                        <span className="npc-label text-[8px] uppercase text-[#8f96ab]">Price From</span>
                        <span className="npc-value font-mono text-[11px] font-medium text-[#1c1f26]">{formatPriceStr(proj.priceFrom)}</span>
                      </div>
                      <div className="npc-stage-block text-right">
                        <span className="npc-label text-[8px] uppercase text-[#8f96ab]">Stage</span>
                        <span className="npc-value font-mono text-[11px] font-medium text-[#1c1f26] block">{conf.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Global Lightbox Slider Modal */}
      {activeImgIdx !== null && (
        <div className="property-lightbox fixed inset-0 bg-[#0C1523]/96 backdrop-blur-md z-[9999] flex flex-col justify-between items-center py-6 px-4">
          <div className="w-full max-w-[1400px] flex justify-between items-center z-50 text-white">
            <span className="text-xs uppercase tracking-[0.2em] text-[#C9A84C] font-light font-mono">
              {project.name}
            </span>
            <button
              type="button"
              onClick={() => setActiveImgIdx(null)}
              className="text-white/80 hover:text-white text-3xl font-light leading-none p-2 focus:outline-none transition-colors"
              aria-label="Close lightbox"
            >
              &times;
            </button>
          </div>

          <div className="relative w-full max-w-[1200px] h-[70vh] flex items-center justify-center my-auto z-40">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImgIdx((prev) => (prev !== null && galleryImgs.length > 0 ? (prev - 1 + galleryImgs.length) % galleryImgs.length : prev));
              }}
              className="absolute left-0 md:left-4 z-50 text-white/70 hover:text-white bg-[#0C1523]/30 hover:bg-[#C9A84C]/25 p-4 rounded-full transition-all duration-300 focus:outline-none"
              aria-label="Previous image"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-2">
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="relative w-full h-full flex items-center justify-center p-2">
              <img
                src={getImageUrl(galleryImgs[activeImgIdx])}
                alt={`${project.name} slide`}
                className="max-w-full max-h-full object-contain select-none shadow-2xl rounded-[2px]"
              />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImgIdx((prev) => (prev !== null && galleryImgs.length > 0 ? (prev + 1) % galleryImgs.length : prev));
              }}
              className="absolute right-0 md:right-4 z-50 text-white/70 hover:text-white bg-[#0C1523]/30 hover:bg-[#C9A84C]/25 p-4 rounded-full transition-all duration-300 focus:outline-none"
              aria-label="Next image"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-2">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="w-full text-center z-50 text-white/60 font-mono text-xs tracking-widest pb-4">
            {activeImgIdx + 1} / {galleryImgs.length}
          </div>
        </div>
      )}

      {/* Global Footer */}
      <SiteFooter />

      {/* Find My Project Wizard Modal */}
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
