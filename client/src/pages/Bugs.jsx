import { useEffect, useState } from "react";
import { api } from "../api";

const STATUSES = ["Open", "In Progress", "Resolved", "Closed"];
const EMPTY = {
  title: "",
  description: "",
  product: "",
  status: "Open",
  developer: "",
  qa: "",
};

function personName(person) {
  return person?.name || "—";
}

export default function Bugs() {
  const [bugs, setBugs] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadBugs(product = productFilter, status = statusFilter) {
    const params = new URLSearchParams();
    if (product) params.set("product", product);
    if (status) params.set("status", status);
    const query = params.toString();
    setBugs(await api(`/api/bugs${query ? `?${query}` : ""}`));
  }

  useEffect(() => {
    Promise.all([api("/api/products"), api("/api/users")])
      .then(async ([productList, userList]) => {
        setProducts(productList);
        setUsers(userList);
        await loadBugs("", "");
      })
      .catch((err) => setError(err.message));
    // loadBugs reads the latest filters when the user submits the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCreate() {
    setError("");
    setForm({ ...EMPTY, product: products[0]?._id || "" });
  }

  function startEdit(bug) {
    setError("");
    setForm({
      id: bug._id,
      title: bug.title,
      description: bug.description,
      product: bug.product?._id || "",
      status: bug.status,
      developer: bug.developer?._id || "",
      qa: bug.qa?._id || "",
    });
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const body = {
      title: form.title,
      description: form.description,
      product: form.product,
      status: form.status,
      developer: form.developer || null,
      qa: form.qa || null,
    };
    try {
      if (form.id) {
        await api(`/api/bugs/${form.id}`, { method: "PATCH", body });
      } else {
        await api("/api/bugs", { method: "POST", body });
      }
      setForm(null);
      await loadBugs();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(bug) {
    if (!window.confirm(`Delete “${bug.title}”?`)) return;
    setError("");
    try {
      await api(`/api/bugs/${bug._id}`, { method: "DELETE" });
      await loadBugs();
    } catch (err) {
      setError(err.message);
    }
  }

  async function applyFilters(event) {
    event.preventDefault();
    setError("");
    try {
      await loadBugs();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="section-head">
        <h1>Bugs</h1>
        <button type="button" onClick={startCreate} disabled={!products.length}>
          New bug
        </button>
      </div>
      {!products.length && <p className="muted">An admin needs to add a product before bugs can be filed.</p>}
      {error && <p className="error">{error}</p>}

      <form className="filters" onSubmit={applyFilters}>
        <label>
          Product
          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
            <option value="">All</option>
            {products.map((product) => (
              <option key={product._id} value={product._id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="ghost">
          Filter
        </button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Product</th>
              <th>Status</th>
              <th>Developer</th>
              <th>QA</th>
              <th>Created by</th>
              <th>Updated by</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bugs.map((bug) => (
              <tr key={bug._id}>
                
                <td>
                  <strong>{bug.title}</strong>
                  {bug.description && <div className="muted clamp">{bug.description}</div>}
                </td>
                <td>{bug.product?.name || "—"}</td>
                <td>
                  <span className={`status status-${bug.status.replace(" ", "-").toLowerCase()}`}>{bug.status}</span>
                </td>
                <td>{personName(bug.developer)}</td>
                <td>{personName(bug.qa)}</td>
                <td>{personName(bug.createdBy)}</td>
                <td>{personName(bug.updatedBy)}</td>
                <td className="actions">
                  <button type="button" className="ghost" onClick={() => startEdit(bug)}>
                    Edit
                  </button>
                  <button type="button" className="danger" onClick={() => remove(bug)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!bugs.length && (
              <tr>
                <td colSpan={9} className="muted">
                  No bugs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="modal-backdrop" onClick={() => setViewing(null)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <h2>Bug {viewing.bugId}</h2>
            <p>
              <span className="muted">Title</span>
              <br />
              {viewing.title}
            </p>
            <p>
              <span className="muted">Description</span>
              <br />
              {viewing.description || "—"}
            </p>
            <p>
              <span className="muted">Product</span>
              <br />
              {viewing.product?.name || "—"}
            </p>
            <p>
              <span className="muted">Status</span>
              <br />
              {viewing.status}
            </p>
            <p>
              <span className="muted">Developer</span>
              <br />
              {personName(viewing.developer)}
            </p>
            <p>
              <span className="muted">QA</span>
              <br />
              {personName(viewing.qa)}
            </p>
            <p>
              <span className="muted">Created by</span>
              <br />
              {personName(viewing.createdBy)}
            </p>
            <p>
              <span className="muted">Updated by</span>
              <br />
              {personName(viewing.updatedBy)}
            </p>
            <div className="row">
              <button type="button" className="ghost" onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
            <h2>{form.id ? "Edit bug" : "New bug"}</h2>
            <label>
              Title
              <input value={form.title} onChange={(e) => updateField("title", e.target.value)} required />
            </label>
            <label>
              Description
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </label>
            <label>
              Product
              <select value={form.product} onChange={(e) => updateField("product", e.target.value)} required>
                <option value="" disabled>
                  Select a product
                </option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select value={form.status} onChange={(e) => updateField("status", e.target.value)}>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Developer
              <select value={form.developer} onChange={(e) => updateField("developer", e.target.value)}>
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              QA
              <select value={form.qa} onChange={(e) => updateField("qa", e.target.value)}>
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name}
                  </option>
                ))}
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
