// Multi-select dropdown with search, used by the top filter bar.
import { useState, useRef, useEffect } from "react";
import "./MultiSelectDropdown.css";

export default function MultiSelectDropdown({ label, items, selected, onChange }) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const ref                   = useRef();
  const inputRef              = useRef();
  // Items matching the current search query.
  const filtered = items.filter((i) =>
    i.label.toLowerCase().includes(query.toLowerCase())
  );
  const allChecked = filtered.length > 0 && filtered.every((i) => selected.has(i.id));

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  };

  const toggleAll = () => {
    const next = new Set(selected);
    allChecked
      ? filtered.forEach((i) => next.delete(i.id))
      : filtered.forEach((i) => next.add(i.id));
    onChange(next);
  };

  const setAll = (on) => {
    const next = new Set(selected);
    items
      .filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
      .forEach((i) => (on ? next.add(i.id) : next.delete(i.id)));
    onChange(next);
  };

  // Close when clicking outside.
  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset query and focus the search input whenever the panel opens.
  useEffect(() => {
    if (open) { setQuery(""); inputRef.current?.focus(); }
  }, [open]);

  const allSelected = selected.size === items.length;

  return (
    <div className="msd-wrap" ref={ref}>
      {/* Trigger button */}
      <button
        className={`msd-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="msd-label">{label}</span>
        <span className={`msd-badge ${allSelected ? "" : "dim"}`}>
          {selected.size}
        </span>
        <span className="msd-chevron">▾</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="msd-dropdown">
          {/* Search row */}
          <div className="msd-search-row">
            <span className="msd-search-icon">⌕</span>
            <input
              ref={inputRef}
              className="msd-search"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="msd-clear-search" onClick={() => setQuery("")}>✕</button>
            )}
          </div>

          {/* Item list */}
          <ul className="msd-list">
            <li
              className={`msd-item msd-item--all ${allChecked ? "checked" : ""}`}
              onClick={toggleAll}
            >
              <span className="msd-checkbox">{allChecked && <span className="msd-tick">✓</span>}</span>
              <span className="msd-item-label">Select all</span>
            </li>
            {filtered.length === 0 && (
              <li className="msd-empty">No results</li>
            )}
            {filtered.map((item) => {
              const on = selected.has(item.id);
              return (
                <li
                  key={item.id}
                  className={`msd-item ${on ? "checked" : ""}`}
                  onClick={() => toggle(item.id)}
                >
                  <span className="msd-checkbox">{on && <span className="msd-tick">✓</span>}</span>
                  {item.color && (
                    <span
                      className="msd-swatch"
                      style={{ background: item.color, boxShadow: `0 0 6px ${item.color}55` }}
                    />
                  )}
                  <span className="msd-item-label">{item.label}</span>
                  {item.sub && <span className="msd-sub">{item.sub}</span>}
                </li>
              );
            })}
          </ul>

          {/* Footer: count and bulk actions */}
          <div className="msd-footer">
            <span className="msd-count">
              <strong>{selected.size}</strong> / {items.length}
            </span>
            <div className="msd-footer-btns">
              <button onClick={() => setAll(true)}>All</button>
              <button onClick={() => setAll(false)}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
