"use client";

import Image from "next/image";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdvisorSection } from "@/src/features/Home/components/advisor-section";
import { SiteFooter } from "@/src/features/Home/components/site-footer";
import { useInquiry } from "@/src/features/inquiry/components/inquiry-provider";

type Tier = "sovereign" | "ultra-prime" | "prime";
type BridgeAccess = "no-fixed-bridges" | "bridge-limited";

type Sale = {
  id: string;
  address: string;
  enclave: string;
  price: number;
  displayPrice: string;
  closeDate: string;
  lat: number;
  lng: number;
  tier: Tier;
  note?: string;
  waterfrontFt?: number;
  lotNote?: string;
  bridgeAccess?: BridgeAccess;
};

type Enclave = {
  name: string;
  slug: string;
  security: string;
  tagline: string;
  dockageNote: string;
  priceFrom: string;
  bridgeAccess: BridgeAccess;
};

const bronze = "#c9a84c";

const tierConfig: { label: string; tier: Tier }[] = [
  { label: "$50M and above", tier: "sovereign" },
  { label: "$30M to $50M", tier: "ultra-prime" },
  { label: "$25M to $30M", tier: "prime" },
];

const bridgeCopy: Record<BridgeAccess, string> = {
  "no-fixed-bridges": "No fixed bridges",
  "bridge-limited": "Bridge limited",
};

const enclaves: Enclave[] = [
  {
    name: "Indian Creek",
    slug: "indian-creek",
    security: "Guarded island",
    tagline: "A private island village with its own police force.",
    dockageNote: "Deep-water lots with direct bay access and no fixed bridges to open water.",
    priceFrom: "from $30M+",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    name: "La Gorce Island",
    slug: "la-gorce-island",
    security: "Guarded island",
    tagline: "The most active high-end waterfront market of the last two years.",
    dockageNote: "Guard-gated island inside La Gorce with deep-water frontage.",
    priceFrom: "from $30M+",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    name: "Gables Estates",
    slug: "gables-estates",
    security: "Guarded mainland",
    tagline: "Coral Gables' most exclusive guard-gated enclave.",
    dockageNote: "Large lots with private docks and deep-water access to Biscayne Bay.",
    priceFrom: "from $25M+",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    name: "Tahiti Beach",
    slug: "tahiti-beach",
    security: "Guarded mainland",
    tagline: "Double-gated estates on Biscayne Bay.",
    dockageNote: "Private docks, private beach, and true open-water access.",
    priceFrom: "from $30M+",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    name: "Golden Beach",
    slug: "golden-beach",
    security: "Atlantic access",
    tagline: "Oceanfront town with its own police force.",
    dockageNote: "Intracoastal docks with quick Atlantic access and no high-rises.",
    priceFrom: "from $25M+",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    name: "Bay Point",
    slug: "bay-point",
    security: "Guarded mainland",
    tagline: "Guard-gated bayfront in Miami's urban core.",
    dockageNote: "Private streets, resident-owned roads, and direct bay lots.",
    priceFrom: "from $25M+",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    name: "North Bay Road",
    slug: "north-bay-road",
    security: "Open bayfront",
    tagline: "The benchmark bayfront street in Miami Beach.",
    dockageNote: "Wide western-exposure lots with sunset views and deep-water dockage.",
    priceFrom: "from $25M+",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    name: "Sunset Islands",
    slug: "sunset-islands",
    security: "Guarded island",
    tagline: "Four islands with steady high-end turnover.",
    dockageNote: "Controlled entry and consistent activity, but vessel clearance is limited.",
    priceFrom: "from $25M+",
    bridgeAccess: "bridge-limited",
  },
];

const sales: Sale[] = [
  {
    id: "indian-creek-7",
    address: "7 Indian Creek Island Rd",
    enclave: "Indian Creek",
    price: 170_000_000,
    displayPrice: "$170M",
    closeDate: "2026-03-02",
    lat: 25.88061,
    lng: -80.141376,
    tier: "sovereign",
    note: "New Miami-Dade single-family record.",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "lagorce-18",
    address: "18 La Gorce Cir",
    enclave: "La Gorce Island",
    price: 122_125_121,
    displayPrice: "$122.13M",
    closeDate: "2024-10-25",
    lat: 25.846868,
    lng: -80.130173,
    tier: "sovereign",
    lotNote: "2.87-acre lot",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "star-26",
    address: "26 E Star Island Dr",
    enclave: "Star Island",
    price: 120_000_000,
    displayPrice: "$120M",
    closeDate: "2025-02-24",
    lat: 25.779645,
    lng: -80.150572,
    tier: "sovereign",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "brickell-compound",
    address: "3031/3115 Brickell Ave",
    enclave: "Coconut Grove",
    price: 106_875_000,
    displayPrice: "$106.88M",
    closeDate: "2022-08-08",
    lat: 25.74753,
    lng: -80.207978,
    tier: "sovereign",
    note: "Off-market. Four-acre bayfront compound.",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "north-bay-5940",
    address: "5940 N Bay Rd",
    enclave: "North Bay Road",
    price: 105_000_000,
    displayPrice: "$105M",
    closeDate: "2025-07-21",
    lat: 25.841159,
    lng: -80.131554,
    tier: "sovereign",
    note: "Off-market acquisition, directly brokered.",
    lotNote: "2.34-acre lot",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "bay-point-4445",
    address: "4445 Sabal Palm Rd",
    enclave: "Bay Point",
    price: 85_200_000,
    displayPrice: "$85.2M",
    closeDate: "2025-01-07",
    lat: 25.818866,
    lng: -80.18089,
    tier: "sovereign",
    note: "Bay Point record sale.",
    lotNote: "1.68-acre lot",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "lagorce-88",
    address: "88 La Gorce Cir",
    enclave: "La Gorce Island",
    price: 74_250_000,
    displayPrice: "$74.25M",
    closeDate: "2025-04-24",
    lat: 25.849077,
    lng: -80.126839,
    tier: "sovereign",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "north-bay-4736",
    address: "4736 N Bay Rd",
    enclave: "North Bay Road",
    price: 72_250_000,
    displayPrice: "$72.25M",
    closeDate: "2024-10-11",
    lat: 25.824097,
    lng: -80.135731,
    tier: "sovereign",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "bal-bay-276",
    address: "276 Bal Bay Dr",
    enclave: "Bal Harbour",
    price: 69_500_000,
    displayPrice: "$69.5M",
    closeDate: "2025-03-03",
    lat: 25.898589,
    lng: -80.126451,
    tier: "sovereign",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "gables-41",
    address: "41 Arvida Pkwy",
    enclave: "Gables Estates",
    price: 50_000_000,
    displayPrice: "$50M",
    closeDate: "2025-10-10",
    lat: 25.68995,
    lng: -80.250247,
    tier: "sovereign",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "palm-40",
    address: "40 Palm Ave",
    enclave: "Palm Island",
    price: 45_000_000,
    displayPrice: "$45M",
    closeDate: "2025-02-27",
    lat: 25.778148,
    lng: -80.158401,
    tier: "ultra-prime",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "bal-bay-56",
    address: "56 Bal Bay Dr",
    enclave: "Bal Harbour",
    price: 42_973_750,
    displayPrice: "$42.97M",
    closeDate: "2026-06-16",
    lat: 25.889177,
    lng: -80.127553,
    tier: "ultra-prime",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "hibiscus-101",
    address: "101 N Hibiscus Dr",
    enclave: "Hibiscus Island",
    price: 40_250_000,
    displayPrice: "$40.25M",
    closeDate: "2024-08-28",
    lat: 25.782453,
    lng: -80.157758,
    tier: "ultra-prime",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "sunset-3080",
    address: "3080 N Bay Rd",
    enclave: "Sunset Islands",
    price: 40_000_000,
    displayPrice: "$40M",
    closeDate: "2025-04-25",
    lat: 25.80612,
    lng: -80.139749,
    tier: "ultra-prime",
    bridgeAccess: "bridge-limited",
  },
  {
    id: "star-33",
    address: "33 E Star Island Dr",
    enclave: "Star Island",
    price: 38_700_000,
    displayPrice: "$38.7M",
    closeDate: "2025-01-14",
    lat: 25.777161,
    lng: -80.149775,
    tier: "ultra-prime",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "north-bay-5300",
    address: "5300 N Bay Rd",
    enclave: "North Bay Road",
    price: 27_000_000,
    displayPrice: "$27M",
    closeDate: "2026-05-27",
    lat: 25.831283,
    lng: -80.129951,
    tier: "prime",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "gables-555",
    address: "555 Arvida Pkwy",
    enclave: "Gables Estates",
    price: 26_202_689,
    displayPrice: "$26.2M",
    closeDate: "2026-05-29",
    lat: 25.68982,
    lng: -80.263825,
    tier: "prime",
    bridgeAccess: "no-fixed-bridges",
  },
  {
    id: "venetian-1417",
    address: "1417 N Venetian Way",
    enclave: "Venetian Islands",
    price: 27_500_000,
    displayPrice: "$27.5M",
    closeDate: "2026-04-03",
    lat: 25.790999,
    lng: -80.166946,
    tier: "prime",
    bridgeAccess: "bridge-limited",
  },
];

function markerRadius(price: number) {
  return 7 + ((Math.sqrt(price) - Math.sqrt(25_000_000)) / (Math.sqrt(170_000_000) - Math.sqrt(25_000_000))) * 10;
}

function formatCloseDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function WaterfrontPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const [selectedSale, setSelectedSale] = useState<Sale | null>(sales[0]);
  const [hoveredSaleId, setHoveredSaleId] = useState<string | null>(null);
  const { openInquiry } = useInquiry();

  const groupedSales = useMemo(
    () =>
      tierConfig.map((group) => ({
        ...group,
        items: sales
          .filter((sale) => sale.tier === group.tier)
          .sort((left, right) => right.price - left.price),
      })),
    [],
  );

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

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-80.16, 25.81],
      zoom: 11,
      attributionControl: true
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    const bounds = new mapboxgl.LngLatBounds();

    sales.forEach((sale) => {
      const diameter = markerRadius(sale.price) * 2;

      const markerEl = document.createElement("div");
      markerEl.style.width = `${diameter}px`;
      markerEl.style.height = `${diameter}px`;
      markerEl.style.borderRadius = "50%";
      markerEl.style.border = `2px solid ${bronze}`;
      markerEl.style.backgroundColor = sale.price >= 50_000_000 ? "rgba(201, 168, 76, 0.46)" : "rgba(201, 168, 76, 0.08)";
      markerEl.style.cursor = "pointer";
      markerEl.style.transition = "transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease";

      const popup = new mapboxgl.Popup({ offset: diameter / 2 + 5, closeButton: false })
        .setHTML(`<div class="font-sans text-[11px] tracking-[0.05em] uppercase font-semibold text-[#1c1f26] p-1">${sale.address} <span class="text-[#B38E36] font-mono">${sale.displayPrice}</span></div>`);

      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([sale.lng, sale.lat])
        .setPopup(popup)
        .addTo(map);

      markerEl.addEventListener("click", () => {
        setSelectedSale(sale);
      });

      markerEl.addEventListener("mouseenter", () => {
        setHoveredSaleId(sale.id);
        popup.addTo(map);
      });

      markerEl.addEventListener("mouseleave", () => {
        setHoveredSaleId((current) => (current === sale.id ? null : current));
        popup.remove();
      });

      markersRef.current[sale.id] = marker;
      bounds.extend([sale.lng, sale.lat]);
    });

    map.fitBounds(bounds, {
      padding: 36,
      maxZoom: 12,
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []);

  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const sale = sales.find((entry) => entry.id === id);
      if (!sale) return;
      const isSelected = sale.id === selectedSale?.id;
      const isHovered = sale.id === hoveredSaleId;
      
      const el = marker.getElement();
      if (el) {
        el.style.borderColor = isSelected ? "#ffffff" : bronze;
        el.style.borderWidth = isSelected ? "3px" : isHovered ? "2.5px" : "2px";
        el.style.backgroundColor = isSelected 
          ? bronze 
          : isHovered 
            ? "rgba(201, 168, 76, 0.7)" 
            : sale.price >= 50_000_000 
              ? "rgba(201, 168, 76, 0.46)" 
              : "rgba(201, 168, 76, 0.08)";
        el.style.transform = isSelected ? "scale(1.2)" : isHovered ? "scale(1.15)" : "scale(1)";
        el.style.zIndex = isSelected ? "10" : isHovered ? "5" : "1";
      }
    });
  }, [hoveredSaleId, selectedSale]);

  const focusSale = (sale: Sale) => {
    setSelectedSale(sale);
    mapRef.current?.flyTo({ center: [sale.lng, sale.lat], zoom: 13.5, duration: 1200 });
  };

  return (
    <main className="waterfront-page">
      <header className="waterfront-header">
        <Link href="/" aria-label="Miami New Development home">
          <Image src="/images/logo.png" alt="Miami New Development" width={220} height={58} priority className="site-logo h-auto w-[92px]" />
        </Link>
        <nav className="waterfront-nav" aria-label="Primary">
          <Link href="/map">Explore Map</Link>
          <Link href="/neighborhood">Neighborhoods</Link>
          <Link className="waterfront-nav-active" href="/waterfront">
            Waterfront Estates
          </Link>
          <Link href="/insights">Insights</Link>
          <button type="button" className="waterfront-nav-trigger" onClick={() => openInquiry("Waterfront Estates")}>
            Inquire
          </button>
        </nav>
      </header>

      <section className="waterfront-intro">
        <div className="waterfront-intro-inner">
          <p className="waterfront-kicker">Miami-Dade County · Single Family · $25M+ Ultra-Prime</p>
          <h1>Waterfront estates in Miami&apos;s most exclusive enclaves.</h1>
          <p>
            Closed single-family waterfront sales of $25M and above across Miami-Dade. This is
            the ultra-prime tier of Miami-Dade&apos;s luxury market.
          </p>
        </div>
      </section>

      <section className="waterfront-market" aria-label="Waterfront market activity">
        <div className="waterfront-map-shell">
          <div className="waterfront-map" ref={mapContainerRef} />
          <div className="waterfront-map-legend">
            <span className="waterfront-legend-title">Circle size = sale price</span>
            <div className="waterfront-legend-item">
              <span className="waterfront-legend-dot waterfront-legend-dot-solid" />
              <span>$50M and above</span>
            </div>
            <div className="waterfront-legend-item">
              <span className="waterfront-legend-dot waterfront-legend-dot-outline" />
              <span>Below $50M</span>
            </div>
            <div className="waterfront-legend-bridge">
              <span className="waterfront-legend-title">Vessel clearance</span>
              <div className="waterfront-bridge-pills">
                <span className="waterfront-bridge-pill is-open">No fixed bridges</span>
                <span className="waterfront-bridge-pill">Bridge limited</span>
              </div>
            </div>
          </div>
        </div>

        <aside className="waterfront-ledger">
          <div className="waterfront-sales-list">
            {groupedSales.map((group) => (
              <section key={group.tier}>
                <div className="waterfront-ledger-group">
                  <span className="waterfront-ledger-group-dot" />
                  <span>{group.label}</span>
                </div>
                {group.items.map((sale) => (
                  <button
                    key={sale.id}
                    type="button"
                    className={sale.id === selectedSale?.id ? "waterfront-sale is-selected" : "waterfront-sale"}
                    onClick={() => focusSale(sale)}
                    onMouseEnter={() => setHoveredSaleId(sale.id)}
                    onMouseLeave={() => setHoveredSaleId((current) => (current === sale.id ? null : current))}
                  >
                    <div className="waterfront-sale-main">
                      <span className="waterfront-sale-address">{sale.address}</span>
                      <span className="waterfront-sale-enclave">{sale.enclave}</span>
                      {sale.lotNote && <span className="waterfront-sale-detail">{sale.lotNote}</span>}
                      {sale.waterfrontFt && (
                        <span className="waterfront-sale-detail">{sale.waterfrontFt} ft waterfront</span>
                      )}
                      {sale.bridgeAccess && (
                        <span
                          className={
                            sale.bridgeAccess === "no-fixed-bridges"
                              ? "waterfront-sale-bridge is-open"
                              : "waterfront-sale-bridge"
                          }
                        >
                          {bridgeCopy[sale.bridgeAccess]}
                        </span>
                      )}
                      <span className="waterfront-sale-meta">Closed {formatCloseDate(sale.closeDate)}</span>
                      {sale.note && <span className="waterfront-sale-note">{sale.note}</span>}
                    </div>
                    <span className="waterfront-sale-price">{sale.displayPrice}</span>
                  </button>
                ))}
              </section>
            ))}
          </div>
          <div className="waterfront-ledger-help">
            <div className="waterfront-bridge-pills">
              <span className="waterfront-bridge-pill is-open">No fixed bridges</span>
              <span className="waterfront-bridge-pill">Bridge limited</span>
            </div>
            <p>Hover a transaction to locate it. Click to zoom in. Select a pin to open the record.</p>
          </div>
        </aside>
      </section>

      <section className="waterfront-enclaves">
        <div className="waterfront-section-heading">
          <h2>The enclaves</h2>
          <p>
            Gated islands, guarded mainland estates, and open waterfront. What separates them is
            privacy and whether the largest yachts can reach open water.
          </p>
        </div>

        <div className="waterfront-enclave-grid">
          {enclaves.map((enclave) => (
            <article key={enclave.slug} className="waterfront-enclave-card">
              <div className="waterfront-enclave-meta">
                <span>{enclave.security}</span>
                <span>{enclave.priceFrom}</span>
              </div>
              <h3>{enclave.name}</h3>
              <p className="waterfront-enclave-tagline">{enclave.tagline}</p>
              <span
                className={
                  enclave.bridgeAccess === "no-fixed-bridges"
                    ? "waterfront-sale-bridge is-open"
                    : "waterfront-sale-bridge"
                }
              >
                {bridgeCopy[enclave.bridgeAccess]}
              </span>
              <p className="waterfront-enclave-note">{enclave.dockageNote}</p>
            </article>
          ))}
        </div>

        <p className="waterfront-enclave-footnote">
          Fixed bridges set a permanent height limit between a dock and open water. Homes with no
          fixed bridges can berth the largest yachts and reach the ocean without clearance
          restrictions.
        </p>
      </section>

      <section className="waterfront-inquiry" id="waterfront-inquiry">
        <div className="waterfront-inquiry-inner">
          <div className="waterfront-inquiry-copy">
            <span className="waterfront-inquiry-kicker">Private advisory</span>
            <h2>Tell me what you&apos;re looking for.</h2>
            <p>
              On-market, off-market, teardown, or turnkey. If you&apos;re targeting Miami-Dade
              waterfront above $25M, this is where the real search starts.
            </p>
          </div>
          <div className="waterfront-inquiry-actions">
            <button
              type="button"
              className="waterfront-inquiry-button"
              onClick={() => openInquiry("Waterfront Estates")}
            >
              Start the conversation
            </button>
            <a href="tel:7864758134" className="waterfront-inquiry-link">
              786.475.8134
            </a>
          </div>
        </div>
      </section>

      <AdvisorSection />
      <SiteFooter />
    </main>
  );
}
