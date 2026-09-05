"use client";

import { useEffect, useId, useRef, useState } from "react";

type Props = { name: string; label: string; options: string[] };

export default function ConsultationSelect({ name, label, options }: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [above, setAbove] = useState(false);
  const [height, setHeight] = useState(230);
  const searchRef = useRef({ text: "", time: 0 });

  const expand = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    const modal = rootRef.current?.closest(".consultation-modal")?.getBoundingClientRect();
    if (rect && modal) {
      const below = Math.min(modal.bottom, window.innerHeight) - rect.bottom - 14;
      const top = rect.top - Math.max(modal.top, 0) - 14;
      const flip = below < 200 && top > below;
      setAbove(flip);
      setHeight(Math.max(80, Math.min(230, flip ? top : below)));
    }
    setActive(Math.max(0, options.indexOf(value)));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  const choose = (option: string) => {
    setValue(option);
    setInvalid(false);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={rootRef} className={`consultation-select ${open ? "is-open" : ""}`}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <select className="consultation-native-select" name={name} value={value} required tabIndex={-1} aria-hidden="true"
        onChange={(event) => choose(event.target.value)}
        onInvalid={(event) => { event.preventDefault(); setInvalid(true); triggerRef.current?.focus(); }}>
        <option value="" disabled>{label}</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      <button ref={triggerRef} type="button" className={`consultation-select-trigger ${value ? "has-value" : ""}`}
        role="combobox" aria-label={label} aria-expanded={open} aria-controls={`${id}-list`}
        aria-haspopup="listbox" aria-required="true" aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        onClick={() => open ? setOpen(false) : expand()}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
          if (event.key === "Tab") { setOpen(false); return; }
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            if (!open) expand();
            else setActive((index) => event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : Math.max(0, Math.min(options.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault(); if (open) choose(options[active]); else expand();
          } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const now = Date.now();
            const query = (now - searchRef.current.time < 600 ? searchRef.current.text : "") + event.key.toLowerCase();
            searchRef.current = { text: query, time: now };
            const index = options.findIndex((option) => option.toLowerCase().startsWith(query));
            if (!open) expand();
            if (index >= 0) setActive(index);
          }
        }}>
        <span>{value || label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.2" /></svg>
      </button>
      {invalid && <span className="consultation-select-error" id={`${id}-error`}>Please select an option.</span>}
      {open && <div className={`consultation-select-menu ${above ? "opens-above" : ""}`} style={{ maxHeight: height }}
        id={`${id}-list`} role="listbox" aria-label={label}>
        {options.map((option, index) => (
          <div key={option} id={`${id}-${index}`} role="option" aria-selected={value === option}
            className={`consultation-select-option ${active === index ? "is-active" : ""}`}
            onPointerMove={() => setActive(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)}>
            <span>{option}</span>
            {value === option && <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8 3 3 7-7" stroke="currentColor" strokeWidth="1.5" /></svg>}
          </div>
        ))}
      </div>}
    </div>
  );
}
