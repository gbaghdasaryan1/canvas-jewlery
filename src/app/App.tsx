import { AppProviders } from "./providers";
import { Landing } from "@/widgets/site/Landing";
import { DesignPage } from "@/widgets/designer/DesignPage";
import { SkylinePage } from "@/widgets/designer/SkylinePage";

export function App() {
  const path = window.location.pathname.replace(/\/+$/, "");
  const page =
    path === "/design" ? <DesignPage /> : path === "/skylines" ? <SkylinePage /> : <Landing />;

  return <AppProviders>{page}</AppProviders>;
}
