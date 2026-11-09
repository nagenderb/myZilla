import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Bugs from "./pages/Bugs";
import Products from "./pages/Products";
import Users from "./pages/Users";

function Private({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="muted page">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/bugs" replace />;
  return children;
}

function Guest({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="muted page">Loading…</p>;
  if (user) return <Navigate to="/bugs" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Guest><Login /></Guest>} />
      <Route path="/register" element={<Guest><Register /></Guest>} />
      <Route
        element={
          <Private>
            <Layout />
          </Private>
        }
      >
        <Route path="/bugs" element={<Bugs />} />
        <Route path="/products" element={<Products />} />
        <Route
          path="/users"
          element={
            <AdminOnly>
              <Users />
            </AdminOnly>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/bugs" replace />} />
    </Routes>
  );
}
