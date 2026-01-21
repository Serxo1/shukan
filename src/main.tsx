import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import App from "./App";
import MainWindow from "./pages/MainWindow";
import OnboardingWindow from "./pages/OnboardingWindow";

const path = window.location.pathname;

// Set background based on route
if (path !== "/" && path !== "") {
  document.documentElement.style.background = "#0a0a0a";
  document.body.style.background = "#0a0a0a";
}

let Component: React.ComponentType;
if (path === "/settings") {
  Component = MainWindow;
} else if (path === "/onboarding") {
  Component = OnboardingWindow;
} else {
  Component = App;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Component />
  </React.StrictMode>
);
