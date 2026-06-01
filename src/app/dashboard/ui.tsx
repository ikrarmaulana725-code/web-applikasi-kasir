"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "OWNER" | "ADMIN" | "KASIR" | "GUDANG";
type PaymentMethod = "CASH" | "BANK_TRANSFER" | "QRIS" | "EWALLET" | "RECEIVABLE";
type TransactionStatus = "SUCCESS" | "CANCELLED" | "REFUNDED" | "PENDING";

type User = { id: string; username: string; name: string; role: Role; active: boolean };
type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  unit: string;
  imageUrl: string | null;
  active: boolean;
  categoryId: string;
  category: Category;
};
type Customer = { id: string; name: string; phone: string | null; points: number };
type TransactionItem = {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  subtotal: number;
};
type Transaction = {
  id: string;
  invoiceNumber: string;
  cashierName: string;
  customerName: string;
  customerId: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  createdAt: string;
  items: TransactionItem[];
};
type StockMovement = {
  id: string;
  productId: string;
  productName: string;
  type: "IN" | "OUT" | "ADJUST";
  quantity: number;
  source: string;
  note: string | null;
  createdAt: string;
};
type Settings = {
  id: string;
  storeName: string;
  address: string;
  phone: string;
  receiptFooter: string;
  taxRate: number;
  invoicePrefix: string;
};
type Bootstrap = {
  user: User;
  settings: Settings;
  categories: Category[];
  products: Product[];
  customers: Customer[];
  users: User[];
  transactions: Transaction[];
  stockMovements: StockMovement[];
};
type CartItem = { productId: string; name: string; price: number; cost: number; quantity: number };

const roleFeatures: Record<Role, string[]> = {
  OWNER: ["dashboard", "pos", "products", "stock", "transactions", "customers", "reports", "users", "settings"],
  ADMIN: ["dashboard", "pos", "products", "stock", "transactions", "customers", "reports", "settings"],
  KASIR: ["dashboard", "pos", "transactions", "customers"],
  GUDANG: ["dashboard", "products", "stock"]
};

const nav = [
  ["dashboard", "Dashboard"],
  ["pos", "Kasir/POS"],
  ["products", "Produk"],
  ["stock", "Stok"],
  ["transactions", "Transaksi"],
  ["customers", "Pelanggan"],
  ["reports", "Laporan"],
  ["users", "Pengguna"],
  ["settings", "Pengaturan"]
] as const;

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Tunai",
  BANK_TRANSFER: "Transfer Bank",
  QRIS: "QRIS",
  EWALLET: "E-wallet",
  RECEIVABLE: "Piutang"
};

const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

export default function DashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<Bootstrap | null>(null);
  const [view, setView] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [customerId, setCustomerId] = useState("");
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  async function load() {
    const response = await fetch("/api/bootstrap", { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    const body = (await response.json()) as Bootstrap;
    setData(body);
    setCustomerId(body.customers[0]?.id ?? "");
    if (!roleFeatures[body.user.role].includes(view)) setView(roleFeatures[body.user.role][0]);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const safeDiscount = Math.min(discount, subtotal);
    const tax = Math.round((subtotal - safeDiscount) * ((data?.settings.taxRate ?? 0) / 100));
    const total = subtotal - safeDiscount + tax;
    return { subtotal, discount: safeDiscount, tax, total, change: Math.max(0, paid - total) };
  }, [cart, data?.settings.taxRate, discount, paid]);

  useEffect(() => {
    setPaid(totals.total);
  }, [totals.total]);

  if (!data) {
    return <main className="loading">Memuat Qasir Modern...</main>;
  }

  const can = (feature: string) => roleFeatures[data.user.role].includes(feature);
  const successful = data.transactions.filter((tx) => tx.status === "SUCCESS");
  const today = new Date().toISOString().slice(0, 10);
  const todayTx = successful.filter((tx) => tx.createdAt.slice(0, 10) === today);
  const todayRevenue = todayTx.reduce((sum, tx) => sum + tx.total, 0);
  const todayProfit = todayTx.reduce((sum, tx) => sum + tx.items.reduce((itemSum, item) => itemSum + (item.sellingPrice - item.costPrice) * item.quantity, 0), 0);
  const lowStock = data.products.filter((product) => product.stock <= 10);

  async function api(path: string, init?: RequestInit) {
    const response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message ?? "Request gagal.");
    return body;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  function addToCart(product: Product) {
    if (product.stock <= 0) return show("Stok produk kosong.");
    setCart((current) => {
      const found = current.find((item) => item.productId === product.id);
      if (found) {
        if (found.quantity >= product.stock) {
          show("Stok produk tidak cukup.");
          return current;
        }
        return current.map((item) => (item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { productId: product.id, name: product.name, price: product.sellingPrice, cost: product.costPrice, quantity: 1 }];
    });
  }

  function show(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2600);
  }

  async function checkout() {
    try {
      if (!cart.length) return show("Keranjang masih kosong.");
      const tx = await api("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          customerId: customerId || null,
          items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          discount,
          paidAmount: paid,
          paymentMethod
        })
      });
      setCart([]);
      setDiscount(0);
      setReceipt(tx);
      show("Transaksi berhasil disimpan.");
      await load();
    } catch (error) {
      show(error instanceof Error ? error.message : "Checkout gagal.");
    }
  }

  async function refund(id: string) {
    try {
      await api(`/api/transactions/${id}/refund`, { method: "POST" });
      show("Refund berhasil dan stok dikembalikan.");
      await load();
    } catch (error) {
      show(error instanceof Error ? error.message : "Refund gagal.");
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const id = String(formData.get("id") ?? "");
    const payload = Object.fromEntries(formData.entries());
    try {
      await api(id ? `/api/products/${id}` : "/api/products", {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify({
          name: payload.name,
          sku: payload.sku,
          barcode: payload.barcode || null,
          categoryId: payload.categoryId,
          costPrice: Number(payload.costPrice),
          sellingPrice: Number(payload.sellingPrice),
          stock: Number(payload.stock),
          unit: payload.unit,
          imageUrl: payload.imageUrl || null,
          active: payload.active === "true"
        })
      });
      form.reset();
      show("Produk tersimpan.");
      await load();
    } catch (error) {
      show(error instanceof Error ? error.message : "Produk gagal disimpan.");
    }
  }

  async function saveStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api("/api/stock", {
        method: "POST",
        body: JSON.stringify({ ...payload, quantity: Number(payload.quantity) })
      });
      show("Stok tersimpan.");
      await load();
    } catch (error) {
      show(error instanceof Error ? error.message : "Stok gagal disimpan.");
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ ...payload, taxRate: Number(payload.taxRate) })
      });
      show("Pengaturan tersimpan.");
      await load();
    } catch (error) {
      show(error instanceof Error ? error.message : "Pengaturan gagal disimpan.");
    }
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api("/api/customers", {
        method: "POST",
        body: JSON.stringify({ ...payload, points: Number(payload.points || 0) })
      });
      event.currentTarget.reset();
      show("Pelanggan tersimpan.");
      await load();
    } catch (error) {
      show(error instanceof Error ? error.message : "Pelanggan gagal disimpan.");
    }
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await api("/api/users", {
        method: "POST",
        body: JSON.stringify({ ...payload, active: payload.active === "true" })
      });
      event.currentTarget.reset();
      show("Pengguna tersimpan.");
      await load();
    } catch (error) {
      show(error instanceof Error ? error.message : "Pengguna gagal disimpan.");
    }
  }

  const productMatches = data.products.filter((product) => {
    const text = `${product.name} ${product.sku} ${product.barcode ?? ""} ${product.category.name}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">Q</span>
          <div>
            <strong>Qasir Modern</strong>
            <small>{data.settings.storeName}</small>
          </div>
        </div>
        <nav className="nav-menu">
          {nav
            .filter(([key]) => can(key))
            .map(([key, label]) => (
              <button key={key} className={`nav-button ${view === key ? "active" : ""}`} onClick={() => setView(key)}>
                {label}
              </button>
            ))}
        </nav>
        <button className="ghost full" onClick={logout}>
          Keluar
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">{view}</p>
            <h2>{nav.find(([key]) => key === view)?.[1] ?? "Dashboard"}</h2>
          </div>
          <div className="user-chip">
            <span>{data.user.role}</span>
            <strong>{data.user.name}</strong>
          </div>
        </header>

        {view === "dashboard" ? (
          <div className="stack">
            <div className="grid stats">
              <Stat label="Penjualan hari ini" value={rupiah(todayRevenue)} />
              <Stat label="Transaksi hari ini" value={String(todayTx.length)} />
              <Stat label="Laba kotor hari ini" value={rupiah(todayProfit)} />
              <Stat label="Stok menipis" value={String(lowStock.length)} />
            </div>
            <div className="grid two">
              <Panel title="Transaksi terbaru">
                {data.transactions.slice(0, 6).map((tx) => (
                  <Line key={tx.id} left={tx.invoiceNumber} right={rupiah(tx.total)} />
                ))}
              </Panel>
              <Panel title="Stok hampir habis">
                {lowStock.map((product) => (
                  <Line key={product.id} left={product.name} right={`${product.stock} ${product.unit}`} />
                ))}
              </Panel>
            </div>
          </div>
        ) : null}

        {view === "pos" ? (
          <div className="grid pos-grid">
            <section>
              <div className="toolbar">
                <input placeholder="Cari produk atau scan barcode" value={query} onChange={(event) => setQuery(event.target.value)} />
                <button className="secondary" onClick={() => setQuery("")}>
                  Reset
                </button>
              </div>
              <div className="product-grid">
                {productMatches
                  .filter((product) => product.active)
                  .map((product) => (
                    <button className="product-tile" key={product.id} onClick={() => addToCart(product)}>
                      <div className="product-thumb">{product.imageUrl ? <img alt="" src={product.imageUrl} /> : product.name.slice(0, 2).toUpperCase()}</div>
                      <strong>{product.name}</strong>
                      <span className="muted">{product.category.name} - stok {product.stock}</span>
                      <strong>{rupiah(product.sellingPrice)}</strong>
                    </button>
                  ))}
              </div>
            </section>
            <aside className="card card-pad cart">
              <div className="split">
                <h3>Keranjang</h3>
                <button className="ghost" onClick={() => setCart([])}>
                  Kosongkan
                </button>
              </div>
              <div className="cart-items">
                {cart.length ? (
                  cart.map((item) => (
                    <div className="cart-item" key={item.productId}>
                      <div className="split">
                        <strong>{item.name}</strong>
                        <span>{rupiah(item.price * item.quantity)}</span>
                      </div>
                      <div className="qty-control">
                        <button onClick={() => setCart((c) => c.map((x) => (x.productId === item.productId ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))}>-</button>
                        <strong>{item.quantity}</strong>
                        <button onClick={() => setCart((c) => c.map((x) => (x.productId === item.productId ? { ...x, quantity: x.quantity + 1 } : x)))}>+</button>
                        <button onClick={() => setCart((c) => c.filter((x) => x.productId !== item.productId))}>Hapus</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">Klik produk untuk mulai transaksi.</p>
                )}
              </div>
              <div className="stack">
                <label>
                  Pelanggan
                  <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                    {data.customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Diskon
                    <input type="number" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} />
                  </label>
                  <label>
                    Metode
                    <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
                      {Object.entries(paymentLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Jumlah bayar
                  <input type="number" value={paid} onChange={(event) => setPaid(Number(event.target.value))} />
                </label>
                <div className="totals">
                  <Line left="Subtotal" right={rupiah(totals.subtotal)} />
                  <Line left="Diskon" right={rupiah(totals.discount)} />
                  <Line left={`PPN ${data.settings.taxRate}%`} right={rupiah(totals.tax)} />
                  <Line left="Total" right={rupiah(totals.total)} big />
                  <Line left="Kembalian" right={rupiah(totals.change)} />
                </div>
                <button className="primary full" onClick={checkout}>
                  Bayar dan simpan
                </button>
              </div>
            </aside>
          </div>
        ) : null}

        {view === "products" ? (
          <div className="grid two">
            <Panel title="Tambah / edit produk">
              <form className="stack" onSubmit={saveProduct}>
                <input name="id" placeholder="ID produk untuk edit, kosongkan untuk tambah" />
                <div className="form-grid">
                  <input name="name" placeholder="Nama produk" required />
                  <input name="sku" placeholder="SKU" required />
                  <input name="barcode" placeholder="Barcode" />
                  <select name="categoryId" required>
                    {data.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <input name="costPrice" type="number" placeholder="Harga modal" required />
                  <input name="sellingPrice" type="number" placeholder="Harga jual" required />
                  <input name="stock" type="number" placeholder="Stok" required />
                  <input name="unit" placeholder="Satuan" defaultValue="pcs" required />
                  <input name="imageUrl" placeholder="URL foto" />
                  <select name="active" defaultValue="true">
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
                <button className="primary">Simpan produk</button>
              </form>
            </Panel>
            <section className="card table-wrap">
              <table>
                <thead><tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Status</th></tr></thead>
                <tbody>
                  {data.products.map((product) => (
                    <tr key={product.id}>
                      <td><strong>{product.name}</strong><br /><span className="muted">{product.sku}</span></td>
                      <td>{product.category.name}</td>
                      <td>{rupiah(product.sellingPrice)}</td>
                      <td>{product.stock} {product.unit}</td>
                      <td><span className={`badge ${product.active ? "" : "off"}`}>{product.active ? "AKTIF" : "NONAKTIF"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        ) : null}

        {view === "stock" ? (
          <div className="grid two">
            <Panel title="Pergerakan stok">
              <form className="stack" onSubmit={saveStock}>
                <select name="productId">{data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
                <div className="form-grid">
                  <select name="type"><option value="IN">Stok masuk</option><option value="OUT">Stok keluar</option><option value="ADJUST">Penyesuaian</option></select>
                  <input name="quantity" type="number" min="1" defaultValue="1" />
                </div>
                <input name="source" defaultValue="Manual" />
                <input name="note" placeholder="Catatan" />
                <button className="primary">Simpan stok</button>
              </form>
            </Panel>
            <section className="card table-wrap">
              <table>
                <thead><tr><th>Waktu</th><th>Produk</th><th>Tipe</th><th>Qty</th><th>Sumber</th></tr></thead>
                <tbody>{data.stockMovements.map((m) => <tr key={m.id}><td>{new Date(m.createdAt).toLocaleString("id-ID")}</td><td>{m.productName}</td><td>{m.type}</td><td>{m.quantity}</td><td>{m.source}</td></tr>)}</tbody>
              </table>
            </section>
          </div>
        ) : null}

        {view === "transactions" ? (
          <section className="card table-wrap">
            <table>
              <thead><tr><th>Invoice</th><th>Tanggal</th><th>Kasir</th><th>Pelanggan</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {data.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.invoiceNumber}</td>
                    <td>{new Date(tx.createdAt).toLocaleString("id-ID")}</td>
                    <td>{tx.cashierName}</td>
                    <td>{tx.customerName}</td>
                    <td>{rupiah(tx.total)}</td>
                    <td><span className={`badge ${tx.status === "SUCCESS" ? "" : "danger"}`}>{tx.status}</span></td>
                    <td className="row">
                      <button className="secondary" onClick={() => setReceipt(tx)}>Struk</button>
                      {tx.status === "SUCCESS" && ["OWNER", "ADMIN"].includes(data.user.role) ? <button className="danger" onClick={() => refund(tx.id)}>Refund</button> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {view === "customers" ? (
          <div className="grid two">
            <Panel title="Tambah pelanggan">
              <form className="stack" onSubmit={saveCustomer}>
                <input name="name" placeholder="Nama pelanggan" required />
                <input name="phone" placeholder="Nomor HP" />
                <input name="points" type="number" defaultValue="0" />
                <button className="primary">Simpan pelanggan</button>
              </form>
            </Panel>
            <section className="card table-wrap">
              <table><thead><tr><th>Nama</th><th>HP</th><th>Poin</th></tr></thead><tbody>{data.customers.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.phone ?? "-"}</td><td>{c.points}</td></tr>)}</tbody></table>
            </section>
          </div>
        ) : null}

        {view === "reports" ? (
          <div className="grid stats">
            <Stat label="Total omzet" value={rupiah(successful.reduce((sum, tx) => sum + tx.total, 0))} />
            <Stat label="Total modal" value={rupiah(successful.reduce((sum, tx) => sum + tx.items.reduce((s, i) => s + i.costPrice * i.quantity, 0), 0))} />
            <Stat label="Laba kotor" value={rupiah(successful.reduce((sum, tx) => sum + tx.items.reduce((s, i) => s + (i.sellingPrice - i.costPrice) * i.quantity, 0), 0))} />
            <Stat label="Transaksi sukses" value={String(successful.length)} />
          </div>
        ) : null}

        {view === "users" ? (
          <div className="grid two">
            <Panel title="Tambah pengguna">
              <form className="stack" onSubmit={saveUser}>
                <input name="name" placeholder="Nama" required />
                <input name="username" placeholder="Username" required />
                <input name="password" type="password" placeholder="Password minimal 6 karakter" required />
                <select name="role"><option value="OWNER">Owner</option><option value="ADMIN">Admin</option><option value="KASIR">Kasir</option><option value="GUDANG">Gudang</option></select>
                <select name="active"><option value="true">Aktif</option><option value="false">Nonaktif</option></select>
                <button className="primary">Simpan pengguna</button>
              </form>
            </Panel>
            <section className="card table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Role</th><th>Status</th></tr></thead><tbody>{data.users.map((u) => <tr key={u.id}><td>{u.name}</td><td>{u.username}</td><td>{u.role}</td><td>{u.active ? "Aktif" : "Nonaktif"}</td></tr>)}</tbody></table></section>
          </div>
        ) : null}

        {view === "settings" ? (
          <Panel title="Pengaturan toko">
            <form className="stack" onSubmit={saveSettings}>
              <div className="form-grid">
                <input name="storeName" defaultValue={data.settings.storeName} placeholder="Nama toko" />
                <input name="phone" defaultValue={data.settings.phone} placeholder="WhatsApp" />
                <input name="address" defaultValue={data.settings.address} placeholder="Alamat" />
                <input name="invoicePrefix" defaultValue={data.settings.invoicePrefix} placeholder="Prefix invoice" />
                <input name="taxRate" type="number" defaultValue={data.settings.taxRate} placeholder="Pajak" />
                <input name="receiptFooter" defaultValue={data.settings.receiptFooter} placeholder="Footer struk" />
              </div>
              <button className="primary">Simpan pengaturan</button>
            </form>
          </Panel>
        ) : null}
      </main>

      {receipt ? <ReceiptModal tx={receipt} settings={data.settings} onClose={() => setReceipt(null)} /> : null}
      {message ? <div className="toast">{message}</div> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <section className="card stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card card-pad">
      <h3>{title}</h3>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function Line({ left, right, big }: { left: string; right: string; big?: boolean }) {
  return (
    <div className={`split ${big ? "grand" : ""}`}>
      <span>{left}</span>
      <strong>{right}</strong>
    </div>
  );
}

function ReceiptModal({ tx, settings, onClose }: { tx: Transaction; settings: Settings; onClose: () => void }) {
  return (
    <div className="dialog-backdrop">
      <section className="dialog">
        <header><h3>Struk {tx.invoiceNumber}</h3></header>
        <div id="printArea" className="receipt">
          <h3>{settings.storeName}</h3>
          <div className="center">{settings.address}<br />{settings.phone}</div>
          <div className="line" />
          <div>No: {tx.invoiceNumber}</div>
          <div>Tgl: {new Date(tx.createdAt).toLocaleString("id-ID")}</div>
          <div>Kasir: {tx.cashierName}</div>
          <div>Pelanggan: {tx.customerName}</div>
          <div className="line" />
          {tx.items.map((item) => (
            <div key={item.id}>{item.productName}<br />{item.quantity} x {rupiah(item.sellingPrice)} <span className="float">{rupiah(item.subtotal)}</span></div>
          ))}
          <div className="line" />
          <div>Subtotal <span className="float">{rupiah(tx.subtotal)}</span></div>
          <div>Diskon <span className="float">{rupiah(tx.discount)}</span></div>
          <div>Pajak <span className="float">{rupiah(tx.tax)}</span></div>
          <div><strong>Total <span className="float">{rupiah(tx.total)}</span></strong></div>
          <div>Bayar <span className="float">{rupiah(tx.paidAmount)}</span></div>
          <div>Kembali <span className="float">{rupiah(tx.changeAmount)}</span></div>
          <div>Metode: {paymentLabels[tx.paymentMethod]}</div>
          <div className="line" />
          <div className="center">{settings.receiptFooter}</div>
        </div>
        <footer>
          <button className="secondary" onClick={() => window.print()}>Cetak</button>
          <button className="ghost" onClick={onClose}>Tutup</button>
        </footer>
      </section>
    </div>
  );
}
