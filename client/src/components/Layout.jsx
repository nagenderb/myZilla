import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Myzilla</div>
        <nav>
          <NavLink to="/bugs">Bugs</NavLink>
          <NavLink to="/products">Products</NavLink>
          {user.role === "admin" && <NavLink to="/users">Users</NavLink>}
        </nav>
        <div className="who">
          <span>
            {user.name} <em>{user.role}</em>
          </span>
          <button type="button" className="ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
