window.API_URL = 'https://granja-vincwill-backend.onrender.com';

// ==================================================
// 1. CONFIGURACIÓN Y UTILIDADES
// ==================================================

// Helper para evitar crashes si un ID no existe en el HTML
function safeText(elementId, text) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = text;
  }
}

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

const PERMISOS = {
  admin: { acceso: ['*'], sidebar: ['operaciones', 'finanzas', 'admin'] },
  empleado: { acceso: ['index.html', 'granjas.html', 'login.html', 'galpones.html', 'lotes.html', 'salud.html', 'agua.html', 'seguimiento.html', 'inventarios.html'], sidebar: ['operaciones'] },
  viewer: { acceso: ['index.html', 'granjas.html', 'login.html'], sidebar: [] }
};

function getSelectedGranjaId() {
  try {
    const granja = JSON.parse(localStorage.getItem('selectedGranja'));
    if (granja && granja.id) return granja.id;
  } catch (e) { }
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
  return await res.json();
}

// --- AUTH ---
async function login(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const text = await res.text();
    if (!res.ok) {
      document.getElementById('errorMessage').textContent = JSON.parse(text).error || 'Error';
      return;
    }
    const data = JSON.parse(text);
    localStorage.setItem('token', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    window.location.href = 'granjas.html';
  } catch (error) { document.getElementById('errorMessage').textContent = 'Error de conexión.'; }
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

  const rol = currentUser.role;
  const reglas = PERMISOS[rol];
  if (reglas && !reglas.acceso.includes('*') && !reglas.acceso.includes(path)) {
    document.querySelector('main').innerHTML = `<section class="card" style="text-align: center; padding: 50px;"><h2 style="color: var(--color-peligro);">⛔ Acceso Denegado</h2><a href="index.html" class="btn btn-primario">Volver</a></section>`;
    document.querySelector('.sidebar').style.display = 'none';
    throw new Error("Acceso denegado");
  }
  if (rol === 'viewer') {
    document.querySelectorAll('.form-desplegable-container, #toggleFormBtn, .btn-peligro, .btn-primario').forEach(el => {
      if (el.tagName === 'BUTTON' || el.classList.contains('form-desplegable-container')) el.style.display = 'none';
    });
  }
}

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
  safeText('userInitials', nombre.charAt(0).toUpperCase());
  safeText('dropdownInitials', nombre.charAt(0).toUpperCase());
  safeText('dropdownName', nombre);
  if (currentGranja) safeText('dropdownBranch', currentGranja.nombre);

  userBtn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('is-active'); });
  document.addEventListener('click', (e) => { if (!userBtn.contains(e.target)) dropdown.classList.remove('is-active'); });
  if (changeBranchBtn) changeBranchBtn.addEventListener('click', () => { localStorage.removeItem('selectedGranja'); window.location.href = 'granjas.html'; });
}

function initializeSidebar() {
  document.querySelectorAll('.nav-category-title').forEach(title => {
    title.addEventListener('click', () => {
      const target = document.querySelector(title.dataset.target);
      if (target) target.classList.toggle('is-collapsed');
    });
  });
}

function setupMobileMenu() {
  const header = document.querySelector('header');
  if (!header || document.getElementById('mobileMenuBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'mobileMenuBtn'; btn.className = 'mobile-menu-btn'; btn.innerHTML = '☰';
  header.insertBefore(btn, header.firstChild);
  btn.addEventListener('click', (e) => { e.stopPropagation(); document.querySelector('.sidebar').classList.toggle('is-mobile-open'); });
  document.addEventListener('click', (e) => {
    const sb = document.querySelector('.sidebar');
    if (sb && sb.classList.contains('is-mobile-open') && !sb.contains(e.target) && !btn.contains(e.target)) sb.classList.remove('is-mobile-open');
  });
}

// ==================================================
// 4. LÓGICA DEL DASHBOARD (DATOS, KPIs Y RENDER)
// ==================================================

let dashboardData = {};
let chartInstances = {}; // IMPORTANTE: Almacén para gráficos

async function cargarDatosDashboard() {
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  try {
    // --- AQUÍ ESTABA EL ERROR: FALTABA CARGAR LA AGENDA ---
    const [lotes, salud, costos, seguimiento, ventas, agua, inventario, agenda] = await Promise.all([
      fetch(`${API_URL}/lotes?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/salud?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/costos?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/seguimiento?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/ventas?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/agua?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/inventario?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/agenda?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse) // <--- NUEVO
    ]);

    // Guardamos todo en la variable global
    dashboardData = { lotes, salud, costos, seguimiento, ventas, agua, inventario, agenda };

    poblarFiltroLotes(lotes);
    renderizarDashboard();
    renderizarGraficos();

  } catch (error) {
    console.error('Error cargando datos dashboard:', error);
  }
}

function poblarFiltroLotes(lotes) {
  const selector = document.getElementById('dashLote');
  if (!selector) return;

  const valorPrevio = selector.value;
  selector.innerHTML = '<option value="">Todos los Lotes</option>';

  if (lotes && lotes.length > 0) {
    lotes.sort((a, b) => new Date(b.fechaIngreso) - new Date(a.fechaIngreso));
    lotes.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = `${l.loteId} (${l.estado})`;
      selector.appendChild(opt);
    });
  }
  if (valorPrevio) selector.value = valorPrevio;
}

function renderizarDashboard() {
  const { lotes, salud, costos, seguimiento, ventas, inventario } = dashboardData;
  if (!lotes) return;

  const filtroEstado = document.getElementById('dashEstado') ? document.getElementById('dashEstado').value : 'activos';
  const filtroLoteId = document.getElementById('dashLote') ? document.getElementById('dashLote').value : '';

  let lotesFiltrados = lotes || [];

  // 1. Filtrar
  if (filtroLoteId) {
    lotesFiltrados = lotesFiltrados.filter(l => l.id == filtroLoteId);
  } else {
    if (filtroEstado === 'activos') lotesFiltrados = lotesFiltrados.filter(l => l.estado === 'disponible' || l.estado === 'ocupado');
    else if (filtroEstado === 'vendido') lotesFiltrados = lotesFiltrados.filter(l => l.estado === 'vendido' || l.estado === 'archivado');
  }

  // 2. Variables Globales
  let totalCostosGlobal = 0;
  let totalIngresosGlobal = 0;
  let totalVivosGlobal = 0;
  let totalIniciadosGlobal = 0;
  let totalMuertesGlobal = 0;

  const lotesContainer = document.getElementById('lotesContainer');
  if (lotesContainer) lotesContainer.innerHTML = '';

  if (lotesFiltrados.length === 0) {
    if (lotesContainer) lotesContainer.innerHTML = '<div class="card" style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #7f8c8d;">No se encontraron lotes con los filtros seleccionados.</div>';
  }

  // 3. Procesar Lotes
  lotesFiltrados.forEach(lote => {
    const diasEdad = Math.floor((new Date() - new Date(lote.fechaIngreso)) / (1000 * 60 * 60 * 24)) || 1;
    const semanasEdad = Math.ceil(diasEdad / 7);

    const muertes = salud ? salud.filter(s => s.loteId === lote.id && s.tipo.toLowerCase() === 'mortalidad').reduce((sum, s) => sum + s.cantidad, 0) : 0;
    const iniciales = lote.cantidadInicial || lote.cantidad;
    const vivos = iniciales - muertes;

    totalVivosGlobal += vivos;
    totalIniciadosGlobal += iniciales;
    totalMuertesGlobal += muertes;

    const viabilidad = (iniciales > 0) ? ((vivos / iniciales) * 100) : 0;

    const ventasLote = ventas ? ventas.filter(v => v.loteId === lote.id) : [];
    const ingresosLote = ventasLote.reduce((sum, v) => sum + (v.peso * v.precio), 0);
    totalIngresosGlobal += ingresosLote;

    const regsLote = seguimiento ? seguimiento.filter(s => s.loteId === lote.id) : [];
    regsLote.sort((a, b) => new Date(b.fecha || b.fechaRegistro) - new Date(a.fecha || a.fechaRegistro));

    const pesoActualLb = regsLote.length > 0 ? regsLote[0].peso : lote.pesoInicial;
    const consumoTotalLote = regsLote.reduce((sum, r) => sum + (r.consumo || 0), 0);

    // --- CÁLCULO FINANCIERO (CORREGIDO PARA NO DUPLICAR) ---
    const costoInicial = lote.costoInicial || 0;

    // Excluir 'Alimentación' y 'Vacunación' de los costos directos porque los calculamos dinámicamente abajo
    const gastosDirectos = costos ? costos.filter(c =>
      c.loteId === lote.id &&
      c.categoria !== 'Alimentación' &&
      c.categoria !== 'Inventario/Compra' &&
      c.categoria !== 'Vacuna'
    ).reduce((sum, c) => sum + c.monto, 0) : 0;

    let costoAlimentoLote = 0;
    regsLote.forEach(r => {
      let precioUnitario = 0;
      if (r.Inventario && r.Inventario.costo) precioUnitario = r.Inventario.costo;
      else if (r.alimentoId && inventario) {
        const item = inventario.find(i => i.id === r.alimentoId);
        if (item) precioUnitario = item.costo;
      }
      costoAlimentoLote += (r.consumo || 0) * precioUnitario;
    });

    const saludLote = salud ? salud.filter(s => s.loteId === lote.id && (s.tipo === 'Vacunación' || s.tipo === 'Tratamiento')) : [];
    let costoSanitarioLote = 0;
    saludLote.forEach(s => {
      if (s.vacunaId && inventario) {
        const itemInv = inventario.find(i => i.id === s.vacunaId);
        if (itemInv) costoSanitarioLote += (s.cantidad * itemInv.costo);
      }
    });

    const costoTotalLote = costoInicial + gastosDirectos + costoAlimentoLote + costoSanitarioLote;
    totalCostosGlobal += costoTotalLote;

    // KPIs
    const biomasaLbs = vivos * pesoActualLb;
    const costoPorLb = biomasaLbs > 0 ? (costoTotalLote / biomasaLbs).toFixed(2) : '0.00';
    const conversion = biomasaLbs > 0 ? (consumoTotalLote / biomasaLbs).toFixed(2) : '0.00';
    const pesoKg = pesoActualLb / 2.20462;
    let epef = 0;
    if (diasEdad > 0 && parseFloat(conversion) > 0) {
      epef = ((viabilidad * pesoKg) / (diasEdad * parseFloat(conversion))) * 100;
    }

    if (lotesContainer) {
      const card = document.createElement('div');
      card.className = 'card';
      const utilidadLote = ingresosLote - costoTotalLote;
      const colorEstado = utilidadLote >= 0 ? '#27ae60' : '#e74c3c';
      card.style.borderTop = `5px solid ${colorEstado}`;
      card.style.position = 'relative';

      card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h3 style="margin:0; color:#2c3e50; font-size:1.1rem;">${lote.loteId}</h3>
                    <span class="badge" style="background:#ecf0f1; color:#555; padding:2px 6px; font-size:0.75rem;">Semana ${semanasEdad}</span>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px; margin-bottom:10px; font-size:0.9rem;">
                    <div style="background:#f8f9fa; padding:5px; text-align:center;">
                        <small style="color:#7f8c8d;">Vivos</small><br><strong>${vivos}</strong>
                    </div>
                    <div style="background:#f8f9fa; padding:5px; text-align:center;">
                        <small style="color:#7f8c8d;">Peso</small><br><strong>${parseFloat(pesoActualLb).toFixed(2)} lb</strong>
                    </div>
                </div>
                <div style="font-size:0.85rem; color:#555; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between;"><span>Inversión:</span> <span>$${(costoInicial + gastosDirectos).toFixed(0)}</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>Alimento:</span> <span>$${costoAlimentoLote.toFixed(0)}</span></div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold; color:#2c3e50; border-top:1px solid #eee; margin-top:3px;">
                        <span>TOTAL:</span> <span>$${costoTotalLote.toFixed(2)}</span>
                    </div>
                </div>
                <div style="background:${colorEstado}15; padding:8px; border-radius:4px; text-align:center; border: 1px solid ${colorEstado}30;">
                     <small style="color:${colorEstado}; font-weight:bold;">COSTO / LB</small><br>
                     <strong style="font-size:1.2rem; color:#2c3e50;">$${costoPorLb}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:10px; font-size:0.8rem; color:#7f8c8d;">
                    <div>CA: <strong>${conversion}</strong></div>
                    <div>EPEF: <strong style="color:${colorEstado}">${epef.toFixed(0)}</strong></div>
                </div>
            `;
      lotesContainer.appendChild(card);
    }
  });

  // 4. Actualizar Resumen Global
  const utilidadGlobal = totalIngresosGlobal - totalCostosGlobal;
  const mortalidadPromedio = totalIniciadosGlobal > 0 ? ((totalMuertesGlobal / totalIniciadosGlobal) * 100).toFixed(2) : '0.00';

  safeText('costosTotales', `$${totalCostosGlobal.toFixed(2)}`);
  safeText('ingresosTotales', `$${totalIngresosGlobal.toFixed(2)}`);
  safeText('rentabilidad', `$${utilidadGlobal.toFixed(2)}`);

  const rentEl = document.getElementById('rentabilidad');
  if (rentEl) rentEl.style.color = utilidadGlobal >= 0 ? '#27ae60' : '#e74c3c';

  safeText('totalVivos', totalVivosGlobal);
  safeText('mortalidadPromedio', `${mortalidadPromedio}%`);
  safeText('pesoPromedio', "-");
  safeText('conversionPromedio', "-");
}

function renderizarGraficos() {
  const { lotes, salud, costos, seguimiento, ventas, agua } = dashboardData;
  if (!lotes) return;

  mostrarCalendario(dashboardData);
  mostrarAlertasProduccion(salud);

  // GRÁFICOS (Destruir antes de crear)
  if (chartInstances['produccionChart']) chartInstances['produccionChart'].destroy();
  const ctxProd = document.getElementById('produccionChart');
  if (ctxProd && seguimiento) {
    const labels = [...new Set(seguimiento.map(reg => `Semana ${reg.semana}`))].sort((a, b) => parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]));
    const dataPeso = labels.map(label => {
      const semana = parseInt(label.split(' ')[1]);
      const pesos = seguimiento.filter(reg => reg.semana === semana).map(reg => reg.peso);
      return pesos.length ? pesos.reduce((a, b) => a + b) / pesos.length : 0;
    });
    chartInstances['produccionChart'] = new Chart(ctxProd.getContext('2d'), {
      type: 'line',
      data: { labels, datasets: [{ label: 'Peso Promedio (kg)', data: dataPeso, borderColor: 'blue', tension: 0.1 }] },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }

  if (chartInstances['costosPieChart']) chartInstances['costosPieChart'].destroy();
  const ctxCostos = document.getElementById('costosPieChart');
  if (ctxCostos && costos) {
    const categories = {};
    costos.forEach(c => { categories[c.categoria] = (categories[c.categoria] || 0) + c.monto; });
    chartInstances['costosPieChart'] = new Chart(ctxCostos.getContext('2d'), {
      type: 'pie',
      data: { labels: Object.keys(categories), datasets: [{ data: Object.values(categories), backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'] }] }
    });
  }

  if (chartInstances['ingresosCostosBarChart']) chartInstances['ingresosCostosBarChart'].destroy();
  const ctxIng = document.getElementById('ingresosCostosBarChart');
  if (ctxIng && lotes && ventas && costos) {
    const dataIngresos = {}, dataCostos = {};
    lotes.forEach(l => {
      dataIngresos[l.loteId] = ventas.filter(v => v.loteId === l.id).reduce((sum, v) => sum + (v.peso * v.precio), 0);
      dataCostos[l.loteId] = costos.filter(c => c.loteId === l.id).reduce((sum, c) => sum + c.monto, 0);
    });
    chartInstances['ingresosCostosBarChart'] = new Chart(ctxIng.getContext('2d'), {
      type: 'bar',
      data: { labels: Object.keys(dataIngresos), datasets: [{ label: 'Ingresos ($)', data: Object.values(dataIngresos), backgroundColor: '#36A2EB' }, { label: 'Costos ($)', data: Object.values(dataCostos), backgroundColor: '#FF6384' }] }
    });
  }

  if (chartInstances['aguaChart']) chartInstances['aguaChart'].destroy();
  const ctxAgua = document.getElementById('aguaChart');
  if (ctxAgua && agua) {
    const hoy = new Date(); const dataPorDia = {};
    for (let i = 6; i >= 0; i--) { const f = new Date(hoy); f.setDate(hoy.getDate() - i); dataPorDia[f.toISOString().split('T')[0]] = 0; }
    agua.forEach(r => { const f = r.fecha.split('T')[0]; if (dataPorDia[f] !== undefined) dataPorDia[f] += r.cantidad; });
    chartInstances['aguaChart'] = new Chart(ctxAgua.getContext('2d'), {
      type: 'bar',
      data: { labels: Object.keys(dataPorDia), datasets: [{ label: 'Agua (L)', data: Object.values(dataPorDia), backgroundColor: '#3498db' }] }
    });
  }
}

function mostrarCalendario(data) {
  // Verificar si la librería existe
  if (!window.flatpickr) return;

  const { agenda, salud } = data || {};
  const eventosMapa = [];

  // 1. Procesar Agenda
  if (agenda && Array.isArray(agenda)) {
    agenda.forEach(ev => {
      // Aseguramos formato YYYY-MM-DD cortando cualquier hora extra
      const fechaLimpia = String(ev.fecha).split('T')[0];
      eventosMapa.push({
        date: fechaLimpia,
        title: `AGENDA: ${ev.descripcion}`,
        tipo: 'pendiente'
      });
    });
  }

  // 2. Procesar Retiros de Salud
  if (salud && Array.isArray(salud)) {
    salud.forEach(s => {
      if (s.fechaRetiro) {
        const fechaLimpia = String(s.fechaRetiro).split('T')[0];
        eventosMapa.push({
          date: fechaLimpia,
          title: `BIOSEGURIDAD: Fin Retiro ${s.nombre}`,
          tipo: 'retiro'
        });
      }
    });
  }

  const calContainer = document.getElementById("calendario-container");
  if (calContainer) {
    calContainer.innerHTML = ''; // Limpiar previo

    flatpickr(calContainer, {
      inline: true,
      locale: "es",
      // IMPORTANTE: Quitamos 'enable' para ver todo el mes, no solo los días con eventos
      // enable: [{ from: "today", to: "today" }, ...eventosMapa.map(e => e.date)], 

      onDayCreate: function (dObj, dStr, fp, dayElem) {
        // TRUCO DE ZONA HORARIA: Construir string local manualmente
        // dayElem.dateObj es la fecha del calendario a las 00:00:00 local
        const rawDate = dayElem.dateObj;
        const year = rawDate.getFullYear();
        // getMonth() devuelve 0-11, sumamos 1 y rellenamos con 0
        const month = String(rawDate.getMonth() + 1).padStart(2, '0');
        const day = String(rawDate.getDate()).padStart(2, '0');

        const fechaCalendario = `${year}-${month}-${day}`;

        // Buscar eventos que coincidan con esta fecha exacta
        const eventosDelDia = eventosMapa.filter(e => e.date === fechaCalendario);

        if (eventosDelDia.length > 0) {
          // Limpiar clases previas por si acaso
          dayElem.classList.remove('evento-retiro', 'evento-pendiente');

          // Prioridad: Rojo (Retiro) sobre Naranja (Pendiente)
          if (eventosDelDia.some(e => e.tipo === 'retiro')) {
            dayElem.classList.add('evento-retiro');
          } else {
            dayElem.classList.add('evento-pendiente');
          }

          // Tooltip con saltos de línea
          dayElem.title = eventosDelDia.map(e => e.title).join('\n');
        }
      },
      onChange: function (selectedDates, dateStr) {
        const eventosHoy = eventosMapa.filter(e => e.date === dateStr);
        if (eventosHoy.length > 0) {
          alert(`📅 ${dateStr}:\n\n${eventosHoy.map(e => `• ${e.title}`).join('\n')}`);
        }
      }
    });

    // Inyectar Estilos CSS forzados si no existen
    if (!document.getElementById('estilos-calendario-vincwill')) {
      const style = document.createElement('style');
      style.id = 'estilos-calendario-vincwill';
      style.innerHTML = `
            /* Evento Pendiente (Agenda) - Naranja */
            .flatpickr-day.evento-pendiente { 
                background: #f39c12 !important; 
                color: white !important; 
                border-color: #f39c12 !important;
                font-weight: bold;
            }
            /* Evento Retiro (Salud) - Rojo */
            .flatpickr-day.evento-retiro { 
                background: #e74c3c !important; 
                color: white !important; 
                border-color: #e74c3c !important;
                font-weight: bold;
            }
            /* Efecto Hover */
            .flatpickr-day.evento-retiro:hover, 
            .flatpickr-day.evento-pendiente:hover { 
                transform: scale(1.1); 
                z-index: 2; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            `;
      document.head.appendChild(style);
    }
  }
}

function mostrarAlertasProduccion(salud) {
  const alertasList = document.getElementById('alertasList');
  if (alertasList && salud) {
    alertasList.innerHTML = '';
    const mortalidadAlta = salud.filter(s => s.tipo.toLowerCase() === 'mortalidad' && s.cantidad > 10);
    if (mortalidadAlta.length > 0) mortalidadAlta.forEach(s => { const li = document.createElement('li'); li.textContent = `Alerta: Alta mortalidad Lote ${s.loteId} (${s.cantidad} aves)`; alertasList.appendChild(li); });
    else alertasList.innerHTML = '<li>No hay alertas activas.</li>';
  }
}

// --- TABLA ORDEN & FILTRO ---
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

function compareCells(a, b, isAsc) {
  const clean = (val) => val.replace(/[$,]/g, '').trim();
  const valA = clean(a); const valB = clean(b);
  const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const matchA = valA.match(dateRegex); const matchB = valB.match(dateRegex);
  if (matchA && matchB) {
    const dateA = new Date(matchA[3], matchA[2] - 1, matchA[1]);
    const dateB = new Date(matchB[3], matchB[2] - 1, matchB[1]);
    return isAsc ? dateA - dateB : dateB - dateA;
  }
  if (/^[0-9.,$]+$/.test(valA) && /^[0-9.,$]+$/.test(valB)) {
    const numA = parseFloat(valA); const numB = parseFloat(valB);
    if (!isNaN(numA) && !isNaN(numB)) return isAsc ? numA - numB : numB - numA;
  }
  return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop();
  if (path === 'login.html') { const lf = document.getElementById('loginForm'); if (lf) lf.onsubmit = login; return; }
  checkAccess();
  if (path !== 'login.html' && path !== 'granjas.html') { initializeUserProfile(); initializeSidebar(); setupMobileMenu(); cargarLogoSistema(); filtrarMenuPorRol(); }

  if (path === 'index.html') {
    const granja = JSON.parse(localStorage.getItem('selectedGranja'));
    if (granja) document.querySelector('header h1').textContent = `Dashboard (${granja.nombre})`;

    // CARGAR DATOS CENTRALIZADOS
    cargarDatosDashboard();

    // Listeners de Filtros
    if (document.getElementById('dashEstado')) document.getElementById('dashEstado').addEventListener('change', renderizarDashboard);
    if (document.getElementById('dashLote')) document.getElementById('dashLote').addEventListener('change', renderizarDashboard);
    if (document.getElementById('btnRefreshDash')) document.getElementById('btnRefreshDash').addEventListener('click', cargarDatosDashboard);
  }
});
window.addEventListener('pageshow', (event) => { if (event.persisted) window.location.reload(); });