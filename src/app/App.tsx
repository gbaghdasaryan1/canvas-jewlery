import { AppProviders } from "./providers";
import { Landing } from "@/widgets/site/Landing";
import { DesignPage } from "@/widgets/designer/DesignPage";
import { SkylinePage } from "@/widgets/designer/SkylinePage";
import { PendantPage } from "@/widgets/pendant-designer/ui/PendantPage";

export function App() {
  const path = window.location.pathname.replace(/\/+$/, "");
  const page =
    path === "/design" ? (
      <DesignPage />
    ) : path === "/skylines" ? (
      <SkylinePage />
    ) : path === "/pendant" ? (
      <PendantPage />
    ) : (
      <Landing />
    );

  return <AppProviders>{page}</AppProviders>;
}
