import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppProviders } from "./providers";
import { Landing } from "@/widgets/site/Landing";
import { DesignPage } from "@/widgets/designer/DesignPage";
import { SkylinePage } from "@/widgets/designer/SkylinePage";

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/mountains", element: <DesignPage /> },
  { path: "/maps", element: <SkylinePage /> },
  { path: "*", element: <Landing /> },
]);

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
