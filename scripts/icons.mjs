export const GROUPS = [
  { id: "math", title: "الرياضيات", cats: ["elementary-math", "algebra", "geometry", "calculus", "differential-equations", "statistics"] },
  { id: "eng", title: "الهندسة والتقنية", cats: ["dc-circuits", "ac-circuits", "electronics", "digital", "sensors", "signals", "control", "materials", "computing", "architecture", "units"] },
  { id: "sci", title: "العلوم", cats: ["physics", "chemistry", "biology", "earth-environment"] },
  { id: "life", title: "الصحة والمال والحياة", cats: ["medicine", "agriculture-nutrition", "economics", "personal-finance", "everyday-math", "dates-calendar", "student"] }
];

const P = {
  calculus: '<path d="M15.5 3.6c-1.9-.7-3.2.2-3.6 2.3L9.7 18.1c-.4 2.1-1.7 3-3.6 2.3"/><path d="M15 12.5h5.5M17.75 9.75v5.5"/>',
  "differential-equations": '<path d="M2.5 16.5c3 0 3-9.5 6-9.5s3 9.5 6 9.5 3-5.5 7-5.5"/><circle cx="8.5" cy="7" r="1.3"/><path d="M2.5 21h19"/>',
  "elementary-math": '<path d="M7 3.5v7M3.5 7h7M13.5 7h7M14.5 14.5l5 5M19.5 14.5l-5 5M3.5 17h7"/><path d="M7 13.6v.01M7 20.4v.01" stroke-width="2.6"/>',
  geometry: '<path d="M3.5 20.5h11.5L3.5 6.5z"/><circle cx="16.5" cy="8.5" r="4.5"/>',
  algebra: '<path d="M3.5 8.5l7 10.5M10.5 8.5l-7 10.5"/><path d="M14 6.6c0-1.4 1-2.1 2.1-2.1s2.1.7 2.1 1.9c0 1.7-4.2 3.4-4.2 4.8h4.4"/>',
  statistics: '<path d="M4.5 20V11M9.5 20V5.5M14.5 20v-7M19.5 20V8.5"/><path d="M2.5 20.5h19"/>',
  signals: '<path d="M2 12c2.5-7 5-7 7.5 0s5 7 7.5 0 3.5-5 5-5"/><path d="M2 21h20M2 3v18"/>',
  "dc-circuits": '<path d="M2.5 9h3.5l1.5-3 3 6 3-6 3 6 1.5-3h3.5"/><path d="M2.5 9v10h7M14.5 19h7V9M9.5 16.5v5M12 17.8v2.4M14.5 16.5v5" />',
  "ac-circuits": '<circle cx="12" cy="12" r="9"/><path d="M6.5 12c1.4-4 4.1-4 5.5 0s4.1 4 5.5 0"/>',
  electronics: '<rect x="7" y="7" width="10" height="10" rx="1.6"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
  digital: '<path d="M5.5 5.5h6a6.5 6.5 0 0 1 0 13h-6z"/><path d="M2 9h3.5M2 15h3.5M18 12h4"/>',
  sensors: '<path d="M9.5 14.6V5a2.5 2.5 0 0 1 5 0v9.6a4.5 4.5 0 1 1-5 0z"/><path d="M12 9v8"/><path d="M18.5 6a6 6 0 0 1 0 8M21 3.5a9.5 9.5 0 0 1 0 13"/>',
  control: '<path d="M3.5 18a8.5 8.5 0 1 1 17 0"/><path d="M12 18l4.5-5.5"/><circle cx="12" cy="18" r="1.4"/><path d="M6.5 13.5l1 .6M12 8v1.2M17.5 13.5l-1 .6"/>',
  units: '<rect x="2.5" y="8" width="19" height="8" rx="1.6"/><path d="M6 8v3M9.5 8v4.5M13 8v3M16.5 8v4.5M20 8v3"/>',
  materials: '<path d="M4.5 3.5h15v3.5h-5.5v10h5.5v3.5h-15V17H10V7H4.5z"/>',
  physics: '<circle cx="12" cy="12" r="1.7"/><ellipse cx="12" cy="12" rx="9.5" ry="3.7"/><ellipse cx="12" cy="12" rx="9.5" ry="3.7" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.7" transform="rotate(120 12 12)"/>',
  chemistry: '<path d="M9 3h6M10.2 3v6.2L4.8 18.8A1.5 1.5 0 0 0 6.1 21h11.8a1.5 1.5 0 0 0 1.3-2.2L13.8 9.2V3"/><path d="M7.3 15h9.4"/>',
  biology: '<path d="M7 2.5c0 5 10 4.5 10 9.5s-10 4.5-10 9.5M17 2.5c0 5-10 4.5-10 9.5s10 4.5 10 9.5"/><path d="M8.6 5.5h6.8M8.6 18.5h6.8M10.2 12h3.6"/>',
  "earth-environment": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
  medicine: '<path d="M12 20.5s-8-4.6-8-10.4A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 8 2.5c0 5.8-8 10.4-8 10.4z"/><path d="M7 12.5h2.6l1.5-2.6 2 5 1.5-2.4H17"/>',
  "agriculture-nutrition": '<path d="M12 21.5V12"/><path d="M12 12c0-4.2 3-7.2 8.5-7.2 0 4.7-3.2 7.2-8.5 7.2zM12 14.5c0-3.6-2.6-6.2-7.5-6.2 0 4.1 2.6 6.2 7.5 6.2z"/>',
  economics: '<path d="M3 20.5h18"/><path d="M4 16.5l5-5 4 3 7-7"/><path d="M15 7.5h5v5"/>',
  "personal-finance": '<rect x="2.5" y="6" width="19" height="13.5" rx="2.6"/><path d="M2.5 10.5h19M6 3.5h11"/><circle cx="16.8" cy="15" r="1.4"/>',
  computing: '<rect x="2.5" y="4" width="19" height="12.5" rx="1.6"/><path d="M8.5 20.5h7M12 16.5v4M9.8 8.2 7.6 10.3l2.2 2.1M14.2 8.2l2.2 2.1-2.2 2.1"/>',
  architecture: '<path d="M3.5 21V8.5l8.5-5.5 8.5 5.5V21"/><path d="M9 21v-6.5h6V21M8 10.5h2M14 10.5h2M2 21h20"/>',
  "dates-calendar": '<rect x="3" y="5" width="18" height="16" rx="2.2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M14.2 12.8a3.3 3.3 0 1 0 2.1 5.3 2.6 2.6 0 1 1-2.1-5.3z"/>',
  "everyday-math": '<rect x="5" y="2.8" width="14" height="18.4" rx="2.2"/><path d="M8 6.5h8"/><path d="M8.6 11.5v.01M12 11.5v.01M15.4 11.5v.01M8.6 15v.01M12 15v.01M15.4 15v.01M8.6 18.4v.01M12 18.4v.01M15.4 18.4v.01" stroke-width="2.6"/>',
  student: '<path d="M1.8 9 12 4l10.2 5L12 14z"/><path d="M5.8 11v5.2c0 1.6 3 3.3 6.2 3.3s6.2-1.7 6.2-3.3V11M22.2 9v6"/>'
};

export function catIcon(slug, cls = "ic") {
  const body = P[slug] || P.units;
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

export function groupOf(slug) {
  return (GROUPS.find((g) => g.cats.includes(slug)) || GROUPS[1]).id;
}

export const ICON_SLUGS = Object.keys(P);
