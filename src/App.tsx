import { Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";
import AuthSignupPage from "./pages/AuthSignupPage";
import IntegrationsModalPage from "./pages/IntegrationsModalPage";
import AuthLoginPage from "./pages/AuthLoginPage";
import { ToastProvider } from "./components/ToastAlert";

const App = () => (
  <ToastProvider>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/signup" element={<AuthSignupPage />} />
      <Route path="/integrations" element={<IntegrationsModalPage />} />
      <Route path="/login" element={<AuthLoginPage />} />
    </Routes>
  </ToastProvider>
);

export default App;
