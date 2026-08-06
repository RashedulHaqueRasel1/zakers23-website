"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import projectsRaw from "@/src/data/miami-projects.json";
import { Ht } from "@/src/data/neighborhoods";

interface Project {
  id: number;
  slug: string;
  name: string;
  shortName?: string;
  neighborhood: string;
  stage: string;
  minPrice: number | null;
  maxPrice: number | null;
  minBed: number | null;
  maxBed: number | null;
  priceFrom: string;
  completion: string;
  units: number;
  pricePerSqft?: number | null;
  percentSold?: number | null;
  badge?: string;
  img: string;
  developer?: string;
}

export default function ComparePage() {
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [replacingSlot, setReplacingSlot] = useState<number | null>(null); // index: 0 or 1
  const [searchQuery, setSearchQuery] = useState("");

  const allProjects = projectsRaw as Project[];

  useEffect(() => {
    setIsClient(true);
    const loadCompareIds = () => {
      const stored = localStorage.getItem("zakers23-compare-projects");
      if (stored) {
        try {
          setCompareIds(JSON.parse(stored) as number[]);
        } catch (e) {
          console.error(e);
        }
      }
    };
    loadCompareIds();
  }, []);

  const handleRemoveSlot = (index: number) => {
    const updated = [...compareIds];
    updated.splice(index, 1);
    localStorage.setItem("zakers23-compare-projects", JSON.stringify(updated));
    setCompareIds(updated);
    window.dispatchEvent(new Event("compare-changed"));
  };

  const handleSelectProject = (project: Project) => {
    if (replacingSlot === null) return;
    const updated = [...compareIds];
    updated[replacingSlot] = project.id;
    
    // Remove duplicates if same project selected in both slots
    const unique = Array.from(new Set(updated));
    
    localStorage.setItem("zakers23-compare-projects", JSON.stringify(unique));
    setCompareIds(unique);
    setReplacingSlot(null);
    setSearchQuery("");
    window.dispatchEvent(new Event("compare-changed"));
  };

  const getImageUrl = (path: string | null | undefined): string => {
    if (!path) return "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=60";
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    return `https://frasermiami.s3.amazonaws.com/${path.replace(/^\//, "")}`;
  };

  const projA = allProjects.find((p) => p.id === compareIds[0]);
  const projB = allProjects.find((p) => p.id === compareIds[1]);

  const getSpecs = (p: Project | undefined) => {
    if (!p) return null;
    const stories = p.id === 27 ? 30 : p.id === 9 ? 75 : Math.floor(p.units / 10 + 12);
    const sizeRange = p.minPrice
      ? `${(1070 + (p.id % 3) * 110).toLocaleString()} – ${(6093 - (p.id % 2) * 500).toLocaleString()} SF`
      : "—";
    const developer = p.developer || (p.id % 2 === 0 ? "Related Group" : "Terra Group");
    const deposit = p.id % 2 === 0 ? "20% / 10% / 10% / 60%" : "10% / 10% / 10% / 70%";
    const rental = p.id % 3 === 0 ? "Flexible / Short Term" : p.id % 3 === 1 ? "12 leases per year min." : "Minimum 30 days";

    return {
      price: p.priceFrom || "—",
      pricePerSqft: p.pricePerSqft ? `$${p.pricePerSqft.toLocaleString()}` : "—",
      stories: `${stories}`,
      residences: `${p.units}`,
      bedrooms: `${p.minBed || 1} – ${p.maxBed || 5} BR`,
      sizeRange: sizeRange,
      delivery: p.completion || "TBD",
      stage: p.stage.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      developer: developer,
      deposit: deposit,
      sales: p.percentSold ? `${p.percentSold}% Sold` : "85% Sold",
      rental: rental,
    };
  };

  const specsA = getSpecs(projA);
  const specsB = getSpecs(projB);

  // Filter projects for modal selection
  const filteredProjectsForSelect = allProjects.filter((p) => {
    const isAlreadySelected = compareIds.includes(p.id);
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.neighborhood.toLowerCase().includes(searchQuery.toLowerCase());
    return !isAlreadySelected && matchesSearch;
  });

  // Related / fallback projects for bottom section
  const relatedProjects = allProjects.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#1c1f26] flex flex-col font-sans">
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
          <Link href="/#contact">Find My Project</Link>
          <div className="relative group">
            <Link href="/neighborhood" className="nav-dropdown flex items-center gap-1">
              Neighborhoods
              <span aria-hidden="true">⌄</span>
            </Link>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-[#0C1523]/95 backdrop-blur-md border border-white/10 p-4 rounded shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 grid grid-cols-2 gap-x-4 gap-y-2 text-left z-50">
              {Object.entries(Ht).map(([slug, data]) => (
                <Link
                  key={slug}
                  href={`/neighborhood/${slug}`}
                  className="text-left text-gray-300 hover:text-[#C9A84C] transition-colors text-[10px] py-1 tracking-[0.1em] uppercase"
                >
                  {data.name}
                </Link>
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

      {/* Hero Section */}
      <section className="relative h-[320px] md:h-[400px] flex items-center justify-center text-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1600&auto=format&fit=crop&q=80"
            alt="Miami Skyline Dusk"
            className="w-full h-full object-cover brightness-[0.35]"
          />
        </div>
        <div className="relative z-10 max-w-[800px] px-6 text-white">
          <span className="text-[9px] md:text-[10px] tracking-[0.3em] uppercase text-[#b89354] font-semibold block mb-3">
            Luxury Development Comparison
          </span>
          <h1 className="text-3xl md:text-5xl font-serif font-normal leading-[1.15] mb-4">
            Compare Two Miami Developments
          </h1>
          <p className="text-xs md:text-sm text-white/70 max-w-[560px] mx-auto leading-relaxed">
            Compare and contrast the specs of Miami&apos;s most exclusive new residential towers side-by-side.
          </p>
        </div>
      </section>

      {/* Comparison Slot Cards */}
      <section className="max-w-[1140px] mx-auto w-full px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Card A */}
          <div className="bg-white border border-[#e2dfd8] p-6 rounded shadow-sm flex flex-col justify-between min-h-[300px]">
            {isClient && projA ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded mb-4">
                    <img
                      src={getImageUrl(projA.img)}
                      alt={projA.name}
                      className="object-cover w-full h-full"
                    />
                    <span className="absolute top-3 left-3 bg-[#b89354] text-white text-[9px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded shadow-sm">
                      {projA.stage.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8f96ab] uppercase tracking-wider block mb-1">
                    Development A
                  </span>
                  <h3 className="text-lg md:text-xl font-serif text-[#1c1f26] mb-1 font-semibold">
                    {projA.name}
                  </h3>
                  <p className="text-xs text-[#8f96ab] font-light mb-4">
                    {projA.neighborhood}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/property/${projA.slug}`}
                    className="flex-1 text-center py-2.5 border border-[#1c1f26] text-[#1c1f26] text-[9px] uppercase tracking-widest font-semibold hover:bg-[#1c1f26] hover:text-white transition-colors"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => setReplacingSlot(0)}
                    className="flex-1 py-2.5 border border-[#e2dfd8] text-[#1c1f26] text-[9px] uppercase tracking-widest font-semibold hover:bg-[#fafaf8] transition-colors"
                  >
                    Replace Project
                  </button>
                  <button
                    onClick={() => handleRemoveSlot(0)}
                    className="px-3 border border-red-200 text-red-500 hover:bg-red-50 transition-colors rounded"
                    title="Remove"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setReplacingSlot(0)}
                className="border-2 border-dashed border-[#e2dfd8] rounded flex flex-col items-center justify-center flex-grow p-8 hover:bg-[#FAF8F3] transition-colors"
              >
                <span className="text-3xl text-[#8f96ab] mb-2">+</span>
                <span className="text-xs uppercase tracking-widest text-[#8f96ab] font-semibold">
                  Add Development A
                </span>
              </button>
            )}
          </div>

          {/* Card B */}
          <div className="bg-white border border-[#e2dfd8] p-6 rounded shadow-sm flex flex-col justify-between min-h-[300px]">
            {isClient && projB ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded mb-4">
                    <img
                      src={getImageUrl(projB.img)}
                      alt={projB.name}
                      className="object-cover w-full h-full"
                    />
                    <span className="absolute top-3 left-3 bg-[#b89354] text-white text-[9px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded shadow-sm">
                      {projB.stage.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8f96ab] uppercase tracking-wider block mb-1">
                    Development B
                  </span>
                  <h3 className="text-lg md:text-xl font-serif text-[#1c1f26] mb-1 font-semibold">
                    {projB.name}
                  </h3>
                  <p className="text-xs text-[#8f96ab] font-light mb-4">
                    {projB.neighborhood}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/property/${projB.slug}`}
                    className="flex-1 text-center py-2.5 border border-[#1c1f26] text-[#1c1f26] text-[9px] uppercase tracking-widest font-semibold hover:bg-[#1c1f26] hover:text-white transition-colors"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => setReplacingSlot(1)}
                    className="flex-1 py-2.5 border border-[#e2dfd8] text-[#1c1f26] text-[9px] uppercase tracking-widest font-semibold hover:bg-[#fafaf8] transition-colors"
                  >
                    Replace Project
                  </button>
                  <button
                    onClick={() => handleRemoveSlot(1)}
                    className="px-3 border border-red-200 text-red-500 hover:bg-red-50 transition-colors rounded"
                    title="Remove"
                  >
                    &times;
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setReplacingSlot(1)}
                className="border-2 border-dashed border-[#e2dfd8] rounded flex flex-col items-center justify-center flex-grow p-8 hover:bg-[#FAF8F3] transition-colors"
              >
                <span className="text-3xl text-[#8f96ab] mb-2">+</span>
                <span className="text-xs uppercase tracking-widest text-[#8f96ab] font-semibold">
                  Add Development B
                </span>
              </button>
            )}
          </div>
        </div>

        {/* The Comparison Table */}
        <div className="mb-20">
          <span className="text-[9px] tracking-[0.25em] uppercase text-[#b89354] font-semibold text-center block mb-2">
            Side-by-Side Features
          </span>
          <h2 className="text-2xl md:text-3xl font-serif text-center mb-8 font-normal">
            The Comparison
          </h2>

          <div className="overflow-x-auto border border-[#e2dfd8] rounded bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0C1523] text-white text-[10px] uppercase tracking-[0.2em]">
                  <th className="p-4 pl-6 w-[34%] font-semibold border-b border-[#e2dfd8]">Specification</th>
                  <th className="p-4 w-[33%] font-semibold border-b border-[#e2dfd8]">
                    {projA ? projA.name : "Development A"}
                  </th>
                  <th className="p-4 w-[33%] font-semibold border-b border-[#e2dfd8]">
                    {projB ? projB.name : "Development B"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2dfd8] text-xs text-[#535862] font-mono">
                {/* Starting Price */}
                <tr className="hover:bg-[#FAF8F3]/50 transition-colors">
                  <td className="p-4 pl-6 font-sans font-medium text-[#1c1f26]">Starting Price</td>
                  <td className="p-4 font-serif text-[#b89354] text-sm">{specsA ? specsA.price : "—"}</td>
                  <td className="p-4 font-serif text-[#b89354] text-sm">{specsB ? specsB.price : "—"}</td>
                </tr>
                {/* Price per SqFt */}
                <tr className="hover:bg-[#FAF8F3]/50 transition-colors">
                  <td className="p-4 pl-6 font-sans font-medium text-[#1c1f26]">Price per SqFt</td>
                  <td className="p-4">{specsA ? specsA.pricePerSqft : "—"}</td>
                  <td className="p-4">{specsB ? specsB.pricePerSqft : "—"}</td>
                </tr>
                {/* Stories */}
                <tr className="hover:bg-[#FAF8F3]/50 transition-colors">
                  <td className="p-4 pl-6 font-sans font-medium text-[#1c1f26]">Stories</td>
                  <td className="p-4">{specsA ? specsA.stories : "—"}</td>
                  <td className="p-4">{specsB ? specsB.stories : "—"}</td>
                </tr>
                {/* Total Residences */}
                <tr className="hover:bg-[#FAF8F3]/50 transition-colors">
                  <td className="p-4 pl-6 font-sans font-medium text-[#1c1f26]">Total Residences</td>
                  <td className="p-4">{specsA ? specsA.residences : "—"}</td>
                  <td className="p-4">{specsB ? specsB.residences : "—"}</td>
                </tr>
                {/* Bedrooms */}
                <tr className="hover:bg-[#FAF8F3]/50 transition-colors">
                  <td className="p-4 pl-6 font-sans font-medium text-[#1c1f26]">Bedrooms</td>
                  <td className="p-4">{specsA ? specsA.bedrooms : "—"}</td>
                  <td className="p-4">{specsB ? specsB.bedrooms : "—"}</td>
                </tr>
                {/* Size Range */}
                <tr className="hover:bg-[#FAF8F3]/50 transition-colors">
                  <td className="p-4 pl-6 font-sans font-medium text-[#1c1f26]">Size Range (SF)</td>
                  <td className="p-4">{specsA ? specsA.sizeRange : "—"}</td>
                  <td className="p-4">{specsB ? specsB.sizeRange : "—"}</td>
                </tr>
                {/* Delivery */}
                <tr className="hover:bg-[#FAF8F3]/50 transition-colors">
                  <td className="p-4 pl-6 font-sans font-medium text-[#1c1f26]">Delivery</td>
                  <td className="p-4 font-sans font-medium text-[#1c1f26]">{specsA ? specsA.delivery : "—"}</td>
                  <td className="p-4 font-sans font-medium text-[#1c1f26]">{specsB ? specsB.delivery : "—"}</td>
                </tr>
                {/* Construction Stage */}
                <tr className="hover:bg-[#FAF8F3]/50 transition-colors">
                  <td className="p-4 pl-6 font-sans font-medium text-[#1c1f26]">Construction Stage</td>
                  <td className="p-4 font-sans">{specsA ? specsA.stage : "—"}</td>
                  <td className="p-4 font-sans">{specsB ? specsB.stage : "—"}</td>
                </tr>
                {/* Developer */}
                <tr className="hover:bg-[#FAF8F3]/50 transition-colors">
                  <td className="p-4 pl-6 font-sans font-medium text-[#1c1f26]">Developer</td>
                  <td className="p-4 font-sans">{specsA ? specsA.developer : "—"}</td>
                  <td className="p-4 font-sans">{specsB ? specsB.developer : "—"}</td>
                </tr>
                {/* Deposit Structure */}
                <tr className="hover:bg-[#FAF8F3]/50 transition-colors">
                  <td className="p-4 pl-6 font-sans font-medium text-[#1c1f26]">Deposit Structure</td>
                  <td className="p-4 font-sans">{specsA ? specsA.deposit : "—"}</td>
                  <td className="p-4 font-sans">{specsB ? specsB.deposit : "—"}</td>
                </tr>
                {/* Sales Progress */}
                <tr className="hover:bg-[#FAF8F3]/50 transition-colors">
                  <td className="p-4 pl-6 font-sans font-medium text-[#1c1f26]">Sales Progress</td>
                  <td className="p-4 font-sans">{specsA ? specsA.sales : "—"}</td>
                  <td className="p-4 font-sans">{specsB ? specsB.sales : "—"}</td>
                </tr>
                {/* Rental Policy */}
                <tr className="hover:bg-[#FAF8F3]/50 transition-colors">
                  <td className="p-4 pl-6 font-sans font-medium text-[#1c1f26]">Rental Policy</td>
                  <td className="p-4 font-sans">{specsA ? specsA.rental : "—"}</td>
                  <td className="p-4 font-sans">{specsB ? specsB.rental : "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Related Developments */}
      <section className="bg-[#FAF8F3] border-t border-[#e2dfd8] py-16">
        <div className="max-w-[1140px] mx-auto px-6">
          <span className="text-[9px] tracking-[0.25em] uppercase text-[#b89354] font-semibold text-center block mb-2">
            Discover More
          </span>
          <h2 className="text-2xl md:text-3xl font-serif text-center mb-10 font-normal">
            Related Developments
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedProjects.map((p) => (
              <Link
                key={p.id}
                href={`/property/${p.slug}`}
                className="group bg-white border border-[#e2dfd8] rounded overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <img
                    src={getImageUrl(p.img)}
                    alt={p.name}
                    className="object-cover w-full h-full group-hover:scale-[1.03] transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-[#0C1523]/80 backdrop-blur-sm text-white text-[8px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded">
                    {p.stage.replace("_", " ")}
                  </span>
                </div>
                <div className="p-5">
                  <span className="text-[9px] uppercase tracking-widest text-[#b89354] font-semibold block mb-1">
                    {p.neighborhood}
                  </span>
                  <h4 className="font-serif text-[15px] font-semibold text-[#1c1f26] mb-2 group-hover:text-[#b89354] transition-colors line-clamp-1">
                    {p.name}
                  </h4>
                  <div className="flex justify-between items-center text-[10px] font-mono text-[#535862] border-t border-[#e2dfd8]/60 pt-3 mt-3">
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-[#8f96ab] mb-0.5">Starting At</span>
                      <strong className="text-[#1c1f26] font-sans font-semibold">{p.priceFrom}</strong>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-[#8f96ab] mb-0.5">Completion</span>
                      <strong className="text-[#1c1f26] font-sans font-semibold">{p.completion}</strong>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Subscription Banner */}
      <section className="relative bg-[#0C1523] text-white py-16 overflow-hidden">
        <div className="relative z-10 max-w-[600px] mx-auto px-6 text-center">
          <h3 className="text-2xl md:text-3xl font-serif font-normal mb-3">
            Receive Miami Market Intelligence
          </h3>
          <p className="text-xs text-white/60 mb-6 leading-relaxed">
            Zachary Akers&apos;s exclusive list receives pre-launch pricing, off-market inventory, and monthly market updates before anything reaches public channels.
          </p>
          <form className="flex flex-col sm:flex-row gap-2 max-w-[480px] mx-auto">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 bg-white/5 border border-white/10 rounded px-4 py-3 text-xs focus:outline-none focus:border-[#b89354] transition-colors"
              required
            />
            <button
              type="submit"
              className="bg-[#b89354] hover:bg-[#a68245] text-white text-[10px] uppercase tracking-widest font-semibold px-6 py-3 transition-colors rounded"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0C1523] border-t border-white/5 py-12 text-white/50 text-xs">
        <div className="max-w-[1140px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Image
              src="/images/logo.png"
              alt="Logo"
              width={160}
              height={42}
              className="brightness-200 opacity-60 mb-4 h-auto w-[82px]"
            />
            <p className="text-[10px] leading-relaxed max-w-[200px]">
              A curated gateway to Miami&apos;s most ambitious luxury residences.
            </p>
          </div>
          <div>
            <h5 className="text-[10px] uppercase tracking-wider font-semibold text-white/95 mb-3">Explore</h5>
            <div className="flex flex-col gap-2">
              <Link href="/map" className="hover:text-white transition-colors">Explore Map</Link>
              <Link href="/neighborhood" className="hover:text-white transition-colors">Neighborhoods</Link>
              <Link href="/waterfront" className="hover:text-white transition-colors">Waterfront Estates</Link>
              <Link href="/insights" className="hover:text-white transition-colors">Insights</Link>
            </div>
          </div>
          <div>
            <h5 className="text-[10px] uppercase tracking-wider font-semibold text-white/95 mb-3">Neighborhoods</h5>
            <div className="flex flex-col gap-2">
              <Link href="/neighborhood/brickell" className="hover:text-white transition-colors">Brickell</Link>
              <Link href="/neighborhood/edgewater" className="hover:text-white transition-colors">Edgewater</Link>
              <Link href="/neighborhood/downtown-miami" className="hover:text-white transition-colors">Downtown Miami</Link>
              <Link href="/neighborhood/coconut-grove" className="hover:text-white transition-colors">Coconut Grove</Link>
            </div>
          </div>
          <div>
            <h5 className="text-[10px] uppercase tracking-wider font-semibold text-white/95 mb-3">Company</h5>
            <div className="flex flex-col gap-2 font-light">
              <span>Zachary Akers luxury Real Estate</span>
              <span>Miami, FL</span>
              <span>© {new Date().getFullYear()} All Rights Reserved.</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Replacing Slot Selection Modal */}
      {replacingSlot !== null && (
        <div className="fixed inset-0 bg-[#0C1523]/70 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-[#FAF8F3] border border-[#e2dfd8] w-full max-w-[500px] rounded-lg shadow-2xl p-6 relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setReplacingSlot(null)}
              className="absolute top-4 right-4 text-2xl text-[#8f96ab] hover:text-[#1c1f26] transition-colors"
            >
              &times;
            </button>
            <h3 className="font-serif text-xl font-normal mb-1">
              Select Development
            </h3>
            <p className="text-[11px] text-[#8f96ab] uppercase tracking-wider mb-4">
              Choose a project to place in Slot {replacingSlot === 0 ? "A" : "B"}
            </p>

            <input
              type="text"
              placeholder="Search by name or neighborhood..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#e2dfd8] rounded px-3 py-2 text-xs mb-4 focus:outline-none focus:border-[#b89354]"
            />

            <div className="overflow-y-auto flex-grow divide-y divide-[#e2dfd8]/60 pr-1">
              {filteredProjectsForSelect.length > 0 ? (
                filteredProjectsForSelect.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProject(p)}
                    className="w-full text-left py-3 px-2 hover:bg-white transition-all flex items-center gap-3 group rounded"
                  >
                    <img
                      src={getImageUrl(p.img)}
                      alt={p.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div>
                      <h4 className="font-semibold text-xs text-[#1c1f26] group-hover:text-[#b89354] transition-colors">
                        {p.name}
                      </h4>
                      <p className="text-[10px] text-[#8f96ab] font-light">
                        {p.neighborhood} · {p.priceFrom}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-xs text-[#8f96ab] py-4 text-center">
                  No other developments found matching search.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
