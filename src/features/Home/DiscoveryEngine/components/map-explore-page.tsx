"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import mapboxgl from "mapbox-gl";
import projectsRaw from "@/src/data/miami-projects.json";
import FindMyProjectModal, { Vt, MatcherPrefs } from "@/src/features/FindMyProject/components/FindMyProjectModal";
import { Ht } from "@/src/data/neighborhoods";

// Map Project Interface matching extracted schema
export interface MapProject {
  id: number;
  slug: string;
  name: string;
  shortName?: string;
  neighborhood: string;
  stage: "preconstruction" | "under_construction" | "topped_off" | "move_in_ready";
  isActive: boolean;
  isFeatured: boolean;
  lat: number;
  lng: number;
  minPrice: number;
  maxPrice: number;
  priceFrom: string;
  completion: string;
  units: string | number;
  unitsLeft?: number;
  percentSold?: number;
  pricePerSqft?: number;
  comingSoon?: boolean;
  statusRemark?: string;
  badge?: string;
  img: string;
  imgs: string[];
  logo?: string;
  wellnessScore?: number;
  minBed: number | null;
  maxBed: number | null;
  projectedAppreciation?: number;
}

// Stage Configuration
export interface StageConfig {
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

function getStageConfig(project: MapProject): StageConfig {
  const base = STAGES[project.stage] || STAGES.preconstruction;
  const labelOverride = project.badge || project.statusRemark;
  if (labelOverride && typeof labelOverride === "string" && labelOverride.length < 30) {
    return { ...base, label: labelOverride };
  }
  return base;
}

// Helpers
function parsePrice(priceStr: string | null | undefined): number | null {
  if (!priceStr) return null;
  const clean = priceStr.toUpperCase().replace(/[^0-9KMB.]/g, "");
  if (clean.includes("B")) {
    return parseFloat(clean) * 1000000000;
  }
  if (clean.includes("M")) {
    return parseFloat(clean) * 1000000;
  }
  if (clean.includes("K")) {
    return parseFloat(clean) * 1000;
  }
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

function getImageUrl(path: string | null | undefined): string {
  if (!path) return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=60";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `https://frasermiami.s3.amazonaws.com/${path.replace(/^\//, "")}`;
}

function getSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getNeighborhoodSlug(neighborhood: string | null | undefined): string {
  if (!neighborhood) return "miami";
  return neighborhood
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatPrice(price: string | number | null | undefined): string {
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

function formatBeds(minBed: number | string | null | undefined, maxBed: number | string | null | undefined): string {
  if (minBed === undefined && maxBed === undefined) return "";
  const min = minBed !== null && minBed !== undefined ? String(minBed).trim() : null;
  const max = maxBed !== null && maxBed !== undefined ? String(maxBed).trim() : null;
  if (!min && !max) return "";
  if (min === max || !max) return `${min} BR`;
  if (!min) return `${max} BR`;
  return `${min} - ${max} BR`;
}

function highlightMatch(text: string, query: string) {
  if (!query || !text) return text;
  const cleanQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${cleanQuery})`, "gi");
  return text.replace(
    regex,
    (match) => `<mark style="background: rgba(184, 147, 84, 0.35); color: inherit; font-weight: 500; border-radius: 2px;">${match}</mark>`
  );
}

function searchProjects(projects: MapProject[], query: string) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  
  const results = projects.map((p) => {
    const name = (p.name || "").toLowerCase();
    const neighborhood = (p.neighborhood || "").toLowerCase();
    let score = 0;
    
    if (name === trimmed) score = 100;
    else if (name.startsWith(trimmed)) score = 90;
    else {
      const idx = name.indexOf(trimmed);
      if (idx >= 0) {
        const isWordStart = idx === 0 || /[\s\-_]/.test(name[idx - 1]);
        score = isWordStart ? 80 : 70;
      }
    }
    
    if (neighborhood.includes(trimmed)) {
      score = Math.max(score, 40);
    }
    
    return { project: p, score };
  });
  
  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.project.name.localeCompare(b.project.name))
    .map((r) => r.project)
    .slice(0, 6);
}

// Colors and fonts Theme Object
const theme = {
  cream: "#fafaf8",
  bronze: "#b89354",
  dune: "#e2dfd8",
  ink: "#1c1f26",
  mist: "#6A6A7A",
  white: "#ffffff",
  fog: "#b0b0bb",
  sienna: "#8d6731",
  creamA: (alpha: number) => `rgba(250, 250, 248, ${alpha})`,
  bronzA: (alpha: number) => `rgba(184, 147, 84, ${alpha})`,
};

type MapExplorePageProps = {
  projectNames: string[];
  featuredProjects: any[];
};

export function MapExplorePage({ projectNames, featuredProjects }: MapExplorePageProps) {
  const router = useRouter();
  const allProjects = projectsRaw as MapProject[];

  // States
  const [selected, setSelected] = useState<MapProject | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [searchHoverIndex, setSearchHoverIndex] = useState<number>(0);
  const [mobileSearchOpen, setMobileSearchOpen] = useState<boolean>(false);
  const [mapBounds, setMapBounds] = useState<mapboxgl.LngLatBounds | null>(null);

  // Dropdown States
  const [stageDropdownOpen, setStageDropdownOpen] = useState<boolean>(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState<boolean>(false);

  // Contact Modal State
  const [modal, setModal] = useState<"advisor" | "floors" | "inquiry" | null>(null);
  const [modalProject, setModalProject] = useState<MapProject | null>(null);

  // Matcher wizard modal states
  const [isMatcherOpen, setIsMatcherOpen] = useState<boolean>(false);
  const [matcherPrefs, setMatcherPrefs] = useState<MatcherPrefs | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("map-matcher-prefs");
      if (stored) {
        try {
          setMatcherPrefs(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse stored matcher prefs", e);
        }
      }
    }
  }, []);

  const matchedProjectsList = useMemo(() => {
    if (!matcherPrefs) return allProjects;
    return Vt(matcherPrefs, allProjects);
  }, [allProjects, matcherPrefs]);

  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<number, mapboxgl.Marker>>({});
  const sidebarListRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const stageDropdownRef = useRef<HTMLButtonElement>(null);
  const sortDropdownRef = useRef<HTMLButtonElement>(null);

  // Compute offset center on flyTo
  const flyToProject = (project: MapProject) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const isMobile = window.innerWidth <= 768;
    const zoom = Math.max(map.getZoom(), 14.5);

    let offsetX = 0;
    let offsetY = 0;

    if (isMobile) {
      // Y offset to push marker to the top half of the screen
      const popupEl = document.querySelector(".map-popup-container");
      const popupHeight = popupEl ? popupEl.clientHeight : window.innerHeight * 0.48;
      const mapHeight = map.getContainer().clientHeight;
      const remainingHeight = Math.max(96, mapHeight - popupHeight);
      offsetY = -(mapHeight / 2 - remainingHeight / 2);
    } else {
      // X offset to shift project to the right (away from the 380px left sidebar)
      const sidebarWidth = 380;
      offsetX = sidebarWidth / 2;
    }

    map.flyTo({
      center: [project.lng, project.lat],
      zoom: zoom,
      offset: [offsetX, offsetY],
      duration: 1000
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined" && allProjects.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const projectSlug = params.get("project");
      if (projectSlug) {
        const found = allProjects.find((p) => p.slug === projectSlug);
        if (found) {
          setTimeout(() => {
            setSelected(found);
            flyToProject(found);
          }, 300);
        }
      }
    }
  }, [allProjects]);

  // Setup Map instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      mapContainerRef.current.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          background: #fafaf8;
          color: #1c1f26;
          padding: 20px;
          text-align: center;
          font-family: var(--font-sans), sans-serif;
        ">
          <p style="font-family: var(--font-serif), serif; font-size: 18px; margin-bottom: 8px;">Map Preview</p>
          <p style="font-size: 11px; color: #8c8376; max-width: 320px; line-height: 1.5; letter-spacing: 0.05em; text-transform: uppercase;">
            Please add your Mapbox Access Token to <code>.env.local</code> to activate the interactive map.
          </p>
          <div style="margin-top: 16px; font-size: 10px; color: #b89354; font-weight: 500; letter-spacing: 0.1em;">
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
      center: [-80.185, 25.82],
      zoom: 12,
      attributionControl: true
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    // Initial markers creation
    allProjects.forEach((proj) => {
      if (typeof proj.lat !== "number" || typeof proj.lng !== "number") return;
      const m = getStageConfig(proj);

      const markerEl = document.createElement("div");
      markerEl.style.width = "16px";
      markerEl.style.height = "16px";
      markerEl.style.cursor = "pointer";
      markerEl.innerHTML = `
        <div class="map-marker" style="
          width: 16px; height: 16px; border-radius: 50%;
          background: ${m.dot}; border: 2.5px solid ${m.border};
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
          cursor: pointer; transition: transform 0.2s;
        "></div>
      `;

      const tooltipContent = `
        <div style="
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
          color: ${theme.ink}; padding: 6px 12px;
          background: rgba(250, 250, 248, 0.97);
          border: 1px solid ${theme.dune};
          box-shadow: 0 4px 16px rgba(28, 31, 38, 0.14);
          white-space: nowrap; border-radius: 0;
          font-weight: 400;
        ">
          <span style="color: ${m.dot}; margin-right: 6px;">●</span>${proj.name}
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 12, closeButton: false })
        .setHTML(tooltipContent);

      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([proj.lng, proj.lat])
        .setPopup(popup)
        .addTo(map);

      markerEl.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelected(proj);
        flyToProject(proj);
      });

      markerEl.addEventListener("mouseenter", () => {
        popup.addTo(map);
      });

      markerEl.addEventListener("mouseleave", () => {
        popup.remove();
      });

      markersRef.current[proj.id] = marker;
    });

    setMapBounds(map.getBounds());

    const handleMoveEnd = () => {
      setMapBounds(map.getBounds());
    };

    map.on("moveend", handleMoveEnd);

    // Initial resize trigger to draw properly
    setTimeout(() => {
      map.resize();
    }, 150);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []);

  // Update bounds on view mode toggles
  useEffect(() => {
    if (viewMode === "map" && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.resize();
        if (mapRef.current) setMapBounds(mapRef.current.getBounds());
      }, 100);
    }
  }, [viewMode]);

  // Sync selected project and marker style
  useEffect(() => {
    allProjects.forEach((proj) => {
      const marker = markersRef.current[proj.id];
      if (!marker) return;

      const m = getStageConfig(proj);
      const isSelected = selected?.id === proj.id;
      const el = marker.getElement();

      if (el) {
        if (isSelected) {
          el.innerHTML = `
            <div class="map-marker-beacon" style="width: 32px; height: 32px; position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
              <div style="position: relative; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;">
                <div class="ring1" style="position: absolute; left: 50%; top: 50%; width: 16px; height: 16px; margin-left: -8px; margin-top: -8px; border-radius: 50%; background: ${m.dot}; opacity: 0.7; transform-origin: center center;"></div>
                <div class="ring2" style="position: absolute; left: 50%; top: 50%; width: 16px; height: 16px; margin-left: -8px; margin-top: -8px; border-radius: 50%; background: ${m.dot}; opacity: 0.7; transform-origin: center center;"></div>
                <div style="position: relative; width: 10px; height: 10px; border-radius: 50%; background: ${m.dot}; border: 2px solid ${m.border}; box-shadow: 0 0 8px ${m.dot}, 0 2px 12px rgba(0, 0, 0, 0.4); z-index: 1; flex-shrink: 0;"></div>
              </div>
            </div>
          `;
          el.style.width = "32px";
          el.style.height = "32px";
        } else {
          el.innerHTML = `
            <div class="map-marker" style="
              width: 16px; height: 16px; border-radius: 50%;
              background: ${m.dot}; border: 2.5px solid ${m.border};
              box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
              cursor: pointer; transition: transform 0.2s;
            "></div>
          `;
          el.style.width = "16px";
          el.style.height = "16px";
        }
      }
    });
  }, [selected]);

  // Handle stage and matcher filter changes and hide/show markers
  useEffect(() => {
    const matchedIds = new Set(matchedProjectsList.map((p) => p.id));
    allProjects.forEach((proj) => {
      const marker = markersRef.current[proj.id];
      if (!marker) return;

      const passesStage = stageFilter === "all" || proj.stage === stageFilter;
      const passesMatcher = !matcherPrefs || matchedIds.has(proj.id);

      const el = marker.getElement();
      if (el) {
        if (passesStage && passesMatcher) {
          el.style.opacity = "1";
          el.style.pointerEvents = "auto";
        } else {
          el.style.opacity = "0.15";
          el.style.pointerEvents = "none";
        }
      }
    });
  }, [stageFilter, matchedProjectsList, matcherPrefs]);

  // Click outside listener for search and dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Search close
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchFocused(false);
      }

      // Stage close
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(target)) {
        setStageDropdownOpen(false);
      }

      // Sort close
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(target)) {
        setSortDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Keyboard navigation for search dropdown
  useEffect(() => {
    const handleSearchKeyDown = (e: KeyboardEvent) => {
      if (!searchFocused || searchResults.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSearchHoverIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSearchHoverIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (searchResults[searchHoverIndex]) {
          handleSelectSearchResult(searchResults[searchHoverIndex]);
        }
      } else if (e.key === "Escape") {
        setSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleSearchKeyDown);
    return () => window.removeEventListener("keydown", handleSearchKeyDown);
  }, [searchFocused, searchHoverIndex, searchQuery]);

  // Filter projects by bounds (only on map view)
  const isWithinMapBounds = (proj: MapProject) => {
    if (!mapBounds) return true;
    return mapBounds.contains([proj.lng, proj.lat]);
  };

  // Filtered List
  const stageFilteredProjects = useMemo(() => {
    return matchedProjectsList.filter((p) => stageFilter === "all" || p.stage === stageFilter);
  }, [matchedProjectsList, stageFilter]);

  const boundsFilteredProjects = useMemo(() => {
    if (viewMode !== "map" || !mapBounds) return stageFilteredProjects;
    return stageFilteredProjects.filter(isWithinMapBounds);
  }, [stageFilteredProjects, mapBounds, viewMode]);

  // Sorted List
  const processedProjects = useMemo(() => {
    const list = [...boundsFilteredProjects];

    if (sortBy === "featured") {
      if (matcherPrefs) {
        list.sort((a, b) => {
          const scoreA = (a as any).score ?? 0;
          const scoreB = (b as any).score ?? 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
        });
      }
    } else if (sortBy === "price_low") {
      list.sort((a, b) => {
        const valA = parsePrice(a.priceFrom) ?? Infinity;
        const valB = parsePrice(b.priceFrom) ?? Infinity;
        return valA - valB;
      });
    } else if (sortBy === "price_high") {
      list.sort((a, b) => {
        const valA = parsePrice(a.priceFrom) ?? -Infinity;
        const valB = parsePrice(b.priceFrom) ?? -Infinity;
        return valB - valA;
      });
    } else if (sortBy === "stage") {
      const order = ["move_in_ready", "topped_off", "under_construction", "preconstruction"];
      list.sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage));
    }

    return list;
  }, [boundsFilteredProjects, sortBy, matcherPrefs]);

  // Final List rendering order: if a project is selected, pin it to the top of the sidebar list
  const finalSidebarProjects = useMemo(() => {
    if (!selected) return processedProjects;
    const exists = processedProjects.some((p) => p.id === selected.id);
    if (!exists) return [selected, ...processedProjects];
    
    const remaining = processedProjects.filter((p) => p.id !== selected.id);
    return [selected, ...remaining];
  }, [processedProjects, selected]);

  // Auto-complete Search Results
  const searchResults = useMemo(() => {
    return searchQuery ? searchProjects(allProjects, searchQuery) : [];
  }, [allProjects, searchQuery]);

  // Stage Count helper
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: matchedProjectsList.length };
    Object.keys(STAGES).forEach((key) => {
      counts[key] = matchedProjectsList.filter((p) => p.stage === key).length;
    });
    return counts;
  }, [matchedProjectsList]);

  // Actions
  const handleSelectSearchResult = (proj: MapProject) => {
    setSearchQuery("");
    setSearchFocused(false);
    setSelected(proj);
    setMobileSearchOpen(false);
    
    // Switch to map mode automatically on mobile
    if (viewMode !== "map" && window.innerWidth <= 1100) {
      setViewMode("map");
    }
    
    // Pan to marker
    setTimeout(() => {
      flyToProject(proj);
    }, 100);
  };

  const handleSelectProject = (proj: MapProject) => {
    setSelected(proj);
    flyToProject(proj);
  };

  // Scroll to selected list item in viewport
  useEffect(() => {
    if (!selected) return;

    if (viewMode === "list") {
      const el = document.querySelector(`[data-list-project-id="${selected.id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      const el = sidebarListRef.current;
      if (el) {
        const itemEl = el.querySelector(`[data-map-proj-id="${selected.id}"]`);
        if (itemEl) {
          el.scrollTo({
            top: (itemEl as HTMLElement).offsetTop - 20,
            behavior: "smooth"
          });
        }
      }
    }
  }, [selected?.id, viewMode]);

  // Multi-image Slides state for selected popup card
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  useEffect(() => {
    setActiveImageIndex(0);
  }, [selected?.id]);

  const projectImages = useMemo(() => {
    if (!selected) return [];
    const rawImgs = selected.imgs && selected.imgs.length > 0 ? selected.imgs : [selected.img];
    // Filter out video files
    return rawImgs.map(getImageUrl).filter((url) => !url.toLowerCase().endsWith(".mp4"));
  }, [selected]);

  return (
    <div 
      className={`nav-bar-offset map-view-page ${viewMode === "list" ? "map-view-page--list" : ""}`} 
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      {/* Site Header Navbar */}
      <header className="site-header site-header-scrolled map-site-header">
        <Link className="brand" href="/">
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
          <Link
            href="/#contact"
            onClick={(e) => {
              e.preventDefault();
              setIsMatcherOpen(true);
            }}
          >
            Find My Project
          </Link>
          <div className="relative group">
            <button
              type="button"
              className="nav-dropdown flex items-center gap-1"
              onClick={() => router.push("/neighborhood")}
            >
              Neighborhoods
              <span aria-hidden="true">⌄</span>
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-[#0C1523]/95 backdrop-blur-md border border-white/10 p-4 rounded shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 grid grid-cols-2 gap-x-4 gap-y-2 text-left z-50">
              {Object.entries(Ht).map(([slug, data]) => (
                <button
                  key={slug}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/neighborhood/${slug}`);
                  }}
                  className="text-left text-gray-300 hover:text-[#C9A84C] transition-colors text-[10px] py-1 tracking-[0.1em] uppercase"
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

      {/* Search Header and Bar */}
      <div 
        className={`map-controls-bar ${viewMode === "map" ? "map-controls-bar--map-active" : "map-controls-bar--list-active"}`}
        style={{
          position: "relative",
          zIndex: 1100,
          background: theme.white,
          borderBottom: `1px solid ${theme.dune}`,
          flexShrink: 0,
          width: "100%"
        }}
      >
        <div style={{ padding: "0 16px", boxSizing: "border-box" }}>
          <div 
            className="map-controls-bar-inner" 
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 50, gap: 12 }}
          >
            {/* View Mode Toggle & Filters */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Map/List Switch */}
              <div 
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: theme.cream,
                  border: `1px solid ${theme.dune}`,
                  padding: 2,
                  gap: 2
                }}
              >
                <button
                  onClick={() => setViewMode("map")}
                  style={{
                    border: "none",
                    background: viewMode === "map" ? theme.white : "transparent",
                    color: viewMode === "map" ? theme.ink : theme.mist,
                    fontSize: 9,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: viewMode === "map" ? 500 : 400,
                    padding: "6px 12px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: viewMode === "map" ? "0 1px 3px rgba(28,31,38,0.08)" : "none"
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 4.5L3 7v12l6-2.5 6 2.5 6-2.5v-12l-6 2.5-6-2.5z" />
                    <path d="M9 4.5v12" />
                    <path d="M15 7v12" />
                  </svg>
                  Map
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  style={{
                    border: "none",
                    background: viewMode === "list" ? theme.white : "transparent",
                    color: viewMode === "list" ? theme.ink : theme.mist,
                    fontSize: 9,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: viewMode === "list" ? 500 : 400,
                    padding: "6px 12px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: viewMode === "list" ? "0 1px 3px rgba(28,31,38,0.08)" : "none"
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                  List
                </button>
              </div>

              {/* Matched Results indicator */}
              {matcherPrefs && (
                <>
                  <div style={{ width: 1, height: 14, background: theme.dune, margin: "0 8px" }} />
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      height: 26,
                      padding: "0 10px",
                      background: theme.bronzA(0.08),
                      border: `1px solid ${theme.bronze}`,
                      color: theme.ink,
                      fontSize: 9,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 500,
                      whiteSpace: "nowrap"
                    }}
                  >
                    <span>Matched Results ({matchedProjectsList.length})</span>
                    <button
                      onClick={() => {
                        setMatcherPrefs(null);
                        localStorage.removeItem("map-matcher-prefs");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: theme.mist,
                        fontSize: 12,
                        padding: 0,
                        marginLeft: 4,
                        display: "flex",
                        alignItems: "center",
                        lineHeight: 1
                      }}
                      title="Clear matches"
                    >
                      ×
                    </button>
                  </div>
                </>
              )}

              <div style={{ width: 1, height: 14, background: theme.dune, margin: "0 8px" }} />

              {/* Stage Filters (Desktop pills) */}
              <div className="stage-pills-desktop" style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setStageFilter("all")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 26,
                    padding: "0 10px",
                    border: `1px solid ${stageFilter === "all" ? theme.bronze : theme.dune}`,
                    background: stageFilter === "all" ? theme.bronzA(0.07) : theme.white,
                    color: stageFilter === "all" ? theme.ink : theme.mist,
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: stageFilter === "all" ? 500 : 400,
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  All <span style={{ fontSize: 8.5, color: stageFilter === "all" ? theme.bronze : theme.fog }}>{stageCounts.all}</span>
                </button>
                {Object.entries(STAGES).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setStageFilter(key)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      height: 26,
                      padding: "0 10px",
                      border: `1px solid ${stageFilter === key ? theme.bronze : theme.dune}`,
                      background: stageFilter === key ? theme.bronzA(0.07) : theme.white,
                      color: stageFilter === key ? theme.ink : theme.mist,
                      fontSize: 9,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: stageFilter === key ? 500 : 400,
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: config.dot }} />
                    {config.label}
                    <span style={{ fontSize: 8.5, color: stageFilter === key ? theme.bronze : theme.fog }}>{stageCounts[key]}</span>
                  </button>
                ))}
              </div>

              {/* Stage dropdown for responsive smaller widths */}
              <div className="stage-dropdown-inline" style={{ position: "relative", minWidth: 132 }}>
                <button
                  ref={stageDropdownRef}
                  onClick={() => setStageDropdownOpen(!stageDropdownOpen)}
                  style={{
                    width: "100%",
                    height: 26,
                    padding: "0 10px",
                    background: stageFilter === "all" ? theme.cream : theme.bronzA(0.07),
                    border: `1px solid ${stageDropdownOpen || stageFilter !== "all" ? theme.bronze : theme.dune}`,
                    color: theme.ink,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 8.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: "pointer"
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: stageFilter === "all" ? theme.bronze : STAGES[stageFilter]?.dot }} />
                    <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {stageFilter === "all" ? "All Stages" : STAGES[stageFilter]?.label}
                    </span>
                  </span>
                  <svg width="9" height="6" viewBox="0 0 9 6" fill="none" style={{ transform: stageDropdownOpen ? "rotate(180deg)" : "none" }}>
                    <path d="M1 1L4.5 5L8 1" stroke={stageDropdownOpen ? theme.bronze : theme.fog} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {stageDropdownOpen && (
                  <div 
                    style={{
                      position: "absolute",
                      top: 30,
                      left: 0,
                      minWidth: 200,
                      background: theme.cream,
                      border: `1px solid ${theme.dune}`,
                      boxShadow: "0 8px 24px rgba(28,31,38,0.12)",
                      zIndex: 1300,
                      display: "flex",
                      flexDirection: "column",
                      padding: "4px 0"
                    }}
                  >
                    <button
                      onClick={() => { setStageFilter("all"); setStageDropdownOpen(false); }}
                      style={{
                        background: "none", border: "none", width: "100%", textAlign: "left", padding: "8px 12px",
                        fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer",
                        color: stageFilter === "all" ? theme.ink : theme.mist, fontWeight: stageFilter === "all" ? 500 : 300
                      }}
                    >
                      All Stages ({stageCounts.all})
                    </button>
                    {Object.entries(STAGES).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => { setStageFilter(key); setStageDropdownOpen(false); }}
                        style={{
                          background: "none", border: "none", width: "100%", textAlign: "left", padding: "8px 12px",
                          fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer",
                          color: stageFilter === key ? theme.ink : theme.mist, fontWeight: stageFilter === key ? 500 : 300,
                          display: "flex", alignItems: "center", gap: 6
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: config.dot }} />
                        {config.label} ({stageCounts[key]})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sort & Search Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "flex-end", minWidth: 0 }}>
              {/* Sort Dropdown */}
              <div className="map-controls-sort-wrap" style={{ position: "relative", minWidth: 130 }}>
                <button
                  ref={sortDropdownRef}
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  style={{
                    width: "100%",
                    height: 26,
                    padding: "0 10px",
                    background: theme.cream,
                    border: `1px solid ${sortDropdownOpen ? theme.bronze : theme.dune}`,
                    color: theme.ink,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 8.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: "pointer"
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0, overflow: "hidden" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={theme.fog} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 6h10M11 12h7M11 18h4" />
                      <path d="M3 8l3-3 3 3M6 5v14" />
                    </svg>
                    <span style={{ color: theme.fog, flexShrink: 0 }}>Sort:</span>
                    <span style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {sortBy === "featured" ? "Featured" : sortBy === "price_low" ? "Price: Low to High" : sortBy === "price_high" ? "Price: High to Low" : "Stage"}
                    </span>
                  </span>
                  <svg width="9" height="6" viewBox="0 0 9 6" fill="none" style={{ transform: sortDropdownOpen ? "rotate(180deg)" : "none" }}>
                    <path d="M1 1L4.5 5L8 1" stroke={sortDropdownOpen ? theme.bronze : theme.fog} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {sortDropdownOpen && (
                  <div 
                    style={{
                      position: "absolute",
                      top: 30,
                      left: 0,
                      width: "100%",
                      background: theme.cream,
                      border: `1px solid ${theme.dune}`,
                      boxShadow: "0 8px 24px rgba(28,31,38,0.12)",
                      zIndex: 1300,
                      display: "flex",
                      flexDirection: "column",
                      padding: "4px 0"
                    }}
                  >
                    {[
                      { key: "featured", label: "Featured" },
                      { key: "price_low", label: "Price: Low to High" },
                      { key: "price_high", label: "Price: High to Low" },
                      { key: "stage", label: "Stage" }
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => { setSortBy(item.key); setSortDropdownOpen(false); }}
                        style={{
                          background: "none", border: "none", width: "100%", textAlign: "left", padding: "8px 12px",
                          fontSize: 8.5, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer",
                          color: sortBy === item.key ? theme.ink : theme.mist, fontWeight: sortBy === item.key ? 500 : 300
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Inline Search Bar (Desktop) */}
              <div 
                ref={searchContainerRef}
                className="map-controls-search-inline" 
                style={{ position: "relative", flex: "0 1 240px", minWidth: 160, maxWidth: 320 }}
              >
                <div 
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: 26,
                    background: theme.cream,
                    border: `1px solid ${searchFocused ? theme.bronze : theme.dune}`,
                    fontFamily: "'DM Sans', sans-serif"
                  }}
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    autoComplete="off"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchFocused(true); setSearchHoverIndex(0); }}
                    onFocus={() => setSearchFocused(true)}
                    placeholder="Search projects..."
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: "100%",
                      padding: "0 10px",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: theme.ink,
                      fontSize: 10,
                      letterSpacing: "0.08em"
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(""); setSearchHoverIndex(0); searchInputRef.current?.focus(); }}
                      style={{ background: "none", border: "none", color: theme.mist, cursor: "pointer", padding: "0 8px", fontSize: 14 }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Desktop Search Results Dropdown */}
                {searchFocused && searchQuery.trim().length > 0 && (
                  <div 
                    ref={searchResultsRef}
                    style={{
                      position: "absolute",
                      top: 30,
                      left: 0,
                      width: "100%",
                      background: theme.white,
                      border: `1px solid ${theme.dune}`,
                      boxShadow: "0 8px 24px rgba(28,31,38,0.12)",
                      maxHeight: 280,
                      overflowY: "auto",
                      zIndex: 1300
                    }}
                  >
                    {searchResults.length > 0 ? (
                      searchResults.map((proj, idx) => (
                        <div
                          key={proj.id}
                          onMouseEnter={() => setSearchHoverIndex(idx)}
                          onClick={() => handleSelectSearchResult(proj)}
                          style={{
                            padding: "10px 12px",
                            cursor: "pointer",
                            borderBottom: idx < searchResults.length - 1 ? `1px solid ${theme.dune}` : "none",
                            background: idx === searchHoverIndex ? theme.bronzA(0.2) : "transparent"
                          }}
                        >
                          <div 
                            style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, color: theme.ink, marginBottom: 2 }}
                            dangerouslySetInnerHTML={{ __html: highlightMatch(proj.name, searchQuery) }}
                          />
                          <div style={{ fontSize: 10, color: theme.mist, display: "flex", gap: 8 }}>
                            <span>{proj.neighborhood}</span>
                            <span>{formatPrice(proj.priceFrom)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: 12, fontSize: 11, color: theme.mist }}>No projects found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Search Button */}
              <div className="map-mobile-search-wrap">
                <button
                  onClick={() => setMobileSearchOpen(true)}
                  style={{
                    width: 28,
                    height: 28,
                    border: `1px solid ${theme.dune}`,
                    background: theme.cream,
                    color: theme.ink,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="M16 16L21 21" />
                  </svg>
                </button>
              </div>

              {/* speak with Brett Action */}
              <div className="map-bar-cta" style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: 1, height: 14, background: theme.dune, margin: "0 8px 0 2px" }} />
                <button
                  onClick={() => { setModalProject(null); setModal("advisor"); }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    border: "none",
                    background: "transparent",
                    color: theme.bronze,
                    fontSize: 9.5,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  Speak with Brett
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <polyline points="13 5 20 12 13 19" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay Full Screen Takeover */}
      {mobileSearchOpen && (
        <div 
          ref={mobileSearchContainerRef}
          style={{
            position: "fixed",
            inset: 0,
            background: theme.white,
            zIndex: 1500,
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${theme.dune}`, gap: 10 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.fog} strokeWidth="1.8">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16L21 21" />
            </svg>
            <input
              ref={mobileSearchInputRef}
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, neighborhoods..."
              style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: theme.ink }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                style={{ border: "none", background: "transparent", fontSize: 18, color: theme.mist, padding: 4 }}
              >
                ×
              </button>
            )}
            <button 
              onClick={() => { setMobileSearchOpen(false); setSearchQuery(""); }}
              style={{
                border: "none", background: "transparent", cursor: "pointer",
                fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
                fontFamily: "'DM Sans', sans-serif", color: theme.mist
              }}
            >
              Cancel
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {searchQuery.trim().length > 0 ? (
              searchResults.length > 0 ? (
                searchResults.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => handleSelectSearchResult(proj)}
                    style={{ padding: "14px 20px", borderBottom: `1px solid ${theme.dune}` }}
                  >
                    <div 
                      style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: theme.ink, marginBottom: 4 }}
                      dangerouslySetInnerHTML={{ __html: highlightMatch(proj.name, searchQuery) }}
                    />
                    <div style={{ fontSize: 11, color: theme.mist, display: "flex", gap: 8 }}>
                      <span>{proj.neighborhood}</span>
                      <span>{formatPrice(proj.priceFrom)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "20px", textAlign: "center", fontSize: 12, color: theme.mist }}>No matches found</div>
              )
            ) : (
              <div style={{ padding: "20px", textAlign: "center", fontSize: 12, color: theme.mist }}>Start typing to find new developments...</div>
            )}
          </div>
        </div>
      )}

      {/* Main View Area */}

      {/* List Mode View */}
      <div 
        className="map-page-list-view" 
        style={{
          flex: 1,
          display: viewMode === "list" ? "flex" : "none",
          flexDirection: "column",
          overflow: "hidden",
          background: theme.cream
        }}
      >
        <div style={{ flex: 1, overflowY: "auto", width: "100%", padding: "24px 0" }}>
          <div className="map-list-grid-shell" style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
            {/* Recommendations Header if any matches logic */}
            {processedProjects.length === 0 ? (
              <div style={{ padding: "64px 24px", textAlign: "center" }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 300, color: theme.ink, margin: "0 0 8px" }}>
                  No projects match this filter
                </h3>
                <p style={{ fontSize: 13, color: theme.mist, maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.6 }}>
                  Pre-construction inventory shifts constantly. Speak with Brett to find off-market units.
                </p>
                <button
                  onClick={() => { setModalProject(null); setModal("advisor"); }}
                  style={{
                    padding: "12px 28px", background: theme.ink, color: theme.cream, border: "none",
                    fontFamily: "'DM Sans', sans-serif", fontSize: 9.5, letterSpacing: "0.22em",
                    textTransform: "uppercase", cursor: "pointer"
                  }}
                >
                  Speak with Brett
                </button>
              </div>
            ) : (
              <div className="map-list-card-grid">
                {processedProjects.map((proj) => {
                  const m = getStageConfig(proj);
                  const bedsStr = formatBeds(proj.minPrice, proj.maxPrice); // Wait, beds fields minBed/maxBed
                  // Let's resolve the beds range if any, or default to stats bed
                  // In our database we have minPrice, maxPrice, but let's check beds info. 
                  // If it has bed fields, format them
                  const bedsLabel = proj.wellnessScore ? `${proj.wellnessScore} / 100` : ""; // We can display wellness or beds
                  
                  return (
                    <div 
                      key={proj.id}
                      data-list-project-id={proj.id}
                      className={`map-list-card ${selected?.id === proj.id ? "map-list-card--selected" : ""}`}
                      onClick={() => handleSelectProject(proj)}
                      style={{
                        background: theme.white,
                        cursor: "pointer",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                        boxShadow: selected?.id === proj.id 
                          ? `0 0 0 1px ${theme.bronze}, 0 6px 16px rgba(184,147,84,0.2)` 
                          : "0 1px 2px rgba(28,31,38,0.04)",
                        border: selected?.id === proj.id ? `1px solid ${theme.bronze}` : "1px solid transparent",
                        borderRadius: 4,
                        overflow: "hidden"
                      }}
                    >
                      {/* Image Hero */}
                      <div className="map-list-card-hero" style={{ overflow: "hidden", position: "relative", aspectRatio: "3/2", background: theme.ink }}>
                        <img 
                          src={getImageUrl(proj.img)} 
                          alt={proj.name} 
                          loading="lazy" 
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} 
                        />
                        <div className="map-list-image-gradient" />
                        <div 
                          style={{ 
                            position: "absolute", top: 12, left: 12, width: 10, height: 10, 
                            borderRadius: "50%", background: m.dot, boxShadow: "0 0 0 1px rgba(255,255,255,0.6)", zIndex: 4 
                          }} 
                        />
                        <div 
                          className="map-list-stage-label" 
                          style={{ 
                            position: "absolute", top: 28, left: 12, color: theme.white, fontWeight: 500, 
                            letterSpacing: "0.14em", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", zIndex: 4 
                          }}
                        >
                          {m.label}
                        </div>
                        {proj.logo && (
                          <img 
                            className="map-list-card-logo"
                            src={getImageUrl(proj.logo)} 
                            alt="" 
                            style={{
                              position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 4,
                              maxHeight: 48, maxWidth: "60%", objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.95
                            }}
                          />
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="map-list-card-body" style={{ padding: "12px 14px 14px", background: theme.white }}>
                        <div 
                          className="map-list-card-title" 
                          style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: theme.ink, lineHeight: 1.25, marginBottom: 4 }}
                        >
                          {proj.name}
                        </div>
                        <div className="map-list-card-meta-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ color: theme.bronze, fontSize: 11, letterSpacing: "0.08em" }}>{proj.neighborhood}</span>
                          <div className="map-list-card-price" style={{ fontFamily: "'Playfair Display', serif", color: theme.bronze, fontSize: 13 }}>
                            {formatPrice(proj.priceFrom)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Mode View */}
      <div 
        className="map-view-container" 
        style={{
          flex: 1,
          display: viewMode === "map" ? "flex" : "none",
          flexDirection: "row",
          overflow: "hidden",
          minWidth: 0,
          minHeight: 0
        }}
      >
        {/* Left Sidebar */}
        <div 
          className="map-sidebar" 
          style={{
            width: 380,
            minWidth: 380,
            background: theme.white,
            borderRight: `1px solid ${theme.dune}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 0
          }}
        >
          {/* Properties Count */}
          <div style={{ padding: "10px 18px 4px", borderBottom: `1px solid ${theme.dune}`, flexShrink: 0 }}>
            <span style={{ fontSize: 9, letterSpacing: "0.22em", color: theme.fog, textTransform: "uppercase" }}>
              {processedProjects.length} Properties in View
            </span>
          </div>

          {/* Sidebar List Scroll */}
          <div 
            ref={sidebarListRef}
            className="map-sidebar-scroll" 
            style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0 }}
          >
            {finalSidebarProjects.length === 0 ? (
              <div style={{ padding: "24px 18px", fontSize: 12, lineHeight: 1.55, color: theme.mist, fontWeight: 300 }}>
                No properties in this map area. Pan or zoom the map to explore Miami.
                <button
                  onClick={() => { setModalProject(null); setModal("advisor"); }}
                  style={{
                    display: "block", marginTop: 12, padding: 0, border: "none", background: "transparent",
                    color: theme.bronze, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase",
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: "pointer", textAlign: "left"
                  }}
                >
                  Or ask Brett about off-market inventory →
                </button>
              </div>
            ) : (
              finalSidebarProjects.map((proj) => {
                const isSelected = selected?.id === proj.id;
                const m = getStageConfig(proj);
                const showBadge = proj.badge || proj.statusRemark;

                return (
                  <div
                    key={proj.id}
                    data-map-proj-id={proj.id}
                    className={`proj-row ${isSelected ? "proj-row--map-selected" : ""}`}
                    onClick={() => handleSelectProject(proj)}
                    style={{
                      padding: "10px 18px",
                      borderBottom: `1px solid ${theme.dune}`,
                      borderLeft: `3px solid ${isSelected ? m.dot : "transparent"}`,
                      background: isSelected ? "rgba(184, 147, 84, 0.16)" : "transparent",
                      boxShadow: isSelected ? `inset 0 0 0 1px ${theme.bronzA(0.25)}` : "none",
                      transition: "all 0.15s",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", gap: 12 }}>
                      {/* Thumbnail */}
                      <div className="map-proj-row-thumb" style={{ position: "relative", width: 72, height: 72, flexShrink: 0, background: theme.ink }}>
                        <img 
                          src={getImageUrl(proj.img)} 
                          alt="" 
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} 
                        />
                        <span 
                          className="map-proj-row-thumb-dot" 
                          style={{ 
                            position: "absolute", bottom: -2, right: -2, width: 10, height: 10, 
                            borderRadius: "50%", background: m.dot, border: "1.5px solid #fff" 
                          }} 
                        />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                          <div 
                            style={{ 
                              fontFamily: "'Playfair Display', serif", fontSize: 13.5, fontWeight: 400, 
                              color: theme.ink, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" 
                            }}
                          >
                            {proj.name}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 2 }}>
                            <span style={{ fontSize: 10.5, color: theme.bronze, letterSpacing: "0.08em" }}>
                              {proj.neighborhood}
                            </span>
                            <span style={{ fontSize: 12, fontFamily: "'Playfair Display', serif", color: theme.bronze }}>
                              {formatPrice(proj.priceFrom)}
                            </span>
                          </div>
                        </div>
                        {showBadge && (
                          <div 
                            className="status-badge-text" 
                            style={{
                              fontSize: 8.5, letterSpacing: "0.08em", color: m.dot, textTransform: "uppercase", 
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 4
                            }}
                          >
                            {showBadge}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* speak with advisor bottom block */}
          <button
            onClick={() => { setModalProject(null); setModal("advisor"); }}
            className="map-sidebar-connect-mobile"
            style={{
              width: "100%",
              padding: "13px 18px",
              background: "transparent",
              border: "none",
              borderTop: `1px solid ${theme.dune}`,
              cursor: "pointer",
              textAlign: "center",
              fontSize: 9,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: theme.bronze,
              fontFamily: "'DM Sans', sans-serif",
              flexShrink: 0
            }}
          >
            ✦ Connect with Brett →
          </button>
        </div>

        {/* Map Container */}
        <div style={{ flex: 1, position: "relative", height: "100%", minWidth: 0, minHeight: 0 }}>
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%", zIndex: 1 }} />

          {/* Construction Stage Legend Overlay */}
          <div 
            className="map-legend" 
            style={{
              position: "absolute",
              bottom: 28,
              left: 16,
              zIndex: 1000,
              backdropFilter: "blur(12px)",
              background: "rgba(250,250,248,0.92)",
              border: `1px solid ${theme.dune}`,
              padding: "12px 16px",
              boxShadow: "0 4px 24px rgba(28,31,38,0.12)"
            }}
          >
            <div style={{ fontSize: 8, letterSpacing: "0.26em", color: theme.mist, textTransform: "uppercase", marginBottom: 8 }}>
              Construction Stage
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(STAGES).map(([key, config]) => (
                <div 
                  key={key} 
                  onClick={() => setStageFilter(stageFilter === key ? "all" : key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                    opacity: stageFilter !== "all" && stageFilter !== key ? 0.4 : 1,
                    transition: "opacity 0.2s"
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: config.dot }} />
                  <span style={{ fontSize: 9.5, color: theme.ink, fontWeight: stageFilter === key ? 500 : 400 }}>
                    {config.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile slide-up details popup card */}
          {selected && (
            <div className="map-popup-container">
              {/* Sheet Handle for swipe indication */}
              <div className="map-popup-sheet-handle" />

              {/* Close Button */}
              <button 
                onClick={() => setSelected(null)}
                style={{
                  position: "absolute", top: 12, right: 12, zIndex: 10, background: "rgba(0,0,0,0.5)",
                  border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", color: "#fff"
                }}
              >
                ×
              </button>

              {/* Slider / Image Gallery */}
              <div className="map-popup-image" style={{ position: "relative", height: 160, background: theme.ink }}>
                <img 
                  src={projectImages[activeImageIndex]} 
                  alt={selected.name} 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                />
                
                {/* Dots / Gallery Indexes */}
                {projectImages.length > 1 && (
                  <div 
                    style={{
                      position: "absolute", bottom: 8, right: 12, background: "rgba(0,0,0,0.6)",
                      padding: "3px 8px", borderRadius: 10, color: "#fff", fontSize: 9, letterSpacing: "0.1em"
                    }}
                  >
                    {activeImageIndex + 1} / {projectImages.length}
                  </div>
                )}

                {/* Left/Right Slider arrows */}
                {projectImages.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev === 0 ? projectImages.length - 1 : prev - 1));
                      }}
                      style={{
                        position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                        background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: 24, height: 24,
                        borderRadius: "50%", cursor: "pointer"
                      }}
                    >
                      ‹
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev === projectImages.length - 1 ? 0 : prev + 1));
                      }}
                      style={{
                        position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                        background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: 24, height: 24,
                        borderRadius: "50%", cursor: "pointer"
                      }}
                    >
                      ›
                    </button>
                  </>
                )}

                <div 
                  style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
                    padding: "16px 12px 8px"
                  }}
                >
                  <div style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: theme.bronze }}>
                    {selected.neighborhood}
                  </div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#fff", marginTop: 2 }}>
                    {selected.name}
                  </div>
                </div>
              </div>

              {/* Specs Statistics row */}
              <div 
                className="map-popup-stats-row" 
                style={{
                  display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                  borderBottom: `1px solid ${theme.dune}`, textAlign: "center", padding: "12px 4px"
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontFamily: "'Playfair Display', serif", color: theme.bronze }}>
                    {formatPrice(selected.priceFrom)}
                  </div>
                  <div style={{ fontSize: 8.5, letterSpacing: "0.08em", color: theme.mist, textTransform: "uppercase", marginTop: 2 }}>
                    Price From
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontFamily: "'Playfair Display', serif", color: theme.ink }}>
                    {selected.units || "—"}
                  </div>
                  <div style={{ fontSize: 8.5, letterSpacing: "0.08em", color: theme.mist, textTransform: "uppercase", marginTop: 2 }}>
                    Total Units
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontFamily: "'Playfair Display', serif", color: theme.ink }}>
                    {selected.completion || "TBD"}
                  </div>
                  <div style={{ fontSize: 8.5, letterSpacing: "0.08em", color: theme.mist, textTransform: "uppercase", marginTop: 2 }}>
                    Delivery
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div style={{ padding: "12px 16px" }}>
                {selected.statusRemark && (
                  <div style={{ fontSize: 9.5, letterSpacing: "0.08em", color: theme.bronze, textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>
                    {selected.statusRemark}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button 
                    onClick={() => { setModalProject(selected); setModal("floors"); }}
                    style={{
                      flex: 1, padding: "12px", background: theme.ink, color: "#fff", border: "none",
                      fontFamily: "'DM Sans', sans-serif", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase",
                      cursor: "pointer"
                    }}
                  >
                    ✦ Request Pricing
                  </button>
                  <button 
                    onClick={() => router.push(`/property/${selected.slug}`)}
                    style={{
                      flex: 1, padding: "12px", background: "transparent", border: `1px solid ${theme.dune}`,
                      color: theme.ink, fontFamily: "'DM Sans', sans-serif", fontSize: 9, letterSpacing: "0.16em",
                      textTransform: "uppercase", cursor: "pointer"
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* global contact advisor / pricing Form Modals */}
      {modal && (
        <div 
          style={{
            position: "fixed", inset: 0, background: "rgba(28,31,38,0.72)", backdropFilter: "blur(4px)",
            zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16
          }}
        >
          <div 
            style={{
              background: theme.cream, border: `1px solid ${theme.dune}`, width: "100%", maxWidth: 460,
              position: "relative", padding: "32px 24px", boxShadow: "0 12px 48px rgba(0,0,0,0.3)"
            }}
          >
            <button 
              onClick={() => setModal(null)}
              style={{
                position: "absolute", top: 12, right: 12, border: "none", background: "transparent",
                fontSize: 20, cursor: "pointer", color: theme.mist
              }}
            >
              ×
            </button>

            <span style={{ fontSize: 9, letterSpacing: "0.24em", color: theme.bronze, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              {modal === "advisor" ? "Fraser Miami Advisors" : modalProject ? modalProject.name : "Request Information"}
            </span>

            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 400, color: theme.ink, margin: "0 0 12px" }}>
              {modal === "advisor" 
                ? "Connect with Zachary Akers" 
                : modal === "floors" 
                ? "Request Floor Plans & Pricing" 
                : "Register Early VIP Access"}
            </h3>

            <p style={{ fontSize: 12, color: theme.mist, lineHeight: 1.5, margin: "0 0 20px" }}>
              Get direct priority allocations, private pricing indices, and floor plan layouts sent to you.
            </p>

            {/* Simple Contact Form */}
            <form onSubmit={(e) => { e.preventDefault(); alert("Inquiry submitted! We will contact you shortly."); setModal(null); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input 
                type="text" required placeholder="Full Name" 
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.dune}`, background: "#fff", fontSize: 12 }} 
              />
              <input 
                type="email" required placeholder="Email Address" 
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.dune}`, background: "#fff", fontSize: 12 }} 
              />
              <input 
                type="tel" placeholder="Phone Number" 
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.dune}`, background: "#fff", fontSize: 12 }} 
              />
              <textarea 
                rows={3} placeholder="Tell us what you're looking for..." 
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${theme.dune}`, background: "#fff", fontSize: 12, resize: "none" }} 
              />
              <button 
                type="submit"
                style={{
                  width: "100%", padding: "12px", background: theme.ink, color: theme.cream, border: "none",
                  fontFamily: "'DM Sans', sans-serif", fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase",
                  cursor: "pointer", marginTop: 8
                }}
              >
                Submit Inquiry
              </button>
            </form>
          </div>
        </div>
      )}

      {isMatcherOpen && (
        <FindMyProjectModal
          onClose={() => setIsMatcherOpen(false)}
          onDone={(results) => {
            setIsMatcherOpen(false);
            setMatcherPrefs(results.prefs);
            localStorage.setItem("map-matcher-prefs", JSON.stringify(results.prefs));
          }}
        />
      )}
    </div>
  );
}
