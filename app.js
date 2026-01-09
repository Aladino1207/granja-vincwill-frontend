window.API_URL = 'https://granja-vincwill-backend.onrender.com';

// ==================================================
// 1. CONFIGURACIÓN Y UTILIDADES GLOBALES
// ==================================================

// --- LOGO ---
async function cargarLogoSistema() {
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;
  try {
    const configLocal = JSON.parse(localStorage.getItem('granjaConfig'));
    const aplicarLogo = (url) => document.querySelectorAll('.app-logo-img').forEach(img => img.src = url);

    if (configLocal && configLocal.logoUrl) aplicarLogo(configLocal.logoUrl);

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/config?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const config = await res.json();
      localStorage.setItem('granjaConfig', JSON.stringify(config));
      if (config.logoUrl) aplicarLogo(config.logoUrl);
    }
  } catch (e) { console.error("Error cargando logo", e); }
}

// --- PERMISOS (RBAC) ---
const PERMISOS = {
  admin: { acceso: ['*'], sidebar: ['operaciones', 'finanzas', 'admin'] },
  empleado: {
    acceso: ['index.html', 'granjas.html', 'login.html', 'galpones.html', 'lotes.html', 'salud.html', 'agua.html', 'seguimiento.html', 'inventarios.html'],
    sidebar: ['operaciones']
  },
  viewer: { acceso: ['index.html', 'granjas.html', 'login.html'], sidebar: [] }
};

// --- AYUDAS ---
function getSelectedGranjaId() {
  try {
    const granja = JSON.parse(localStorage.getItem('selectedGranja'));
    if (granja && granja.id) return granja.id;
  } catch (e) { console.error(e); }
  const path = window.location.pathname.split('/').pop();
  if (path !== 'login.html' && path !== 'granjas.html') window.location.href = 'granjas.html';
  return null;
}

async function handleJsonResponse(res) {
  if (!res.ok) {
    if (res.status === 401) logout();
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) return null;
  return await res.json();
}

// ==================================================
// 2. AUTENTICACIÓN
// ==================================================

async function login(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorMessage = document.getElementById('errorMessage');

  if (!email || !password) { if (errorMessage) errorMessage.textContent = 'Datos incompletos.'; return; }

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const text = await res.text();
    if (!res.ok) {
      const errorData = text ? JSON.parse(text).error || text : 'Error';
      if (errorMessage) errorMessage.textContent = `Error: ${errorData}`;
      return;
    }
    const data = JSON.parse(text);
    localStorage.setItem('token', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    window.location.href = 'granjas.html';
  } catch (error) { if (errorMessage) errorMessage.textContent = 'Error de conexión.'; }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('selectedGranja');
  window.location.href = 'login.html';
}

async function checkAccess() {
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const selectedGranja = localStorage.getItem('selectedGranja');
  const path = window.location.pathname.split('/').pop() || 'index.html';

  if (path === 'login.html') return;
  if (!token || !currentUser) { logout(); return; }
  if (!selectedGranja && path !== 'granjas.html') { window.location.href = 'granjas.html'; return; }
  if ((path === 'login.html' || path === 'granjas.html') && selectedGranja) { window.location.href = 'index.html'; return; }

  // Validación Roles
  const rol = currentUser.role;
  const reglas = PERMISOS[rol];
  if (reglas && !reglas.acceso.includes('*') && !reglas.acceso.includes(path)) {
    document.querySelector('main').innerHTML = `<section class="card" style="text-align: center; padding: 50px;"><h2 style="color: var(--color-peligro);">⛔ Acceso Denegado</h2><a href="index.html" class="btn btn-primario">Volver</a></section>`;
    document.querySelector('.sidebar').style.display = 'none';
    throw new Error("Acceso denegado");
  }

  // UI Viewer
  if (rol === 'viewer') {
    document.querySelectorAll('.form-desplegable-container, #toggleFormBtn, .btn-peligro, .btn-primario').forEach(el => {
      if (el.tagName === 'BUTTON' || el.classList.contains('form-desplegable-container')) el.style.display = 'none';
    });
  }
}

// ==================================================
// 3. UI, SIDEBAR Y MENÚS
// ==================================================

function filtrarMenuPorRol() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) return;
  const reglas = PERMISOS[currentUser.role];

  if (reglas && !reglas.acceso.includes('*')) {
    document.querySelectorAll('.nav-group').forEach(grupo => {
      const titulo = grupo.querySelector('.nav-category-title');
      if (titulo) {
        const idLimpio = titulo.dataset.target.replace('#', '').replace('-links', '');
        if (!reglas.sidebar.includes(idLimpio)) grupo.style.display = 'none';
      }
    });
  }
}

function initializeUserProfile() {
  const userBtn = document.getElementById('userMenuBtn');
  const dropdown = document.getElementById('userDropdown');
  const changeBranchBtn = document.getElementById('changeBranchBtn');
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const currentGranja = JSON.parse(localStorage.getItem('selectedGranja'));

  if (!userBtn || !currentUser) return;

  const nombre = currentUser.name || 'Usuario';
  const inicial = nombre.charAt(0).toUpperCase();

  const initialsEls = [document.getElementById('userInitials'), document.getElementById('dropdownInitials')];
  initialsEls.forEach(el => { if (el) el.textContent = inicial; });

  if (document.getElementById('dropdownName')) document.getElementById('dropdownName').textContent = nombre;
  if (document.getElementById('dropdownBranch') && currentGranja) document.getElementById('dropdownBranch').textContent = currentGranja.nombre;

  userBtn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('is-active'); });
  document.addEventListener('click', (e) => { if (!userBtn.contains(e.target)) dropdown.classList.remove('is-active'); });

  if (changeBranchBtn) changeBranchBtn.addEventListener('click', () => {
    localStorage.removeItem('selectedGranja');
    window.location.href = 'granjas.html';
  });
}

function initializeSidebar() {
  document.querySelectorAll('.nav-category-title').forEach(title => {
    title.addEventListener('click', () => {
      const target = document.querySelector(title.dataset.target);
      if (target) target.classList.toggle('is-collapsed');
    });
  });

  const path = window.location.pathname.split('/').pop();
  try {
    let activeLink;
    if (path === '' || path === 'index.html') activeLink = document.querySelector(`.sidebar nav a[href="index.html"]`);
    else activeLink = document.querySelector(`.sidebar nav a[href="${path}"]`);

    if (activeLink) {
      activeLink.classList.add('active');
      const parentContainer = activeLink.closest('.nav-links-container');
      if (parentContainer) parentContainer.classList.remove('is-collapsed');
    }
  } catch (e) { }
}

function setupMobileMenu() {
  const header = document.querySelector('header');
  if (!header || document.getElementById('mobileMenuBtn')) return;

  const btn = document.createElement('button');
  btn.id = 'mobileMenuBtn'; btn.className = 'mobile-menu-btn'; btn.innerHTML = '☰';
  header.insertBefore(btn, header.firstChild);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelector('.sidebar').classList.toggle('is-mobile-open');
  });

  document.addEventListener('click', (e) => {
    const sb = document.querySelector('.sidebar');
    if (sb && sb.classList.contains('is-mobile-open') && !sb.contains(e.target) && !btn.contains(e.target)) {
      sb.classList.remove('is-mobile-open');
    }
  });
}

// ==================================================
// 4. LÓGICA DEL DASHBOARD (GRÁFICOS Y DATOS)
// ==================================================

async function actualizarDashboard() {
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  try {
    const [lotes, salud, costos, seguimiento, ventas, agua] = await Promise.all([
      fetch(`${API_URL}/lotes?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/salud?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/costos?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/seguimiento?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/ventas?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/agua?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse)
    ]);

    // --- CÁLCULOS ZOOTÉCNICOS ---
    let totalAvesInicial = 0;
    let totalMuertes = 0;
    let ultimosPesos = [];

    if (lotes) {
      lotes.forEach(lote => {
        totalAvesInicial += lote.cantidadInicial || lote.cantidad;
        const muertesLote = salud ? salud.filter(s => s.loteId === lote.id && s.tipo.toLowerCase() === 'mortalidad').reduce((sum, s) => sum + s.cantidad, 0) : 0;
        totalMuertes += muertesLote;

        // Buscar el último peso registrado para este lote
        const seguimientosLote = seguimiento ? seguimiento.filter(s => s.loteId === lote.id).sort((a, b) => b.semana - a.semana) : [];
        if (seguimientosLote.length > 0) ultimosPesos.push(seguimientosLote[0].peso);
      });
    }

    const totalVivos = lotes ? lotes.filter(l => l.estado === 'disponible').reduce((sum, l) => sum + l.cantidad, 0) : 0;
    const pesoPromedioActual = ultimosPesos.length ? (ultimosPesos.reduce((a, b) => a + b, 0) / ultimosPesos.length).toFixed(2) : 0;
    const mortalidadPromedio = (totalAvesInicial > 0) ? ((totalMuertes / totalAvesInicial) * 100).toFixed(2) : 0;

    // CA (Conversión)
    const conversiones = [];
    if (seguimiento && lotes) {
      seguimiento.forEach(reg => {
        const lote = lotes.find(l => l.id === reg.loteId);
        if (lote && reg.peso > lote.pesoInicial) {
          const pesoGanado = reg.peso - lote.pesoInicial;
          if (pesoGanado > 0) conversiones.push(reg.consumo / pesoGanado);
        }
      });
    }
    const promedioConversion = conversiones.length ? (conversiones.reduce((a, b) => a + b, 0) / conversiones.length).toFixed(2) : '0';

    // --- CÁLCULOS FINANCIEROS (AHORA INCLUYEN ALIMENTO) ---

    // A. Costos Operativos (Tabla Costos)
    const costosOperativos = costos ? costos.reduce((sum, c) => sum + c.monto, 0) : 0;

    // B. Inversión Inicial (Lotes)
    const inversionLotes = lotes ? lotes.reduce((sum, l) => sum + (l.costoInicial || 0), 0) : 0;

    // C. Costo de Alimento Consumido (Calculado al vuelo)
    // Multiplicamos la cantidad consumida por el precio del inventario en ese momento
    let costoAlimento = 0;
    if (seguimiento) {
      costoAlimento = seguimiento.reduce((sum, s) => {
        // Nota: s.consumo es la cantidad. s.Inventario.costo es el precio promedio
        const cantidad = s.consumo || 0;
        const precio = s.Inventario ? (s.Inventario.costo || 0) : 0;
        return sum + (cantidad * precio);
      }, 0);
    }

    // D. Costo Total Real
    const totalCostos = costosOperativos + inversionLotes + costoAlimento;

    // E. Ingresos
    const totalIngresos = ventas ? ventas.reduce((sum, v) => sum + (v.peso * v.precio), 0) : 0;
    const utilidadNeta = totalIngresos - totalCostos;

    // --- DOM UPDATE ---
    if (document.getElementById('totalVivos')) {
      document.getElementById('totalVivos').textContent = totalVivos;
      document.getElementById('pesoPromedio').textContent = `${pesoPromedioActual} lb`; // Ajustado a lb
      document.getElementById('conversionPromedio').textContent = promedioConversion;
      document.getElementById('mortalidadPromedio').textContent = `${mortalidadPromedio}%`;

      document.getElementById('costosTotales').textContent = `$${totalCostos.toFixed(2)}`;
      document.getElementById('ingresosTotales').textContent = `$${totalIngresos.toFixed(2)}`;

      const rentabilidadEl = document.getElementById('rentabilidad');
      rentabilidadEl.textContent = `$${utilidadNeta.toFixed(2)}`;
      rentabilidadEl.style.color = utilidadNeta >= 0 ? '#27ae60' : '#e74c3c';
    }

  } catch (error) { console.error('Error dashboard:', error); }
}

async function mostrarCalendario() {
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;
  try {
    const [agendaRes, saludRes] = await Promise.all([
      fetch(`${API_URL}/agenda?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
      fetch(`${API_URL}/salud?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    ]);
    const agendaData = await handleJsonResponse(agendaRes);
    const saludData = await handleJsonResponse(saludRes);
    const eventosMapa = [];
    if (agendaData) agendaData.forEach(ev => eventosMapa.push({ date: ev.fecha, title: `AGENDA: ${ev.descripcion}`, tipo: 'pendiente' }));
    if (saludData) saludData.forEach(s => { if (s.fechaRetiro) eventosMapa.push({ date: s.fechaRetiro.split('T')[0], title: `BIOSEGURIDAD: Fin Retiro ${s.nombre}`, tipo: 'retiro' }); });

    if (window.flatpickr) {
      flatpickr("#calendario-container", {
        inline: true, locale: "es",
        enable: [{ from: "today", to: "today" }, ...eventosMapa.map(e => e.date)],
        onDayCreate: function (dObj, dStr, fp, dayElem) {
          const fechaStr = dayElem.dateObj.toISOString().split('T')[0];
          const eventosDelDia = eventosMapa.filter(e => e.date === fechaStr);
          if (eventosDelDia.length > 0) {
            dayElem.classList.remove('evento-retiro', 'evento-pendiente');
            if (eventosDelDia.some(e => e.tipo === 'retiro')) dayElem.classList.add('evento-retiro');
            else dayElem.classList.add('evento-pendiente');
            dayElem.title = eventosDelDia.map(e => e.title).join('\n');
          }
        },
        onChange: function (selectedDates, dateStr) {
          const eventosHoy = eventosMapa.filter(e => e.date === dateStr);
          if (eventosHoy.length > 0) alert(`📅 ${dateStr}:\n\n${eventosHoy.map(e => `• ${e.title}`).join('\n')}`);
        }
      });
      // Inyección CSS
      if (!document.getElementById('estilos-calendario-vincwill')) {
        const style = document.createElement('style');
        style.id = 'estilos-calendario-vincwill';
        style.innerHTML = `
        .flatpickr-day.evento-retiro { background: #e74c3c !important; color: white !important; border: 0 !important; }
        .flatpickr-day.evento-pendiente { background: #f39c12 !important; color: white !important; border: 0 !important; }
        .flatpickr-day.evento-retiro:hover, .flatpickr-day.evento-pendiente:hover { transform: scale(1.1); z-index: 2; }`;
        document.head.appendChild(style);
      }
    }
  } catch (error) { console.error(error); }
}

async function mostrarGraficoAgua() {
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;
  try {
    const res = await fetch(`${API_URL}/agua?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    const aguaData = await handleJsonResponse(res);
    if (!aguaData) return;
    const hoy = new Date(); const dataPorDia = {};
    for (let i = 6; i >= 0; i--) {
      const f = new Date(hoy); f.setDate(hoy.getDate() - i);
      dataPorDia[f.toISOString().split('T')[0]] = 0;
    }
    aguaData.forEach(r => { const f = r.fecha.split('T')[0]; if (dataPorDia[f] !== undefined) dataPorDia[f] += r.cantidad; });
    const ctx = document.getElementById('aguaChart');
    if (ctx) new Chart(ctx.getContext('2d'), { type: 'bar', data: { labels: Object.keys(dataPorDia), datasets: [{ label: 'Agua (L)', data: Object.values(dataPorDia), backgroundColor: '#3498db' }] } });
  } catch (e) { }
}

function mostrarGraficosDashboard() {
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;
  fetch(`${API_URL}/seguimiento?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then(handleJsonResponse)
    .then(seguimiento => {
      if (!seguimiento) return;
      const labels = [...new Set(seguimiento.map(reg => `Semana ${reg.semana}`))].sort((a, b) => parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]));
      const dataPeso = labels.map(label => {
        const semana = parseInt(label.split(' ')[1]);
        const pesos = seguimiento.filter(reg => reg.semana === semana).map(reg => reg.peso);
        return pesos.length ? pesos.reduce((a, b) => a + b) / pesos.length : 0;
      });
      const ctx = document.getElementById('produccionChart');
      if (ctx) new Chart(ctx.getContext('2d'), { type: 'line', data: { labels, datasets: [{ label: 'Peso Promedio (kg)', data: dataPeso, borderColor: 'blue', tension: 0.1 }] }, options: { scales: { y: { beginAtZero: true } } } });
    })
    .catch(error => console.error('Error gráfico prod:', error));
}

function mostrarCostosPieChart() {
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;
  fetch(`${API_URL}/costos?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then(handleJsonResponse)
    .then(costos => {
      if (!costos) return;
      const categories = {};
      costos.forEach(c => { categories[c.categoria] = (categories[c.categoria] || 0) + c.monto; });
      const ctx = document.getElementById('costosPieChart');
      if (ctx) new Chart(ctx.getContext('2d'), { type: 'pie', data: { labels: Object.keys(categories), datasets: [{ data: Object.values(categories), backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'] }] } });
    });
}

function mostrarIngresosCostosBarChart() {
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;
  Promise.all([
    fetch(`${API_URL}/lotes?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
    fetch(`${API_URL}/ventas?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
    fetch(`${API_URL}/costos?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse)
  ]).then(([lotes, ventas, costos]) => {
    if (!lotes || !ventas || !costos) return;
    const dataIngresos = {}, dataCostos = {};
    lotes.forEach(l => {
      dataIngresos[l.loteId] = ventas.filter(v => v.loteId === l.id).reduce((sum, v) => sum + (v.peso * v.precio), 0);
      dataCostos[l.loteId] = costos.filter(c => c.loteId === l.id).reduce((sum, c) => sum + c.monto, 0);
    });
    const ctx = document.getElementById('ingresosCostosBarChart');
    if (ctx) new Chart(ctx.getContext('2d'), { type: 'bar', data: { labels: Object.keys(dataIngresos), datasets: [{ label: 'Ingresos ($)', data: Object.values(dataIngresos), backgroundColor: '#36A2EB' }, { label: 'Costos ($)', data: Object.values(dataCostos), backgroundColor: '#FF6384' }] } });
  });
}

function mostrarAlertasProduccion() {
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;
  fetch(`${API_URL}/salud?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then(handleJsonResponse)
    .then(salud => {
      if (!salud) return;
      const alertasList = document.getElementById('alertasList');
      if (alertasList) {
        alertasList.innerHTML = '';
        const mortalidadAlta = salud.filter(s => s.tipo.toLowerCase() === 'mortalidad' && s.cantidad > 10);
        if (mortalidadAlta.length > 0) mortalidadAlta.forEach(s => { const li = document.createElement('li'); li.textContent = `Alerta: Alta mortalidad Lote ${s.loteId} (${s.cantidad} aves)`; alertasList.appendChild(li); });
        else alertasList.innerHTML = '<li>No hay alertas.</li>';
      }
    });
}

// ==================================================
// 🔥 5. SISTEMA AUTOMÁTICO DE TABLAS (ORDENAR Y FILTRAR)
// ==================================================

// Ordenar al hacer clic en TH
document.addEventListener('click', function (e) {
  const th = e.target.closest('table.tabla-moderna th');
  if (th) {
    if (th.innerText.toLowerCase().includes('acciones') || th.classList.contains('no-sort')) return;
    const table = th.closest('table');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const index = Array.from(th.parentNode.children).indexOf(th);
    const isAsc = !th.classList.contains('asc');

    table.querySelectorAll('th').forEach(h => h.classList.remove('asc', 'desc'));
    th.classList.toggle('asc', isAsc); th.classList.toggle('desc', !isAsc);

    rows.sort((rowA, rowB) => {
      const cellA = rowA.children[index]?.innerText.trim() || '';
      const cellB = rowB.children[index]?.innerText.trim() || '';
      return compareCells(cellA, cellB, isAsc);
    });
    tbody.append(...rows);
  }
});

// Filtrar al escribir en .table-search
document.addEventListener('input', function (e) {
  if (e.target.matches('.table-search')) {
    const input = e.target;
    const tableId = input.dataset.table;
    const table = document.getElementById(tableId);
    if (table) {
      const term = input.value.toLowerCase();
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
      });
    }
  }
});

// --- FUNCIÓN CORREGIDA PARA FECHAS ESTRICTAS (DD/MM/AAAA) ---
function compareCells(a, b, isAsc) {
  const clean = (val) => val.replace(/[$,]/g, '').trim();
  const valA = clean(a); const valB = clean(b);

  // 1. DETECCIÓN MANUAL DE FECHA (DD/MM/YYYY)
  // Evitamos new Date(string) porque confunde Mes con Día
  const partsA = valA.split('/');
  const partsB = valB.split('/');

  // Si tiene 3 partes y el último parece un año (4 dígitos)
  if (partsA.length === 3 && partsB.length === 3 && partsA[2].length === 4 && partsB[2].length === 4) {
    // Convertimos a entero YYYYMMDD para comparar matemáticamente
    // Ejemplo: 25/04/2024 -> 20240425
    const numA = parseInt(partsA[2] + partsA[1].padStart(2, '0') + partsA[0].padStart(2, '0'));
    const numB = parseInt(partsB[2] + partsB[1].padStart(2, '0') + partsB[0].padStart(2, '0'));
    return isAsc ? numA - numB : numB - numA;
  }

  // 2. Números
  const numA = parseFloat(valA);
  const numB = parseFloat(valB);
  // Solo si es un número válido y NO parece una fecha
  if (!isNaN(numA) && !isNaN(numB) && /^[0-9.,$]+$/.test(valA) && /^[0-9.,$]+$/.test(valB)) {
    return isAsc ? numA - numB : numB - numA;
  }

  // 3. Texto
  return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
}

// ==================================================
// 6. INICIALIZACIÓN
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop();

  if (path === 'login.html') {
    const lf = document.getElementById('loginForm');
    if (lf) lf.onsubmit = login;
    return;
  }

  checkAccess();

  if (path !== 'login.html' && path !== 'granjas.html') {
    initializeUserProfile();
    initializeSidebar();
    setupMobileMenu();
    cargarLogoSistema();
    filtrarMenuPorRol();
  }

  if (path === 'index.html') {
    const granja = JSON.parse(localStorage.getItem('selectedGranja'));
    if (granja) document.querySelector('header h1').textContent = `Dashboard (${granja.nombre})`;
    actualizarDashboard();
    mostrarCalendario();
    mostrarGraficoAgua();
    if (typeof mostrarGraficosDashboard === 'function') mostrarGraficosDashboard();
    if (typeof mostrarCostosPieChart === 'function') mostrarCostosPieChart();
    if (typeof mostrarIngresosCostosBarChart === 'function') mostrarIngresosCostosBarChart();
    if (typeof mostrarAlertasProduccion === 'function') mostrarAlertasProduccion();
  }
});

// Fix para caché de navegador en botón atrás
window.addEventListener('pageshow', (event) => { if (event.persisted) window.location.reload(); });