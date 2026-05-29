/* global React, ReactDOM, VERSO_DATA,
   Sidebar, TopNav, TopBar, NAV_SECTIONS, I,
   OverviewDense, OverviewCalm, LibraryTable, ItemDetail,
   ReportAuthors, ReportRuntime, ReportCoverWall, ReportKeywords,
   ReportHealth, RefreshStatus, Settings,
   TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakColor, TweakToggle */

const { useState: useStateA, useEffect: useEffectA } = React;

// ----------------------------- Page title map -----------------------------
const PAGE_TITLES = {
  "overview":        { title: "Library overview", crumbs: ["Library", "Overview"] },
  "library":         { title: "Library · all items", crumbs: ["Library", "All items"] },
  "wall":            { title: "Cover wall", crumbs: ["Library", "Cover wall"] },
  "item":            { title: "Item detail", crumbs: ["Library", "Item"] },
  "report-authors":  { title: "Author concentration", crumbs: ["Reports", "Author concentration"] },
  "report-runtime":  { title: "Runtime distribution", crumbs: ["Reports", "Runtime distribution"] },
  "report-keywords": { title: "Subject keywords", crumbs: ["Reports", "Subject keywords"] },
  "health":          { title: "Library health check", crumbs: ["Curation", "Health"] },
  "refresh":         { title: "Refresh status", crumbs: ["Operations", "Refresh"] },
  "settings":        { title: "Settings", crumbs: ["Operations", "Settings"] },
};

// ----------------------------- Tweak defaults -----------------------------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "nav": "topnav",
  "overview": "calm",
  "libraryView": "rows",
  "accentLeft": true
}/*EDITMODE-END*/;

// ----------------------------- App root -----------------------------
function App() {
  const [active, setActive] = useStateA("overview");
  const [openItem, setOpenItem] = useStateA(null);
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const data = window.VERSO_DATA;

  function navigate(id) {
    setOpenItem(null);
    setActive(id);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function openDetail(item) {
    setOpenItem(item);
    setActive("item");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  // Apply accent-left toggle as a CSS class on body for non-React tweaks
  useEffectA(() => {
    document.body.classList.toggle("no-accent-left", !tweaks.accentLeft);
  }, [tweaks.accentLeft]);

  const page = PAGE_TITLES[active] || PAGE_TITLES.overview;

  // Page content
  function renderPage() {
    if (active === "item") {
      return <ItemDetail item={openItem} data={data} onBack={() => { setOpenItem(null); setActive("library"); }} />;
    }
    if (active === "overview") {
      return tweaks.overview === "dense"
        ? <OverviewDense data={data} onNavigate={navigate} onOpenItem={openDetail} />
        : <OverviewCalm  data={data} onNavigate={navigate} onOpenItem={openDetail} />;
    }
    if (active === "library") return <LibraryTable data={data} view={tweaks.libraryView} onOpenItem={openDetail} />;
    if (active === "wall")    return <ReportCoverWall data={data} onOpenItem={openDetail} />;
    if (active === "report-authors")  return <ReportAuthors data={data} onNavigate={navigate} />;
    if (active === "report-runtime")  return <ReportRuntime data={data} />;
    if (active === "report-keywords") return <ReportKeywords data={data} />;
    if (active === "health")  return <ReportHealth data={data} onOpenItem={openDetail} />;
    if (active === "refresh") return <RefreshStatus data={data} />;
    if (active === "settings") return <Settings data={data} />;
    return null;
  }

  // ---------- TopBar actions per page ----------
  function topActions() {
    if (active === "overview") return (
      <>
        <button className="v-btn v-btn-outline">{I.refresh} Refresh library</button>
        <button className="v-btn v-btn-outline">{I.download} Export</button>
      </>
    );
    if (active === "library") return (
      <>
        <button className="v-btn v-btn-outline">{I.tag} Manage tags</button>
        <button className="v-btn v-btn-outline">{I.download} Export filtered</button>
      </>
    );
    if (active === "wall") return <button className="v-btn v-btn-outline">{I.download} Export wallpaper</button>;
    if (active === "report-authors" || active === "report-runtime" || active === "report-keywords")
      return <button className="v-btn v-btn-outline">{I.download} Export view</button>;
    if (active === "health") return null;
    if (active === "refresh") return null;
    if (active === "settings") return null;
    return null;
  }

  return (
    <>
      {tweaks.nav === "topnav" ? (
        <>
          <TopNav active={active} onNavigate={navigate} data={data} />
          <div className="v-main">
            <TopBar
              title={openItem ? openItem.title : page.title}
              breadcrumbs={openItem ? ["Library", "All items", openItem.title.length > 40 ? openItem.title.slice(0, 40) + "…" : openItem.title] : page.crumbs}
              actions={topActions()}
            />
            <div className="v-content">{renderPage()}</div>
          </div>
        </>
      ) : (
        <div className="v-app">
          <Sidebar active={active} onNavigate={navigate} data={data} />
          <div className="v-main">
            <TopBar
              title={openItem ? openItem.title : page.title}
              breadcrumbs={openItem ? ["Library", "All items", openItem.title.length > 40 ? openItem.title.slice(0, 40) + "…" : openItem.title] : page.crumbs}
              actions={topActions()}
            />
            <div className="v-content">{renderPage()}</div>
          </div>
        </div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Navigation chrome">
          <TweakRadio label="Nav style" value={tweaks.nav} onChange={(v) => setTweak("nav", v)}
                      options={[{ value: "sidebar", label: "Sidebar" }, { value: "topnav", label: "Top nav" }]} />
        </TweakSection>
        <TweakSection title="Library overview">
          <TweakRadio label="Variant" value={tweaks.overview} onChange={(v) => setTweak("overview", v)}
                      options={[{ value: "dense", label: "Data-dense" }, { value: "calm", label: "Calm" }]} />
        </TweakSection>
        <TweakSection title="Library table">
          <TweakRadio label="Density" value={tweaks.libraryView} onChange={(v) => setTweak("libraryView", v)}
                      options={[{ value: "rows", label: "Compact rows" }, { value: "cards", label: "Card grid" }]} />
        </TweakSection>
        <TweakSection title="Accents">
          <TweakToggle label="Ember left-border on KPI cards" value={tweaks.accentLeft} onChange={(v) => setTweak("accentLeft", v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
