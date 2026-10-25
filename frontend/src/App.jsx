import { useEffect, useState } from "react";
import ModelInfo from "./ModelInfo.jsx";
import Predict from "./Predict.jsx";
import Batch from "./Batch.jsx";

const TABS = [
  ["predict", "Try it"],
  ["batch", "Upload CSV"],
  ["model", "About the model"],
];

export default function App() {
  // Dark is the default. index.html ships data-theme="dark" so there is no flash.
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark"
  );
  const [tab, setTab] = useState("predict");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="wrap">
      <div className="top">
        <div>
          <h1>Thyroid Screening</h1>
        </div>
        <button
          className="theme-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? "☀ Light" : "☾ Dark"}
        </button>
      </div>
      <p className="tagline">
        Random forest predicting hypothyroidism from routine blood tests, with a depth-3 decision
        tree supplying the reason for every call.
      </p>

      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            className="tab"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "predict" && <Predict />}
      {tab === "batch" && <Batch />}
      {tab === "model" && <ModelInfo />}
    </div>
  );
}
