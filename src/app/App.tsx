import { AppProviders } from "./providers";
import { Landing } from "@/widgets/site/Landing";
import { DesignPage } from "@/widgets/designer/DesignPage";

export function App() {
  const path = window.location.pathname.replace(/\/+$/, "");
  const isDesign = path === "/design";

  return <AppProviders>{isDesign ? <DesignPage /> : <Landing />}</AppProviders>;
}
