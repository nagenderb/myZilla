import { useEffect, useState } from "react";
import { api } from "../api";

const EMPTY = { name: "", email: "", password: "", role: "user" };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setUsers(await api("/api/users"));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (form.id) {
        const body = { name: form.name, email: form.email, role: form.role };
        if (form.password) body.password = form.password;
        await api(`/api/users/${form.id}`, { method: "PATCH", body });
      } else {
        await api("/api/users", { method: "POST", body: form });
      }
      setForm(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(user) {
    if (!window.confirm(`Delete ${user.name}?`)) return;
    setError("");
    try {
      await api(`/api/users/${user._id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="section-head">
        <h1>Users</h1>
        <button type="button" onClick={() => setForm({ ...EMPTY })}>
          New user
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td className="actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      setForm({
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        password: "",
                        role: user.role,
                      })
                    }
                  >
                    Edit
                  </button>
                  <button type="button" className="danger" onClick={() => remove(user)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
            <h2>{form.id ? "Edit user" : "New user"}</h2>
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </label>
            <label>
              Password {form.id && <span className="muted"> (leave blank to keep)</span>}
              <input
                type="password"
                value={form.password}
                minLength={form.id ? undefined : 6}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!form.id}
              />
            </label>
            <label>
              Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <div className="row">
              <button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
              <button type="button" className="ghost" onClick={() => setForm(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
