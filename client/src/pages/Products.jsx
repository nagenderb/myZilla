import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

export default function Products() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setProducts(await api("/api/products"));
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
        await api(`/api/products/${form.id}`, {
          method: "PATCH",
          body: { name: form.name, description: form.description },
        });
      } else {
        await api("/api/products", {
          method: "POST",
          body: { name: form.name, description: form.description },
        });
      }
      setForm(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(product) {
    if (!window.confirm(`Delete “${product.name}”?`)) return;
    setError("");
    try {
      await api(`/api/products/${product._id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="section-head">
        <h1>Products</h1>
        {isAdmin && (
          <button type="button" onClick={() => setForm({ name: "", description: "" })}>
            New product
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Created by</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id}>
                <td>{product.name}</td>
                <td>{product.description || "—"}</td>
                <td>{product.createdBy?.name || "—"}</td>
                {isAdmin && (
                  <td className="actions">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        setForm({
                          id: product._id,
                          name: product.name,
                          description: product.description,
                        })
                      }
                    >
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => remove(product)}>
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!products.length && (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="muted">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
            <h2>{form.id ? "Edit product" : "New product"}</h2>
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
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
