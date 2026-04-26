import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Documentation from "./pages/Documentation";
import Inspiration from "./pages/Inspiration";
import Locations from "./pages/Locations";
import Productivity from "./pages/Productivity";
import Sets from "./pages/Sets";
import Tools from "./pages/Tools";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tools" element={<Tools />} />
          <Route path="inspiration" element={<Inspiration />} />
          <Route path="locations" element={<Locations />} />
          <Route path="sets" element={<Sets />} />
          <Route path="productivity" element={<Productivity />} />
          <Route path="documentation" element={<Documentation />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
