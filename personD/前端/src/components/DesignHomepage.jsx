import { useState } from "react";
import HeaderBar from "./HeaderBar.jsx";
import HeroSection from "./HeroSection.jsx";
import FeaturesRow from "./FeaturesRow.jsx";
import TemplateShowcase from "./TemplateShowcase.jsx";

export default function DesignHomepage() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("all");

  return (
    <div className="homepage">
      <div className="homepage-glow" aria-hidden="true" />
      <main className="homepage-main">
        <HeaderBar />
        <HeroSection
          onSearch={setKeyword}
          activeCategory={category}
          onCategoryChange={setCategory}
        />
        <FeaturesRow />
        <TemplateShowcase
          keyword={keyword}
          category={category}
          onCategoryChange={setCategory}
        />
        <div className="homepage-tail" aria-hidden="true" />
      </main>
    </div>
  );
}
