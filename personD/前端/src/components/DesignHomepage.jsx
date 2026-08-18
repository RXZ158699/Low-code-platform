import { useState } from "react";
import HeaderBar from "./HeaderBar.jsx";
import HeroSection from "./HeroSection.jsx";
import FeaturesRow from "./FeaturesRow.jsx";
import TemplateShowcase from "./TemplateShowcase.jsx";

export default function DesignHomepage() {
  const [keyword, setKeyword] = useState("");

  return (
    <div className="homepage">
      <div className="homepage-glow" aria-hidden="true" />
      <main className="homepage-main">
        <HeaderBar />
        <HeroSection onSearch={setKeyword} />
        <FeaturesRow />
        <TemplateShowcase keyword={keyword} />
        <div className="homepage-tail" aria-hidden="true" />
      </main>
    </div>
  );
}
