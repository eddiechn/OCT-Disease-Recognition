import * as React from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  Link,
  Outlet,
} from "react-router-dom";

import Results from "./routes/Results";
import Home from "./routes/Home";
import Settings from "./routes/Settings";
import NavBar from "./components/NavBar";


// Layout component with Navbar, Outlet for dynamic content, and Footer
const AppLayout = () => (
  <>
    <NavBar />
    <main>
      <Outlet /> {/* Render matching child routes here */}
    </main>
  </>
);

// Define routes using createBrowserRouter
const router = createBrowserRouter([
  {
    path: "/", // Base layout route
    element: <AppLayout />, // App layout with Navbar and Footer
    children: [
      {
        path: "home", // Matches /home
        element: <Home />,
      },
      {
        path: "results", // Matches /results
        element: <Results />,
      },
      {
        path: "settings", // Matches /settings
        element: <Settings />,
      },
    ],
  },
]);

// Render the RouterProvider at the root of the app
createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />
);