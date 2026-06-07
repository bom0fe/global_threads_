// Root component that switches between Dashboard and DeepAnalysisView.
import { useState } from "react";
import Dashboard         from "./Dashboard";
import DeepAnalysisView  from "./DeepAnalysisView";

export default function App() {
  const [mode, setMode] = useState("dashboard");
  if (mode === "dashboard") {
    return <Dashboard onDeepAnalysis={() => setMode("deepanalysis")} />;
  }
  return <DeepAnalysisView onBack={() => setMode("dashboard")} />;
}
