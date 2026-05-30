// =============================================================
// VERSO — procedural library generator
// Generates a deterministic ~800-item sci-fi/space-opera/cyberpunk
// library. All names invented; no copyrighted works.
// =============================================================
(function () {
  "use strict";

  // ---------- Seeded RNG (mulberry32) ----------
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = rng(42);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const pickWeighted = (arr) => {
    // arr: [[item, weight], ...]
    const total = arr.reduce((s, [, w]) => s + w, 0);
    let r = rand() * total;
    for (const [item, w] of arr) { r -= w; if (r <= 0) return item; }
    return arr[0][0];
  };
  const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

  // ---------- Word pools ----------
  const TITLE_NOUNS = [
    "Singularity", "Nexus", "Cipher", "Convergence", "Protocol", "Threshold",
    "Lattice", "Beacon", "Cascade", "Manifold", "Vector", "Diaspora", "Lacuna",
    "Empire", "Republic", "Citadel", "Outpost", "Marrow", "Echo", "Aperture",
    "Catacomb", "Spire", "Vessel", "Tessellation", "Halo", "Engine", "Eclipse",
    "Reliquary", "Garden", "Foundry", "Conduit", "Saint", "Daughter", "Architect",
    "Surgeon", "Cartographer", "Diplomat", "Operator", "Heretic", "Witness",
    "Cathedral", "Ascendancy", "Quietus", "Constellation", "Continuum", "Cipher",
    "Watershed", "Aria", "Anthem", "Sediment", "Maelstrom", "Salience", "Bloom",
    "Mantle", "Strata", "Gradient", "Lullaby", "Hymn", "Liturgy", "Quorum"
  ];
  const TITLE_ADJECTIVES = [
    "Quiet", "Iron", "Forgotten", "Drowned", "Ascendant", "Hollow", "Distant",
    "Brittle", "Sovereign", "Pale", "Restless", "Patient", "Glass", "Silver",
    "Salt", "Black", "Slow", "Long", "Bright", "Cold", "Last", "Lonely",
    "Shattered", "Inverse", "Recursive", "Liminal", "Velvet", "Ferrous",
    "Adamant", "Profane", "Mercurial", "Stoic", "Vagrant", "Crooked",
    "Murmuring", "Improbable", "Ordinary", "Unreliable", "Practical",
    "Dissident", "Apocryphal", "Pyrrhic"
  ];
  const TITLE_OF_NOUNS = [
    "Ash", "Salt", "Iron", "Glass", "Water", "Light", "Bone", "Smoke",
    "Stars", "Rain", "Silence", "Dust", "Memory", "Hours", "Mirrors", "Mercy",
    "Names", "Wire", "Vessels", "Birds", "Borders", "Permanence", "Halos",
    "Quiet Things", "Small Gods", "Soft Machines", "Dark Pages", "Hard Vacuum",
    "Late Capital", "Hot Algorithms", "Closed Systems", "Patient Wars",
    "Slow Light", "Cold Equations", "Strange Attractors"
  ];
  const TITLE_PHRASES = [
    "We Were Always Listening", "The Algorithm Remembers", "Nothing Will Be Wasted",
    "All the Lost Generations", "Twelve Hours of Vacuum", "A Brief History of Forgetting",
    "And the Sky Was Made of Tin", "Of Course It Was a Drone", "She Asked the Network",
    "The Engineer's Apology", "Burn Rate", "Cold Boot", "Yield Strength",
    "Latency", "Throughput", "Half-Life of a Promise", "Six Months on Vesta",
    "How to Lose a Habitat", "Notes from the Ring", "What the Probes Found",
    "Telemetry from the Inner Belt", "The Cartographer's Confession",
    "Last Light Over Tycho", "The Surgeon's Garden", "A Theory of Friendship",
    "We Buried the Compiler", "Late Trains to Ganymede", "Architecture of Refusal",
    "After the Treaty", "Inheritance Protocol", "The Slow Math of Decay",
    "The Patient Engine", "The Long Walk to Persephone", "Sediment & Signal",
    "Pyrrhic Light", "Quorum Sensing", "Liturgy for a Dead Sun",
    "Ghost in the Compiler", "Wetware Sonata", "Ten Arguments Against Empire",
    "What the Habitat Lost", "Quiet After the Burn", "The Diplomat's Hand"
  ];
  const SUBTITLES = [
    "Book One of the Marrow Cycle", "A Verge Sequence Novel", "Volume III",
    "An Imperium Story", "A Cassiopeia Protocol Mystery",
    "Tales of the Outer Drift, Book Two", "A Mainline Capital Novel",
    "The Compiler Wars · Book IV", "Persephone Sequence · 02", null, null, null, null
  ];

  // ---------- Author pool (invented) ----------
  const FIRST_NAMES = [
    "Ada", "Naomi", "Kira", "Yara", "Sasha", "Imogen", "Mei", "Iris", "Tamsin",
    "Vera", "Joon", "Riku", "Soren", "Ezra", "Mateo", "Caleb", "Theo", "Aman",
    "Idris", "Tomás", "Marek", "Lior", "Anouk", "Nadia", "Wren", "Halle",
    "Solange", "Octavia", "Calliope", "Hadley", "Petra", "Saoirse",
    "Cassian", "Damaris", "Elgin", "Ferran", "Goran", "Hari", "Isolde",
    "Jasper", "Kestrel", "Linna", "Magdalen", "Nestor", "Onyeka", "Persi",
    "Quintus", "Rosalind", "Sabra", "Tariq", "Una", "Vito", "Wynne", "Xael",
    "Yusra", "Zhen"
  ];
  const LAST_NAMES = [
    "Aldarra", "Brennan", "Castellan", "Doiron", "Eskildsen", "Forsyth",
    "Greaves", "Halloran", "Iyer", "Jakuba", "Kasparian", "Lindqvist",
    "Mahir", "Nakashima", "Oltean", "Pemberton", "Quintar", "Reinhart",
    "Solberg", "Trembley", "Ueda", "Valenzuela", "Wickham", "Xifra",
    "Yamazaki", "Zerstedt", "Achebe", "Boateng", "Cuvier", "Dürer",
    "Eames", "Fontaine", "Goyal", "Hwang", "Ishak", "Jensen", "Kowal",
    "Larrañaga", "Mbeki", "Novak", "Okafor", "Petros", "Quesada", "Roux",
    "Sinha", "Thorvaldsen", "Ueno", "Valverde", "Westergaard", "Yilmaz"
  ];

  function makeName() {
    return pick(FIRST_NAMES) + " " + pick(LAST_NAMES);
  }

  // ---------- Genres / categories ----------
  const GENRES = [
    { ladder: ["Fiction", "Science Fiction", "Space Opera"], weight: 26, keywords: ["space opera", "empire", "fleet", "diplomacy", "starships", "ftl", "succession", "habitat", "war"] },
    { ladder: ["Fiction", "Science Fiction", "Hard SF"], weight: 18, keywords: ["physics", "hard sf", "engineering", "first contact", "near-future", "orbital mechanics", "habitat"] },
    { ladder: ["Fiction", "Science Fiction", "Cyberpunk"], weight: 16, keywords: ["cyberpunk", "neural lace", "AI", "megacorp", "wetware", "hacking", "neon", "noir"] },
    { ladder: ["Fiction", "Science Fiction", "Post-Cyberpunk"], weight: 9, keywords: ["post-cyberpunk", "post-scarcity", "ai rights", "polyamory", "data sovereignty", "uplift"] },
    { ladder: ["Fiction", "Science Fiction", "Military SF"], weight: 10, keywords: ["military sf", "war", "marines", "fleet", "campaign", "siege", "logistics"] },
    { ladder: ["Fiction", "Science Fiction", "Climate Fiction"], weight: 6, keywords: ["climate", "cli-fi", "rising seas", "refugees", "geoengineering", "biosphere"] },
    { ladder: ["Fiction", "Science Fiction", "Generation Ship"], weight: 4, keywords: ["generation ship", "long voyage", "succession", "habitat", "drift"] },
    { ladder: ["Fiction", "Science Fiction", "First Contact"], weight: 4, keywords: ["first contact", "xenolinguistics", "anthropology", "exobiology"] },
    { ladder: ["Fiction", "Science Fiction", "AI & Singularity"], weight: 4, keywords: ["ai", "singularity", "uploading", "consciousness", "swarm intelligence"] },
    { ladder: ["Fiction", "Science Fiction", "Solarpunk"], weight: 3, keywords: ["solarpunk", "cooperatives", "rewilding", "soft tech", "ecology"] }
  ];
  const weightedGenres = GENRES.map(g => [g, g.weight]);

  // ---------- Series ----------
  const SERIES_PREFIXES = [
    "The Marrow Cycle", "The Verge Sequence", "Imperium", "Cassiopeia Protocol",
    "Outer Drift", "Mainline Capital", "Compiler Wars", "Persephone Sequence",
    "The Tin Sky", "The Slow Math", "The Quiet Network", "The Pyrrhic Trilogy",
    "Habitat Stories", "Tales of the Belt", "The Diplomat Cycle",
    "Inner Reaches", "Halo Foundries", "Long Burn", "The Liturgy Quartet",
    "Quorum Sensing", "The Architect's Trilogy", "Latency", "The Inheritance",
    "The Cartographer's Wars", "Three Roads to Ganymede"
  ];

  // Build series: each gets a length 2..9, an author
  const series = SERIES_PREFIXES.map((name, i) => ({
    id: "s" + (i + 1).toString().padStart(3, "0"),
    name,
    author: makeName(),
    length: pickWeighted([[3, 6], [4, 5], [5, 4], [6, 3], [7, 2], [2, 3], [8, 1], [9, 1]])
  }));

  // ---------- Narrators ----------
  const narrators = [];
  for (let i = 0; i < 80; i++) narrators.push(makeName());

  // ---------- Title gen ----------
  function makeTitle() {
    const style = rand();
    if (style < 0.35) {
      // "The <adj> <noun>"
      return "The " + pick(TITLE_ADJECTIVES) + " " + pick(TITLE_NOUNS);
    } else if (style < 0.55) {
      // "<noun> of <noun>"
      return pick(TITLE_NOUNS) + " of " + pick(TITLE_OF_NOUNS);
    } else if (style < 0.7) {
      // "The <noun> of <of-noun>"
      return "The " + pick(TITLE_NOUNS) + " of " + pick(TITLE_OF_NOUNS);
    } else if (style < 0.85) {
      // bare phrase
      return pick(TITLE_PHRASES);
    } else if (style < 0.94) {
      // "<adj> <noun>"
      return pick(TITLE_ADJECTIVES) + " " + pick(TITLE_NOUNS);
    } else {
      return pick(TITLE_ADJECTIVES) + " " + pick(TITLE_NOUNS) + ", " + pick(TITLE_NOUNS);
    }
  }

  // ---------- Build items ----------
  const TARGET_TOTAL = 812;
  const items = [];
  const usedTitles = new Set();

  // First, generate every series book deterministically
  for (const s of series) {
    const genre = pickWeighted(weightedGenres);
    const baseTitle = pick(TITLE_NOUNS);
    for (let n = 1; n <= s.length; n++) {
      let title;
      // Numbered series books
      const tStyle = rand();
      if (tStyle < 0.5) {
        title = baseTitle + " " + ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"][n - 1];
      } else if (tStyle < 0.8) {
        title = makeTitle();
      } else {
        title = "Book " + n + ": " + makeTitle();
      }
      if (usedTitles.has(title)) title = title + " (vol. " + n + ")";
      usedTitles.add(title);
      items.push({
        _series: s, _seriesIndex: n, _genre: genre,
        title,
        author: s.author,
        subtitle: s.name + " · Book " + n
      });
    }
  }

  // Then fill the rest as standalones
  while (items.length < TARGET_TOTAL) {
    const genre = pickWeighted(weightedGenres);
    let title = makeTitle();
    if (usedTitles.has(title)) continue;
    usedTitles.add(title);
    items.push({
      _series: null, _seriesIndex: null, _genre: genre,
      title,
      author: makeName(),
      subtitle: pick(SUBTITLES)
    });
  }

  // Concentrate authors: some prolific (rebind some standalones to existing prolific authors)
  // Top 8 prolific authors get extra books
  const allAuthors = Array.from(new Set(items.map(it => it.author)));
  // Pick 8 prolific candidates
  const prolific = [];
  for (let i = 0; i < 8; i++) prolific.push(allAuthors[Math.floor(rand() * allAuthors.length)]);
  // Reassign ~22% of standalone items to a prolific author
  for (const it of items) {
    if (!it._series && rand() < 0.22) it.author = pick(prolific);
  }

  // ---------- Decorate every item with full Audible-like fields ----------
  const STATUS_BLURBS = [
    "A meditation on machine grief set in a half-abandoned habitat.",
    "Two diplomats. One translation error. Three hundred years of consequence.",
    "What the swarm wanted was never the same as what we offered it.",
    "The empire fell on a Tuesday; this is the audit.",
    "Late-stage logistics under the boot of the Mainline Capital.",
    "Three sisters, one decommissioned colony ship, the year of slow drift.",
    "A neural-lace surgeon writes back to the system that built her.",
    "An apocryphal account of the third Pyrrhic War, told from below.",
    "Cooperative cartography across a planet that doesn't want to be mapped.",
    "The compiler dreams. The compiler always dreamed.",
    "Inheritance is a kind of betrayal you don't get to opt out of.",
    "Six months on Vesta, with weather, with grief, with the Network in the walls.",
    "A long argument between an architect and the city she could not save.",
    "Telemetry from a probe that should never have come back.",
    "A practical guide to losing a habitat, by someone who has."
  ];

  function makeAsin(i) {
    // 10-char ASIN-shape: B0 + 8 alphanumeric
    const chars = "0123456789ABCDEFGHIJKLMNPQRSTUVWXYZ";
    let s = "B0";
    for (let k = 0; k < 8; k++) s += chars[Math.floor(rand() * chars.length)];
    return s;
  }

  function dayOffset(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }

  const TAG_POOL = [
    "favorites", "comfort", "to-revisit", "mike-recommended",
    "audio-essential", "long-haul", "winter", "summer", "essential",
    "dnf-maybe", "skim-not-finish", "with-pdf", "for-research",
    "narrator-driven", "first-of-series"
  ];

  // Build out
  const finalItems = items.map((it, idx) => {
    const genre = it._genre;
    // Realistic runtime distribution for SF/SO: bias toward 10-22h
    const runtime_min = (() => {
      const r = rand();
      if (r < 0.05) return randInt(120, 240);   // novella
      if (r < 0.20) return randInt(360, 540);   // short
      if (r < 0.55) return randInt(540, 900);   // typical
      if (r < 0.85) return randInt(900, 1380);  // long (15-23h)
      return randInt(1380, 2280);                // doorstopper (23-38h)
    })();

    // Purchase date: 8 years back, slight uptick over time
    const yearsBack = Math.pow(rand(), 1.4) * 8;
    const purchaseDaysAgo = Math.floor(yearsBack * 365 + rand() * 30);
    const purchase_date = dayOffset(purchaseDaysAgo);

    // Percent complete distribution
    const pc = (() => {
      const r = rand();
      if (r < 0.36) return Math.floor(rand() * 100); // started, varying
      if (r < 0.72) return rand() < 0.55 ? 100 : 99; // finished or near
      return 0; // untouched
    })();

    // Some specific buckets we want to surface in Health Check
    let percent_complete = pc;
    if (rand() < 0.04) percent_complete = randInt(95, 99); // near-finished pile
    if (rand() < 0.06) percent_complete = randInt(8, 25);  // bounced early

    // Narrator: 1 or 2
    const narratorList = [pick(narrators)];
    if (rand() < 0.12) narratorList.push(pick(narrators));

    // Price: $5-$40 (mostly $14-$25)
    const price = +(8 + rand() * rand() * 32).toFixed(2);

    // Plans
    const plans = [];
    if (rand() < 0.6) plans.push("Premium Plus");
    if (rand() < 0.18) plans.push("Audible Plus");
    if (rand() < 0.08) plans.push("Free with Credit");

    // Returnable: mostly false, true if recent + low pc
    const ageMonths = purchaseDaysAgo / 30;
    const is_returnable = ageMonths < 12 && percent_complete < 15 && rand() < 0.55;

    // Tags (sparse)
    const tags = [];
    if (rand() < 0.18) tags.push(pick(TAG_POOL));
    if (rand() < 0.06) tags.push(pick(TAG_POOL));
    const tagsUniq = Array.from(new Set(tags));

    // Rating: rand 1-5, weighted high
    let rating = null;
    if (rand() < 0.62) {
      const rr = rand();
      rating = rr < 0.05 ? 2 : rr < 0.15 ? 3 : rr < 0.55 ? 4 : 5;
    }

    // Companion PDF
    const has_pdf = rand() < 0.11;

    // is_dropped (explicit)
    const is_dropped = rand() < 0.025;

    // Health flags (derived later)
    const keywords = [];
    const kpool = genre.keywords;
    const kn = 2 + Math.floor(rand() * 3);
    while (keywords.length < kn) {
      const k = pick(kpool);
      if (!keywords.includes(k)) keywords.push(k);
    }
    // Cross-genre wander: add 1 from another genre
    if (rand() < 0.4) {
      const otherG = pick(GENRES);
      const k = pick(otherG.keywords);
      if (!keywords.includes(k)) keywords.push(k);
    }

    return {
      asin: makeAsin(idx),
      title: it.title,
      subtitle: it.subtitle,
      author: it.author,
      narrators: narratorList,
      publisher_name: pick(["Reverb House", "Lattice Audio", "Folio Vox",
                            "Crooked Wire", "Slow Press Audio", "Halo Foundry",
                            "Mainline Editions", "The Quiet Network",
                            "Persephone Press"]),
      release_date: dayOffset(purchaseDaysAgo + randInt(0, 1200)),
      purchase_date,
      runtime_length_min: runtime_min,
      category_ladders: [genre.ladder],
      thesaurus_subject_keywords: keywords,
      publisher_summary: pick(STATUS_BLURBS),
      product_image_seed: idx, // for procedural cover gen
      content_type: "Audible Audiobook",
      format_type: rand() < 0.05 ? "Abridged" : "Unabridged",
      is_returnable,
      is_listenable: true,
      is_downloaded: rand() < 0.6,
      percent_complete,
      price,
      plans,
      rating,
      series: it._series ? { name: it._series.name, position: it._seriesIndex, id: it._series.id, total: it._series.length } : null,
      has_pdf,
      is_dropped,
      tags: tagsUniq,
      _present: rand() < 0.99 // 1% no-longer-present (refresh diff)
    };
  });

  // ---------- Derived aggregates ----------
  const byAuthor = {};
  for (const it of finalItems) {
    if (!byAuthor[it.author]) byAuthor[it.author] = { name: it.author, count: 0, hours: 0, items: [] };
    byAuthor[it.author].count += 1;
    byAuthor[it.author].hours += it.runtime_length_min / 60;
    byAuthor[it.author].items.push(it);
  }
  const authorList = Object.values(byAuthor).sort((a, b) => b.hours - a.hours);

  const byNarrator = {};
  for (const it of finalItems) {
    for (const n of it.narrators) {
      if (!byNarrator[n]) byNarrator[n] = { name: n, count: 0, hours: 0 };
      byNarrator[n].count += 1;
      byNarrator[n].hours += it.runtime_length_min / 60;
    }
  }
  const narratorList = Object.values(byNarrator).sort((a, b) => b.hours - a.hours);

  // Keyword counts
  const kwCounts = {};
  for (const it of finalItems) for (const k of it.thesaurus_subject_keywords) {
    kwCounts[k] = (kwCounts[k] || 0) + 1;
  }
  const keywordList = Object.entries(kwCounts).map(([k, c]) => ({ keyword: k, count: c })).sort((a, b) => b.count - a.count);

  // Health findings — generated as ADVISORY only
  const findings = [];
  let fid = 1;
  for (const it of finalItems) {
    if (it.percent_complete >= 95 && it.percent_complete < 100) {
      findings.push({ id: "F" + fid++, kind: "near-finished", title: "Stuck near 100 %", asin: it.asin, item: it, severity: "info", note: it.percent_complete + " % — never crossed the threshold." });
    }
    if (it.percent_complete > 0 && it.percent_complete < 22 && (Date.now() - new Date(it.purchase_date).getTime()) / (1000 * 86400) > 365) {
      if (rand() < 0.42) findings.push({ id: "F" + fid++, kind: "bounced-early", title: "Bounced early, still owned", asin: it.asin, item: it, severity: "info", note: it.percent_complete + " % after a year sitting." });
    }
    if (it.is_returnable && it.percent_complete < 8 && (Date.now() - new Date(it.purchase_date).getTime()) / (1000 * 86400) < 200) {
      findings.push({ id: "F" + fid++, kind: "still-returnable", title: "Still returnable", asin: it.asin, item: it, severity: "caution", note: "Returnable window still open · " + it.percent_complete + " % heard." });
    }
  }
  // Duplicates: a few fake fuzzy duplicates
  for (let i = 0; i < 6; i++) {
    const a = finalItems[Math.floor(rand() * finalItems.length)];
    const b = finalItems[Math.floor(rand() * finalItems.length)];
    if (a.asin !== b.asin) {
      findings.push({ id: "F" + fid++, kind: "duplicate", title: "Possible duplicate", asin: a.asin, item: a, dup: b, severity: "caution", note: "Suspected duplicate of " + b.title });
    }
  }
  // Sparse metadata: items missing publisher summary
  for (let i = 0; i < 4; i++) {
    const t = finalItems[Math.floor(rand() * finalItems.length)];
    findings.push({ id: "F" + fid++, kind: "sparse-meta", title: "Sparse metadata", asin: t.asin, item: t, severity: "info", note: "No category ladder beyond Fiction." });
  }

  // Totals
  const totalHours = finalItems.reduce((s, it) => s + it.runtime_length_min / 60, 0);
  const completed = finalItems.filter(it => it.percent_complete >= 95).length;
  const inProgress = finalItems.filter(it => it.percent_complete >= 1 && it.percent_complete < 95).length;
  const untouched = finalItems.filter(it => it.percent_complete === 0).length;

  window.VERSO_DATA = {
    items: finalItems,
    authors: authorList,
    narrators: narratorList,
    keywords: keywordList,
    series,
    findings,
    totals: {
      items: finalItems.length,
      hours: Math.round(totalHours),
      completed, inProgress, untouched,
      authors: authorList.length,
      narrators: narratorList.length,
      series: series.length
    },
    lastRefresh: new Date(Date.now() - 1000 * 60 * 47).toISOString(), // 47 min ago
    refreshDuration: 142, // seconds
    creditValueDefault: 14.95
  };
})();
