import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import DesignHomepage from "./components/DesignHomepage.jsx";
import DiscoverPage from "./components/DiscoverPage.jsx";
import MinePage from "./components/MinePage.jsx";
import DiscoverStickyHeader, { DiscoverNavProvider } from "./components/DiscoverHeader.jsx";
import StickySearchBar from "./components/StickySearchBar.jsx";
import { CreatePopoverProvider } from "./components/CreatePopover.jsx";
import { AppPageProvider } from "./AppPageContext.jsx";

const DESIGN_WIDTH = 1440;
const HOME_HEIGHT = 1302;
const DISCOVER_HEIGHT = 1180;
const MINE_HEIGHT = 1020;

function App() {
  const shellRef = useRef(null);
  const innerRef = useRef(null);
  const [page, setPage] = useState("create");
  const [shellWidth, setShellWidth] = useState(
    () => document.documentElement.clientWidth,
  );
  const [viewportHeight, setViewportHeight] = useState(
    () => window.innerHeight,
  );
  const [stickyVisible, setStickyVisible] = useState(false);
  const [homeContentHeight, setHomeContentHeight] = useState(0);

  const isDiscover = page === "discover";
  const isMine = page === "mine";
  const isHome = page === "create";
  const designHeight = isDiscover ? DISCOVER_HEIGHT : isMine ? MINE_HEIGHT : HOME_HEIGHT;

  useEffect(() => {
    if (!isHome) return undefined;
    const el = innerRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(() => setHomeContentHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [isHome]);

  useEffect(() => {
    shellRef.current?.scrollTo(0, 0);
  }, [page]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;

    const measure = () => {
      setShellWidth(shell.clientWidth);
      setViewportHeight(window.innerHeight);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;

    const handleScroll = () => {
      if (isDiscover) {
        setStickyVisible(shell.scrollTop > 1);
        return;
      }
      if (isMine) {
        setStickyVisible(false);
        return;
      }
      const searchBox = document.querySelector(".hero .search-pill");
      if (!searchBox) {
        setStickyVisible(false);
        return;
      }
      setStickyVisible(searchBox.getBoundingClientRect().top <= 0);
    };

    handleScroll();
    shell.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      shell.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isDiscover, isMine]);

  const scale = useMemo(() => shellWidth / DESIGN_WIDTH, [shellWidth]);
  const measuredHeight = isHome ? homeContentHeight : 0;
  const canvasHeight = useMemo(
    () => Math.max(designHeight, measuredHeight, viewportHeight / scale),
    [designHeight, measuredHeight, viewportHeight, scale],
  );
  const sidebarVisualWidth = 80 * scale;
  const stickyBarWidth = Math.max(shellWidth - sidebarVisualWidth, 0);

  return (
    <CreatePopoverProvider>
      <AppPageProvider
        page={page}
        setPage={setPage}
        scale={scale}
        sidebarVisualWidth={sidebarVisualWidth}
        stickyBarWidth={stickyBarWidth}
      >
      <DiscoverNavProvider>
      <main className={`stage-shell${isDiscover ? " is-discover" : ""}${isMine ? " is-mine" : ""}`} ref={shellRef}>
        {isDiscover && (
          <DiscoverStickyHeader
            pinned={stickyVisible}
            scale={scale}
            left={sidebarVisualWidth}
            width={stickyBarWidth}
          />
        )}
        {isHome && (
          <StickySearchBar
            visible={stickyVisible}
            scale={scale}
            left={sidebarVisualWidth}
            width={stickyBarWidth}
          />
        )}

        <div
          className="fixed-sidebar"
          style={{ "--page-scale": scale, transform: `scale(${scale})` }}
        >
          <Sidebar active={page} onNavigate={setPage} />
        </div>

        <div
          className="scale-canvas"
          style={{
            width: DESIGN_WIDTH * scale,
            height: canvasHeight * scale,
          }}
        >
          <div
            className="scale-inner"
            ref={innerRef}
            style={{
              width: DESIGN_WIDTH,
              height: isHome ? undefined : canvasHeight,
              transform: `scale(${scale})`,
              "--page-scale": scale,
            }}
          >
            {isDiscover ? <DiscoverPage /> : isMine ? <MinePage /> : <DesignHomepage />}
          </div>
        </div>
      </main>
      </DiscoverNavProvider>
      </AppPageProvider>
    </CreatePopoverProvider>
  );
}

export default App;
