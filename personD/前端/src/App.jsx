import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import DesignHomepage from "./components/DesignHomepage.jsx";
import StickySearchBar from "./components/StickySearchBar.jsx";
import { CreatePopoverProvider } from "./components/CreatePopover.jsx";

const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 1302;

function App() {
  const shellRef = useRef(null);
  const [shellWidth, setShellWidth] = useState(
    () => document.documentElement.clientWidth,
  );
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [viewportHeight, setViewportHeight] = useState(
    () => window.innerHeight,
  );
  const [stickyVisible, setStickyVisible] = useState(false);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;

    const measure = () => {
      setShellWidth(shell.clientWidth);
      setViewportWidth(window.innerWidth);
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
      const searchBox = document.querySelector(".hero .search-pill");
      if (!searchBox) return;
      setStickyVisible(searchBox.getBoundingClientRect().top <= 0);
    };

    shell.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      shell.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const scale = useMemo(() => shellWidth / DESIGN_WIDTH, [shellWidth]);
  const canvasHeight = useMemo(
    () => Math.max(DESIGN_HEIGHT, viewportHeight / scale),
    [viewportHeight, scale],
  );
  const sidebarVisualWidth = 80 * scale;
  const stickyBarWidth = Math.max(viewportWidth - sidebarVisualWidth, 0);

  return (
    <CreatePopoverProvider>
      <main className="stage-shell" ref={shellRef}>
        <StickySearchBar
          visible={stickyVisible}
          scale={scale}
          left={sidebarVisualWidth}
          width={stickyBarWidth}
        />

        <div
          className="fixed-sidebar"
          style={{ "--page-scale": scale, transform: `scale(${scale})` }}
        >
          <Sidebar />
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
            style={{
              width: DESIGN_WIDTH,
              height: canvasHeight,
              transform: `scale(${scale})`,
              "--page-scale": scale,
            }}
          >
            <DesignHomepage />
          </div>
        </div>
      </main>
    </CreatePopoverProvider>
  );
}

export default App;
