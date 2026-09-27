import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DatasetPage } from "./pages/DatasetPage.tsx";
import { Home } from "./pages/Home.tsx";
import { PacketPage } from "./pages/PacketPage.tsx";
import { PairPage } from "./pages/PairPage.tsx";
import { href, useRoute } from "./router.ts";
import "./styles.css";

function App() {
  const route = useRoute();
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="app-bar">
        <a className="brand" href={href.home()}>
          Engineering skill evaluations
        </a>
      </header>
      <main id="main">
        {route.page === "home" && <Home />}
        {route.page === "dataset" && <DatasetPage key={route.dataset} id={route.dataset} skill={route.skill} />}
        {route.page === "pair" && <PairPage datasetId={route.dataset} skill={route.skill} pairId={route.pair} />}
        {route.page === "packet" && <PacketPage key={route.packet} id={route.packet} itemId={route.item} />}
        {route.page === "missing" && <p className="pad">Page not found. <a href={href.home()}>Go home</a>.</p>}
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
