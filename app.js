const STORAGE_KEY = "qasir-modern-v1";

const roles = {
  owner: ["dashboard", "pos", "products", "stock", "transactions", "customers", "reports", "users", "settings"],
  admin: ["dashboard", "pos", "products", "stock", "transactions", "customers", "reports", "settings"],
  kasir: ["dashboard", "pos", "transactions", "customers"],
  gudang: ["dashboard", "products", "stock"],
};

const navItems = [
  ["dashboard", "Ringkasan", "Dashboard"],
  ["pos", "Kasir", "POS"],
  ["products", "Produk", "Produk"],
  ["stock", "Stok", "Stok"],
  ["transactions", "Transaksi", "Riwayat"],
  ["customers", "Pelanggan", "Pelanggan"],
  ["reports", "Laporan", "Laporan"],
  ["users", "Pengguna", "Pengguna"],
  ["settings", "Pengaturan", "Toko"],
];

const seed = {
  session: null,
  settings: {
    storeName: "Toko Berkah Jaya",
    address: "Jl. Poros Utama No. 10",
    phone: "081234567890",
    footer: "Terima kasih sudah berbelanja.",
    taxRate: 0,
    invoicePrefix: "INV",
  },
  users: [
    { id: "u1", username: "owner", password: "123456", name: "Owner Demo", role: "owner", active: true },
    { id: "u2", username: "admin", password: "123456", name: "Admin Toko", role: "admin", active: true },
    { id: "u3", username: "kasir", password: "123456", name: "Kasir Sore", role: "kasir", active: true },
    { id: "u4", username: "gudang", password: "123456", name: "Staff Gudang", role: "gudang", active: true },
  ],
  categories: [
    { id: "c1", name: "Makanan" },
    { id: "c2", name: "Minuman" },
    { id: "c3", name: "Rumah Tangga" },
  ],
  products: [
    { id: "p1", name: "Indomie Goreng", categoryId: "c1", sku: "MKN-001", barcode: "899886620001", cost: 2800, price: 3500, stock: 100, unit: "pcs", image: "", active: true },
    { id: "p2", name: "Aqua 600ml", categoryId: "c2", sku: "MNM-001", barcode: "899275372222", cost: 2500, price: 4000, stock: 36, unit: "pcs", image: "", active: true },
    { id: "p3", name: "Kopi Sachet", categoryId: "c2", sku: "MNM-002", barcode: "899100210003", cost: 1200, price: 2000, stock: 12, unit: "pcs", image: "", active: true },
    { id: "p4", name: "Sabun Cuci", categoryId: "c3", sku: "RT-001", barcode: "899700440004", cost: 7000, price: 9500, stock: 8, unit: "pcs", image: "", active: true },
  ],
  customers: [
    { id: "m1", name: "Umum", phone: "", points: 0 },
    { id: "m2", name: "Ibu Rina", phone: "082211112222", points: 24 },
  ],
  transactions: [],
  stockMovements: [],
};

let state = loadState();
let activeView = "dashboard";
let cart = [];
let productQuery = "";
let txQuery = "";

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(seed);
  try {
    return { ...structuredClone(seed), ...JSON.parse(raw) };
  } catch {
    return structuredClone(seed);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function rupiah(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.remove("hidden");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => el.classList.add("hidden"), 2600);
}

function currentUser() {
  return state.users.find((user) => user.id === state.session?.userId);
}

function can(view) {
  const user = currentUser();
  return user && roles[user.role]?.includes(view);
}

function categoryName(id) {
  return state.categories.find((cat) => cat.id === id)?.name || "-";
}

function productById(id) {
  return state.products.find((product) => product.id === id);
}

function successfulTransactions() {
  return state.transactions.filter((tx) => tx.status === "SUCCESS");
}

function init() {
  document.querySelector("#loginForm").addEventListener("submit", handleLogin);
  document.querySelector("#logoutBtn").addEventListener("click", logout);
  if (state.session) showApp();
  else showLogin();
}

function handleLogin(event) {
  event.preventDefault();
  const username = document.querySelector("#loginUsername").value.trim();
  const password = document.querySelector("#loginPassword").value;
  const user = state.users.find((item) => item.username === username && item.password === password && item.active);
  if (!user) return toast("Username atau password tidak cocok.");
  state.session = { userId: user.id, at: new Date().toISOString() };
  saveState();
  activeView = user.role === "kasir" ? "pos" : "dashboard";
  showApp();
}

function logout() {
  state.session = null;
  saveState();
  cart = [];
  showLogin();
}

function showLogin() {
  document.querySelector("#loginScreen").classList.remove("hidden");
  document.querySelector("#appShell").classList.add("hidden");
}

function showApp() {
  document.querySelector("#loginScreen").classList.add("hidden");
  document.querySelector("#appShell").classList.remove("hidden");
  const user = currentUser();
  document.querySelector("#activeUser").textContent = user.name;
  document.querySelector("#activeRole").textContent = user.role.toUpperCase();
  document.querySelector("#storeNameSide").textContent = state.settings.storeName;
  renderNav();
  if (!can(activeView)) activeView = roles[user.role][0];
  switchView(activeView);
}

function renderNav() {
  const menu = document.querySelector("#navMenu");
  menu.innerHTML = navItems
    .filter(([id]) => can(id))
    .map(([id, label, short]) => `<button class="nav-button ${activeView === id ? "active" : ""}" data-view="${id}"><span>${short}</span><strong>${label}</strong></button>`)
    .join("");
  menu.querySelectorAll("button").forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.view)));
}

function switchView(view) {
  if (!can(view)) return toast("Role Anda tidak memiliki akses ke menu ini.");
  activeView = view;
  document.querySelectorAll(".view").forEach((el) => el.classList.add("hidden"));
  document.querySelector(`#${view}View`).classList.remove("hidden");
  const nav = navItems.find(([id]) => id === view);
  document.querySelector("#pageKicker").textContent = nav?.[2] || "Menu";
  document.querySelector("#pageTitle").textContent = nav?.[1] || "Qasir Modern";
  renderNav();
  renderActiveView();
}

function renderActiveView() {
  const renderers = {
    dashboard: renderDashboard,
    pos: renderPos,
    products: renderProducts,
    stock: renderStock,
    transactions: renderTransactions,
    customers: renderCustomers,
    reports: renderReports,
    users: renderUsers,
    settings: renderSettings,
  };
  renderers[activeView]?.();
}

function renderDashboard() {
  const today = todayKey();
  const txToday = successfulTransactions().filter((tx) => tx.createdAt.slice(0, 10) === today);
  const revenue = txToday.reduce((sum, tx) => sum + tx.total, 0);
  const gross = txToday.reduce((sum, tx) => sum + tx.items.reduce((itemSum, item) => itemSum + (item.price - item.cost) * item.qty, 0), 0);
  const lowStock = state.products.filter((p) => p.active && p.stock <= 10);
  const best = bestSellers(successfulTransactions()).slice(0, 5);
  document.querySelector("#dashboardView").innerHTML = `
    <div class="grid stats">
      ${stat("Penjualan hari ini", rupiah(revenue))}
      ${stat("Transaksi hari ini", txToday.length)}
      ${stat("Laba kotor hari ini", rupiah(gross))}
      ${stat("Stok menipis", lowStock.length)}
    </div>
    <div class="grid two" style="margin-top:16px">
      <section class="card card-pad">
        <div class="split"><h3>Produk terlaris</h3><button class="secondary" onclick="switchView('reports')">Lihat laporan</button></div>
        ${list(best.map((item) => `${item.name} <strong>${item.qty} terjual</strong>`), "Belum ada penjualan.")}
      </section>
      <section class="card card-pad">
        <div class="split"><h3>Stok hampir habis</h3><button class="secondary" onclick="switchView('stock')">Kelola stok</button></div>
        ${list(lowStock.map((p) => `${p.name} <strong>${p.stock} ${p.unit}</strong>`), "Semua stok aman.")}
      </section>
      <section class="card card-pad">
        <h3>Transaksi terbaru</h3>
        ${list(state.transactions.slice(-6).reverse().map((tx) => `${tx.invoice} <strong>${rupiah(tx.total)}</strong>`), "Belum ada transaksi.")}
      </section>
      <section class="card card-pad">
        <h3>Kasir aktif</h3>
        ${list(state.users.filter((u) => u.active && ["owner", "admin", "kasir"].includes(u.role)).map((u) => `${u.name} <strong>${u.role}</strong>`))}
      </section>
    </div>
  `;
}

function stat(label, value) {
  return `<section class="card stat-card"><span>${label}</span><strong>${value}</strong></section>`;
}

function list(items, empty = "Tidak ada data.") {
  if (!items.length) return `<p class="muted">${empty}</p>`;
  return `<div class="stack" style="margin-top:14px">${items.map((item) => `<div class="split">${item}</div>`).join("")}</div>`;
}

function bestSellers(transactions) {
  const map = new Map();
  transactions.forEach((tx) => tx.items.forEach((item) => {
    const current = map.get(item.productId) || { name: item.name, qty: 0, revenue: 0 };
    current.qty += item.qty;
    current.revenue += item.subtotal;
    map.set(item.productId, current);
  }));
  return [...map.values()].sort((a, b) => b.qty - a.qty);
}

function renderProducts() {
  const rows = state.products
    .filter((p) => `${p.name} ${p.sku} ${p.barcode}`.toLowerCase().includes(productQuery.toLowerCase()))
    .map((p) => `
      <tr>
        <td><strong>${p.name}</strong><br><span class="muted">${p.sku} / ${p.barcode}</span></td>
        <td>${categoryName(p.categoryId)}</td>
        <td>${rupiah(p.cost)}</td>
        <td>${rupiah(p.price)}</td>
        <td>${p.stock} ${p.unit}</td>
        <td><span class="badge ${p.active ? "" : "off"}">${p.active ? "AKTIF" : "NONAKTIF"}</span></td>
        <td class="row">
          <button class="secondary" onclick="openProductForm('${p.id}')">Edit</button>
          <button class="danger" onclick="toggleProduct('${p.id}')">${p.active ? "Nonaktifkan" : "Aktifkan"}</button>
        </td>
      </tr>`).join("");
  document.querySelector("#productsView").innerHTML = `
    <div class="toolbar">
      <input placeholder="Cari nama, SKU, atau barcode" value="${escapeHtml(productQuery)}" oninput="productQuery=this.value;renderProducts()">
      <button class="secondary" onclick="openCategoryForm()">Kategori</button>
      <button class="primary" onclick="openProductForm()">Tambah produk</button>
    </div>
    <section class="card table-wrap">
      <table>
        <thead><tr><th>Produk</th><th>Kategori</th><th>Modal</th><th>Jual</th><th>Stok</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="7" class="muted">Produk tidak ditemukan.</td></tr>`}</tbody>
      </table>
    </section>
  `;
}

function openProductForm(id = "") {
  const product = id ? productById(id) : { name: "", categoryId: state.categories[0]?.id || "", sku: "", barcode: "", cost: 0, price: 0, stock: 0, unit: "pcs", image: "", active: true };
  openDialog(`
    <header><h3>${id ? "Edit produk" : "Tambah produk"}</h3></header>
    <form id="productForm" class="card-pad stack">
      <div class="form-grid">
        ${input("name", "Nama produk", product.name)}
        <label>Kategori<select name="categoryId">${state.categories.map((c) => `<option value="${c.id}" ${c.id === product.categoryId ? "selected" : ""}>${c.name}</option>`).join("")}</select></label>
        ${input("sku", "SKU", product.sku)}
        ${input("barcode", "Barcode", product.barcode)}
        ${input("cost", "Harga modal", product.cost, "number")}
        ${input("price", "Harga jual", product.price, "number")}
        ${input("stock", "Stok", product.stock, "number")}
        ${input("unit", "Satuan", product.unit)}
        ${input("image", "URL foto produk", product.image)}
        <label>Status<select name="active"><option value="true" ${product.active ? "selected" : ""}>Aktif</option><option value="false" ${!product.active ? "selected" : ""}>Nonaktif</option></select></label>
      </div>
    </form>
    <footer><button class="ghost" onclick="closeDialog()">Batal</button><button class="primary" onclick="saveProduct('${id}')">Simpan</button></footer>
  `);
}

function saveProduct(id) {
  const form = new FormData(document.querySelector("#productForm"));
  const data = Object.fromEntries(form.entries());
  if (!data.name || !data.categoryId) return toast("Nama dan kategori wajib diisi.");
  const product = {
    id: id || uid("p"),
    name: data.name,
    categoryId: data.categoryId,
    sku: data.sku,
    barcode: data.barcode,
    cost: Number(data.cost),
    price: Number(data.price),
    stock: Number(data.stock),
    unit: data.unit || "pcs",
    image: data.image,
    active: data.active === "true",
  };
  if (id) state.products = state.products.map((p) => (p.id === id ? product : p));
  else state.products.push(product);
  saveState();
  closeDialog();
  renderProducts();
  toast("Produk tersimpan.");
}

function toggleProduct(id) {
  const product = productById(id);
  product.active = !product.active;
  saveState();
  renderProducts();
}

function openCategoryForm() {
  openDialog(`
    <header><h3>Kategori produk</h3></header>
    <div class="card-pad stack">
      ${state.categories.map((cat) => `<div class="split"><strong>${cat.name}</strong><button class="danger" onclick="deleteCategory('${cat.id}')">Hapus</button></div>`).join("")}
      <div class="row"><input id="newCategory" placeholder="Nama kategori baru"><button class="primary" onclick="addCategory()">Tambah</button></div>
    </div>
    <footer><button class="ghost" onclick="closeDialog()">Selesai</button></footer>
  `);
}

function addCategory() {
  const inputEl = document.querySelector("#newCategory");
  const name = inputEl.value.trim();
  if (!name) return;
  state.categories.push({ id: uid("c"), name });
  saveState();
  openCategoryForm();
}

function deleteCategory(id) {
  if (state.products.some((p) => p.categoryId === id)) return toast("Kategori masih dipakai produk.");
  state.categories = state.categories.filter((cat) => cat.id !== id);
  saveState();
  openCategoryForm();
}

function renderPos() {
  const products = state.products.filter((p) => {
    const haystack = `${p.name} ${p.barcode} ${p.sku} ${categoryName(p.categoryId)}`.toLowerCase();
    return p.active && p.stock > 0 && haystack.includes(productQuery.toLowerCase());
  });
  document.querySelector("#posView").innerHTML = `
    <div class="grid pos-grid">
      <section>
        <div class="toolbar">
          <input placeholder="Cari produk atau scan barcode" value="${escapeHtml(productQuery)}" oninput="productQuery=this.value;renderPos()" autofocus>
          <select onchange="productQuery=this.value;renderPos()"><option value="">Semua kategori</option>${state.categories.map((c) => `<option value="${c.name}">${c.name}</option>`).join("")}</select>
          <button class="secondary" onclick="productQuery='';renderPos()">Reset</button>
        </div>
        <div class="product-grid">
          ${products.map(productTile).join("") || `<p class="muted">Produk tidak ditemukan atau stok kosong.</p>`}
        </div>
      </section>
      <aside class="card card-pad cart">
        <div class="split"><h3>Keranjang</h3><button class="ghost" onclick="clearCart()">Kosongkan</button></div>
        <div class="cart-items" style="margin:14px 0">${cart.map(cartItem).join("") || `<p class="muted">Klik produk untuk mulai transaksi.</p>`}</div>
        ${checkoutPanel()}
      </aside>
    </div>
  `;
}

function productTile(p) {
  const initials = p.name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase();
  return `
    <button class="product-tile" onclick="addToCart('${p.id}')">
      <div class="product-thumb">${p.image ? `<img alt="${escapeHtml(p.name)}" src="${escapeHtml(p.image)}">` : initials}</div>
      <strong>${p.name}</strong>
      <span class="muted">${categoryName(p.categoryId)} - stok ${p.stock}</span>
      <strong>${rupiah(p.price)}</strong>
    </button>
  `;
}

function cartItem(item) {
  return `
    <div class="cart-item">
      <div class="split"><strong>${item.name}</strong><span>${rupiah(item.price * item.qty)}</span></div>
      <div class="qty-control">
        <button onclick="changeQty('${item.productId}',-1)">-</button>
        <strong>${item.qty}</strong>
        <button onclick="changeQty('${item.productId}',1)">+</button>
        <button onclick="removeCartItem('${item.productId}')">Hapus</button>
      </div>
    </div>
  `;
}

function checkoutPanel() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = Number(document.querySelector("#discountInput")?.value || 0);
  const tax = Math.round((subtotal - discount) * (state.settings.taxRate / 100));
  const total = Math.max(0, subtotal - discount + tax);
  return `
    <div class="stack">
      <label>Pelanggan<select id="customerSelect">${state.customers.map((c) => `<option value="${c.id}">${c.name}</option>`).join("")}</select></label>
      <div class="form-grid">
        <label>Diskon transaksi<input id="discountInput" type="number" value="${discount}" oninput="renderPos()"></label>
        <label>Pembayaran<select id="paymentMethod"><option>Tunai</option><option>Transfer Bank</option><option>QRIS</option><option>E-wallet</option><option>Piutang</option></select></label>
      </div>
      <label>Jumlah bayar<input id="paidInput" type="number" value="${total}" oninput="updateChange()"></label>
      <div class="totals">
        <div><span>Subtotal</span><strong>${rupiah(subtotal)}</strong></div>
        <div><span>Diskon</span><strong>${rupiah(discount)}</strong></div>
        <div><span>PPN ${state.settings.taxRate}%</span><strong>${rupiah(tax)}</strong></div>
        <div class="grand"><span>Total</span><strong>${rupiah(total)}</strong></div>
        <div><span>Kembalian</span><strong id="changeValue">${rupiah(Math.max(0, total - total))}</strong></div>
      </div>
      <button class="primary full" onclick="createTransaction()">Bayar dan simpan</button>
    </div>
  `;
}

function updateChange() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = Number(document.querySelector("#discountInput")?.value || 0);
  const tax = Math.round((subtotal - discount) * (state.settings.taxRate / 100));
  const total = Math.max(0, subtotal - discount + tax);
  const paid = Number(document.querySelector("#paidInput")?.value || 0);
  document.querySelector("#changeValue").textContent = rupiah(Math.max(0, paid - total));
}

function addToCart(id) {
  const product = productById(id);
  const item = cart.find((entry) => entry.productId === id);
  if (item) {
    if (item.qty >= product.stock) return toast("Stok produk tidak cukup.");
    item.qty += 1;
  } else {
    cart.push({ productId: product.id, name: product.name, cost: product.cost, price: product.price, qty: 1 });
  }
  renderPos();
}

function changeQty(id, delta) {
  const item = cart.find((entry) => entry.productId === id);
  const product = productById(id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeCartItem(id);
  else if (item.qty > product.stock) {
    item.qty = product.stock;
    toast("Jumlah disesuaikan dengan stok.");
  }
  renderPos();
}

function removeCartItem(id) {
  cart = cart.filter((item) => item.productId !== id);
  renderPos();
}

function clearCart() {
  cart = [];
  renderPos();
}

function createTransaction() {
  if (!cart.length) return toast("Keranjang masih kosong.");
  for (const item of cart) {
    const product = productById(item.productId);
    if (!product || product.stock < item.qty) return toast(`Stok ${item.name} tidak cukup.`);
  }
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = Number(document.querySelector("#discountInput")?.value || 0);
  const tax = Math.round((subtotal - discount) * (state.settings.taxRate / 100));
  const total = Math.max(0, subtotal - discount + tax);
  const paid = Number(document.querySelector("#paidInput")?.value || 0);
  const method = document.querySelector("#paymentMethod").value;
  if (method !== "Piutang" && paid < total) return toast("Jumlah bayar kurang dari total.");
  const invoice = nextInvoice();
  const tx = {
    id: uid("t"),
    invoice,
    cashierId: currentUser().id,
    cashierName: currentUser().name,
    customerId: document.querySelector("#customerSelect").value,
    customerName: state.customers.find((c) => c.id === document.querySelector("#customerSelect").value)?.name || "Umum",
    items: cart.map((item) => ({ ...item, subtotal: item.price * item.qty })),
    subtotal,
    discount,
    tax,
    total,
    paid,
    change: Math.max(0, paid - total),
    method,
    status: "SUCCESS",
    createdAt: new Date().toISOString(),
  };
  tx.items.forEach((item) => {
    const product = productById(item.productId);
    product.stock -= item.qty;
    state.stockMovements.push({ id: uid("s"), productId: product.id, productName: product.name, type: "OUT", qty: item.qty, source: invoice, createdAt: tx.createdAt });
  });
  state.transactions.push(tx);
  saveState();
  cart = [];
  toast("Transaksi berhasil disimpan.");
  openReceipt(tx.id);
  renderActiveView();
}

function nextInvoice() {
  const date = new Date();
  const key = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const count = state.transactions.filter((tx) => tx.invoice.includes(key)).length + 1;
  return `${state.settings.invoicePrefix}-${key}-${String(count).padStart(4, "0")}`;
}

function renderTransactions() {
  const filtered = state.transactions
    .filter((tx) => `${tx.invoice} ${tx.cashierName} ${tx.method} ${tx.status}`.toLowerCase().includes(txQuery.toLowerCase()))
    .slice()
    .reverse();
  document.querySelector("#transactionsView").innerHTML = `
    <div class="toolbar">
      <input placeholder="Cari invoice, kasir, pembayaran, status" value="${escapeHtml(txQuery)}" oninput="txQuery=this.value;renderTransactions()">
      <button class="secondary" onclick="txQuery='';renderTransactions()">Reset</button>
      <button class="primary" onclick="exportCsv()">Export CSV</button>
    </div>
    <section class="card table-wrap">
      <table>
        <thead><tr><th>Invoice</th><th>Tanggal</th><th>Kasir</th><th>Pelanggan</th><th>Pembayaran</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${filtered.map(txRow).join("") || `<tr><td colspan="8" class="muted">Transaksi belum ada.</td></tr>`}</tbody>
      </table>
    </section>
  `;
}

function txRow(tx) {
  return `
    <tr>
      <td><strong>${tx.invoice}</strong></td>
      <td>${new Date(tx.createdAt).toLocaleString("id-ID")}</td>
      <td>${tx.cashierName}</td>
      <td>${tx.customerName}</td>
      <td>${tx.method}</td>
      <td>${rupiah(tx.total)}</td>
      <td><span class="badge ${tx.status === "SUCCESS" ? "" : "danger"}">${tx.status}</span></td>
      <td class="row">
        <button class="secondary" onclick="openReceipt('${tx.id}')">Struk</button>
        ${tx.status === "SUCCESS" && ["owner", "admin"].includes(currentUser().role) ? `<button class="danger" onclick="refundTransaction('${tx.id}')">Refund</button>` : ""}
      </td>
    </tr>
  `;
}

function refundTransaction(id) {
  const tx = state.transactions.find((item) => item.id === id);
  if (!tx || tx.status !== "SUCCESS") return toast("Transaksi tidak bisa direfund.");
  tx.status = "REFUNDED";
  tx.items.forEach((item) => {
    const product = productById(item.productId);
    if (product) {
      product.stock += item.qty;
      state.stockMovements.push({ id: uid("s"), productId: product.id, productName: product.name, type: "IN", qty: item.qty, source: `Refund ${tx.invoice}`, createdAt: new Date().toISOString() });
    }
  });
  saveState();
  renderTransactions();
  toast("Transaksi direfund dan stok dikembalikan.");
}

function openReceipt(id) {
  const tx = state.transactions.find((item) => item.id === id);
  if (!tx) return;
  const receipt = receiptHtml(tx);
  openDialog(`
    <header><h3>Struk ${tx.invoice}</h3></header>
    <div id="printArea">${receipt}</div>
    <footer>
      <button class="secondary" onclick="sendWhatsapp('${tx.id}')">WhatsApp</button>
      <button class="secondary" onclick="window.print()">Cetak</button>
      <button class="ghost" onclick="closeDialog()">Tutup</button>
    </footer>
  `);
}

function receiptHtml(tx) {
  return `
    <div class="receipt">
      <h3>${state.settings.storeName}</h3>
      <div style="text-align:center">${state.settings.address}<br>${state.settings.phone}</div>
      <div class="line"></div>
      <div>No: ${tx.invoice}</div>
      <div>Tgl: ${new Date(tx.createdAt).toLocaleString("id-ID")}</div>
      <div>Kasir: ${tx.cashierName}</div>
      <div>Pelanggan: ${tx.customerName}</div>
      <div class="line"></div>
      ${tx.items.map((item) => `<div>${item.name}<br>${item.qty} x ${rupiah(item.price)} <span style="float:right">${rupiah(item.subtotal)}</span></div>`).join("")}
      <div class="line"></div>
      <div>Subtotal <span style="float:right">${rupiah(tx.subtotal)}</span></div>
      <div>Diskon <span style="float:right">${rupiah(tx.discount)}</span></div>
      <div>Pajak <span style="float:right">${rupiah(tx.tax)}</span></div>
      <div><strong>Total <span style="float:right">${rupiah(tx.total)}</span></strong></div>
      <div>Bayar <span style="float:right">${rupiah(tx.paid)}</span></div>
      <div>Kembali <span style="float:right">${rupiah(tx.change)}</span></div>
      <div>Metode: ${tx.method}</div>
      <div class="line"></div>
      <div style="text-align:center">${state.settings.footer}</div>
    </div>
  `;
}

function sendWhatsapp(id) {
  const tx = state.transactions.find((item) => item.id === id);
  const text = encodeURIComponent(`${state.settings.storeName}\n${tx.invoice}\nTotal: ${rupiah(tx.total)}\n${state.settings.footer}`);
  window.open(`https://wa.me/?text=${text}`, "_blank");
}

function renderStock() {
  document.querySelector("#stockView").innerHTML = `
    <div class="split" style="margin-bottom:14px">
      <p class="muted">Catat stok masuk, stok keluar, dan penyesuaian stok.</p>
      <button class="primary" onclick="openStockForm()">Tambah pergerakan stok</button>
    </div>
    <div class="grid two">
      <section class="card table-wrap">
        <table><thead><tr><th>Produk</th><th>Stok</th><th>Status</th></tr></thead>
        <tbody>${state.products.map((p) => `<tr><td>${p.name}</td><td>${p.stock} ${p.unit}</td><td><span class="badge ${p.stock <= 10 ? "warn" : ""}">${p.stock <= 10 ? "MENIPIS" : "AMAN"}</span></td></tr>`).join("")}</tbody></table>
      </section>
      <section class="card table-wrap">
        <table><thead><tr><th>Waktu</th><th>Produk</th><th>Tipe</th><th>Qty</th><th>Sumber</th></tr></thead>
        <tbody>${state.stockMovements.slice().reverse().map((m) => `<tr><td>${new Date(m.createdAt).toLocaleString("id-ID")}</td><td>${m.productName}</td><td>${m.type}</td><td>${m.qty}</td><td>${m.source}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">Belum ada pergerakan stok.</td></tr>`}</tbody></table>
      </section>
    </div>
  `;
}

function openStockForm() {
  openDialog(`
    <header><h3>Pergerakan stok</h3></header>
    <form id="stockForm" class="card-pad stack">
      <label>Produk<select name="productId">${state.products.map((p) => `<option value="${p.id}">${p.name} - stok ${p.stock}</option>`).join("")}</select></label>
      <div class="form-grid">
        <label>Tipe<select name="type"><option value="IN">Stok Masuk</option><option value="OUT">Stok Keluar</option><option value="ADJUST">Penyesuaian</option></select></label>
        ${input("qty", "Jumlah", 1, "number")}
      </div>
      ${input("source", "Catatan", "Manual")}
    </form>
    <footer><button class="ghost" onclick="closeDialog()">Batal</button><button class="primary" onclick="saveStockMovement()">Simpan</button></footer>
  `);
}

function saveStockMovement() {
  const data = Object.fromEntries(new FormData(document.querySelector("#stockForm")).entries());
  const product = productById(data.productId);
  const qty = Number(data.qty);
  if (!product || qty <= 0) return toast("Data stok tidak valid.");
  if (data.type === "IN") product.stock += qty;
  if (data.type === "OUT") product.stock = Math.max(0, product.stock - qty);
  if (data.type === "ADJUST") product.stock = qty;
  state.stockMovements.push({ id: uid("s"), productId: product.id, productName: product.name, type: data.type, qty, source: data.source || "Manual", createdAt: new Date().toISOString() });
  saveState();
  closeDialog();
  renderStock();
}

function renderReports() {
  const txs = successfulTransactions();
  const revenue = txs.reduce((sum, tx) => sum + tx.total, 0);
  const capital = txs.reduce((sum, tx) => sum + tx.items.reduce((total, item) => total + item.cost * item.qty, 0), 0);
  const byMethod = groupBy(txs, "method");
  const best = bestSellers(txs);
  document.querySelector("#reportsView").innerHTML = `
    <div class="grid stats">
      ${stat("Total omzet", rupiah(revenue))}
      ${stat("Total modal", rupiah(capital))}
      ${stat("Laba kotor", rupiah(revenue - capital))}
      ${stat("Transaksi sukses", txs.length)}
    </div>
    <div class="grid two" style="margin-top:16px">
      <section class="card card-pad"><h3>Produk terlaris</h3>${list(best.map((item) => `${item.name} <strong>${item.qty} item - ${rupiah(item.revenue)}</strong>`), "Belum ada data.")}</section>
      <section class="card card-pad"><h3>Metode pembayaran</h3>${list(Object.entries(byMethod).map(([method, count]) => `${method} <strong>${count} transaksi</strong>`), "Belum ada data.")}</section>
      <section class="card card-pad"><h3>Laporan 7 hari terakhir</h3>${list(lastDays(7).map((day) => `${day.label} <strong>${rupiah(day.total)}</strong>`))}</section>
      <section class="card card-pad"><h3>Kasir terbanyak</h3>${list(Object.entries(groupBy(txs, "cashierName")).map(([name, count]) => `${name} <strong>${count} transaksi</strong>`), "Belum ada data.")}</section>
    </div>
  `;
}

function groupBy(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}

function lastDays(count) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (count - 1 - i));
    const key = todayKey(d);
    const total = successfulTransactions().filter((tx) => tx.createdAt.slice(0, 10) === key).reduce((sum, tx) => sum + tx.total, 0);
    return { label: d.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short" }), total };
  });
}

function renderCustomers() {
  document.querySelector("#customersView").innerHTML = `
    <div class="split" style="margin-bottom:14px"><p class="muted">Simpan pelanggan tetap, nomor WhatsApp, dan poin loyalty.</p><button class="primary" onclick="openCustomerForm()">Tambah pelanggan</button></div>
    <section class="card table-wrap"><table><thead><tr><th>Nama</th><th>HP</th><th>Poin</th><th>Total transaksi</th><th>Aksi</th></tr></thead>
    <tbody>${state.customers.map((c) => `<tr><td>${c.name}</td><td>${c.phone || "-"}</td><td>${c.points}</td><td>${state.transactions.filter((tx) => tx.customerId === c.id).length}</td><td><button class="secondary" onclick="openCustomerForm('${c.id}')">Edit</button></td></tr>`).join("")}</tbody></table></section>
  `;
}

function openCustomerForm(id = "") {
  const c = id ? state.customers.find((item) => item.id === id) : { name: "", phone: "", points: 0 };
  openDialog(`
    <header><h3>${id ? "Edit pelanggan" : "Tambah pelanggan"}</h3></header>
    <form id="customerForm" class="card-pad stack">${input("name", "Nama", c.name)}${input("phone", "Nomor HP", c.phone)}${input("points", "Poin", c.points, "number")}</form>
    <footer><button class="ghost" onclick="closeDialog()">Batal</button><button class="primary" onclick="saveCustomer('${id}')">Simpan</button></footer>
  `);
}

function saveCustomer(id) {
  const data = Object.fromEntries(new FormData(document.querySelector("#customerForm")).entries());
  if (!data.name) return toast("Nama pelanggan wajib diisi.");
  const customer = { id: id || uid("m"), name: data.name, phone: data.phone, points: Number(data.points) };
  if (id) state.customers = state.customers.map((c) => (c.id === id ? customer : c));
  else state.customers.push(customer);
  saveState();
  closeDialog();
  renderCustomers();
}

function renderUsers() {
  document.querySelector("#usersView").innerHTML = `
    <div class="split" style="margin-bottom:14px"><p class="muted">Kelola owner, admin, kasir, dan staff gudang.</p><button class="primary" onclick="openUserForm()">Tambah pengguna</button></div>
    <section class="card table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${state.users.map((u) => `<tr><td>${u.name}</td><td>${u.username}</td><td>${u.role}</td><td><span class="badge ${u.active ? "" : "off"}">${u.active ? "AKTIF" : "NONAKTIF"}</span></td><td><button class="secondary" onclick="openUserForm('${u.id}')">Edit</button></td></tr>`).join("")}</tbody></table></section>
  `;
}

function openUserForm(id = "") {
  const u = id ? state.users.find((item) => item.id === id) : { name: "", username: "", password: "123456", role: "kasir", active: true };
  openDialog(`
    <header><h3>${id ? "Edit pengguna" : "Tambah pengguna"}</h3></header>
    <form id="userForm" class="card-pad stack">
      <div class="form-grid">${input("name", "Nama", u.name)}${input("username", "Username", u.username)}${input("password", "Password", u.password)}
      <label>Role<select name="role">${Object.keys(roles).map((r) => `<option value="${r}" ${r === u.role ? "selected" : ""}>${r}</option>`).join("")}</select></label>
      <label>Status<select name="active"><option value="true" ${u.active ? "selected" : ""}>Aktif</option><option value="false" ${!u.active ? "selected" : ""}>Nonaktif</option></select></label></div>
    </form>
    <footer><button class="ghost" onclick="closeDialog()">Batal</button><button class="primary" onclick="saveUser('${id}')">Simpan</button></footer>
  `);
}

function saveUser(id) {
  const data = Object.fromEntries(new FormData(document.querySelector("#userForm")).entries());
  if (!data.name || !data.username || !data.password) return toast("Data pengguna belum lengkap.");
  const user = { id: id || uid("u"), name: data.name, username: data.username, password: data.password, role: data.role, active: data.active === "true" };
  if (id) state.users = state.users.map((u) => (u.id === id ? user : u));
  else state.users.push(user);
  saveState();
  closeDialog();
  renderUsers();
}

function renderSettings() {
  document.querySelector("#settingsView").innerHTML = `
    <section class="card card-pad">
      <form id="settingsForm" class="stack">
        <div class="form-grid">
          ${input("storeName", "Nama toko", state.settings.storeName)}
          ${input("phone", "Nomor WhatsApp", state.settings.phone)}
          ${input("address", "Alamat", state.settings.address)}
          ${input("invoicePrefix", "Prefix invoice", state.settings.invoicePrefix)}
          ${input("taxRate", "Pajak (%)", state.settings.taxRate, "number")}
          ${input("footer", "Footer struk", state.settings.footer)}
        </div>
        <button type="button" class="primary" onclick="saveSettings()">Simpan pengaturan</button>
      </form>
    </section>
  `;
}

function saveSettings() {
  state.settings = { ...state.settings, ...Object.fromEntries(new FormData(document.querySelector("#settingsForm")).entries()) };
  state.settings.taxRate = Number(state.settings.taxRate);
  saveState();
  showApp();
  toast("Pengaturan toko tersimpan.");
}

function openDialog(content) {
  closeDialog();
  const wrap = document.createElement("div");
  wrap.id = "dialogBackdrop";
  wrap.className = "dialog-backdrop";
  wrap.innerHTML = `<section class="dialog">${content}</section>`;
  document.body.appendChild(wrap);
}

function closeDialog() {
  document.querySelector("#dialogBackdrop")?.remove();
}

function input(name, label, value = "", type = "text") {
  return `<label>${label}<input name="${name}" type="${type}" value="${escapeHtml(String(value ?? ""))}"></label>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function exportCsv() {
  const rows = [["Invoice", "Tanggal", "Kasir", "Pelanggan", "Metode", "Total", "Status"], ...state.transactions.map((tx) => [tx.invoice, tx.createdAt, tx.cashierName, tx.customerName, tx.method, tx.total, tx.status])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "transaksi-qasir-modern.csv";
  a.click();
  URL.revokeObjectURL(url);
}

window.switchView = switchView;
window.openProductForm = openProductForm;
window.saveProduct = saveProduct;
window.toggleProduct = toggleProduct;
window.openCategoryForm = openCategoryForm;
window.addCategory = addCategory;
window.deleteCategory = deleteCategory;
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeCartItem = removeCartItem;
window.clearCart = clearCart;
window.createTransaction = createTransaction;
window.updateChange = updateChange;
window.openReceipt = openReceipt;
window.sendWhatsapp = sendWhatsapp;
window.refundTransaction = refundTransaction;
window.openStockForm = openStockForm;
window.saveStockMovement = saveStockMovement;
window.openCustomerForm = openCustomerForm;
window.saveCustomer = saveCustomer;
window.openUserForm = openUserForm;
window.saveUser = saveUser;
window.saveSettings = saveSettings;
window.closeDialog = closeDialog;
window.exportCsv = exportCsv;

init();
