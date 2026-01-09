window.API_URL = 'https://granja-vincwill-backend.onrender.com';

// --- FUNCIÓN PARA CARGAR EL LOGO ---
async function cargarLogoSistema() {
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return; // En login no hay granja seleccionada aún (ver nota abajo)

  try {
    // Intentamos leer de localStorage primero para velocidad
    const configLocal = JSON.parse(localStorage.getItem('granjaConfig'));

    // Función interna para aplicar
    const aplicarLogo = (url) => {
      const logoEls = document.querySelectorAll('.app-logo-img'); // Clase para todas las imgs de logo
      logoEls.forEach(img => {
        if (url) img.src = url;
      });
    };

    if (configLocal && configLocal.logoUrl) {
      aplicarLogo(configLocal.logoUrl);
    }

    // De todas formas validamos con el servidor (segundo plano)
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/config?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const config = await res.json();
      localStorage.setItem('granjaConfig', JSON.stringify(config)); // Guardar caché
      if (config.logoUrl) aplicarLogo(config.logoUrl);
    }
  } catch (e) { console.error("Error cargando logo", e); }
}

// ==================================================
// 1. CONFIGURACIÓN DE PERMISOS (RBAC)
// ==================================================
const PERMISOS = {
  admin: {
    acceso: ['*'], // Todo
    sidebar: ['operaciones', 'finanzas', 'admin'] // IDs de los grupos del sidebar
  },
  empleado: {
    acceso: [
      'index.html', 'granjas.html', 'login.html',
      'galpones.html', 'lotes.html', 'salud.html',
      'agua.html', 'seguimiento.html', 'inventarios.html'
    ],
    sidebar: ['operaciones'] // Solo ve operaciones
  },
  viewer: {
    acceso: ['index.html', 'granjas.html', 'login.html'],
    sidebar: [] // No ve ningún grupo (solo dashboard que está fuera de grupo)
  }
};

// ==================================================
// 2. UTILIDADES Y SEGURIDAD
// ==================================================

function getSelectedGranjaId() {
  try {
    const granja = JSON.parse(localStorage.getItem('selectedGranja'));
    if (granja && granja.id) return granja.id;
  } catch (e) { console.error(e); }

  const path = window.location.pathname.split('/').pop();
  if (path !== 'login.html' && path !== 'granjas.html') {
    window.location.href = 'granjas.html';
  }
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

async function login(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorMessage = document.getElementById('errorMessage');

  if (!email || !password) {
    if (errorMessage) errorMessage.textContent = 'Datos incompletos.';
    return;
  }
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
  } catch (error) {
    if (errorMessage) errorMessage.textContent = 'Error de conexión.';
    console.error(error);
  }
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
  const path = window.location.pathname.split('/').pop() || 'index.html'; // Default index

  if (path === 'login.html') return;

  // 1. Validación Básica
  if (!token || !currentUser) { logout(); return; }
  if (!selectedGranja && path !== 'granjas.html') { window.location.href = 'granjas.html'; return; }
  if ((path === 'login.html' || path === 'granjas.html') && selectedGranja) { window.location.href = 'index.html'; return; }

  // 2. Validación de Token con Backend
  try {
    const res = await fetch(`${API_URL}/mis-granjas`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { logout(); return; }
  } catch (error) { logout(); return; }

  // 3. VALIDACIÓN ESTRICTA DE ROLES (V 4.2)
  const rol = currentUser.role;
  const reglas = PERMISOS[rol];

  if (reglas && !reglas.acceso.includes('*')) {
    // Si no tiene acceso total (*), verificamos si la página está en su lista
    if (!reglas.acceso.includes(path)) {
      document.querySelector('main').innerHTML = `
            <section class="card" style="text-align: center; padding: 50px;">
              <h2 style="color: var(--color-peligro);">⛔ Acceso Denegado</h2>
              <p>Tu perfil de <strong>${rol.toUpperCase()}</strong> no tiene permisos para ver el módulo <em>${path}</em>.</p>
              <a href="index.html" class="btn btn-primario">Volver al Dashboard</a>
            </section>`;
      // Ocultar sidebar para que no intente navegar
      document.querySelector('.sidebar').style.display = 'none';
      throw new Error("Acceso denegado por rol"); // Detener ejecución de scripts posteriores
    }
  }

  // Permisos de Viewer específicos (UI)
  if (rol === 'viewer') {
    document.querySelectorAll('.form-desplegable-container, #toggleFormBtn, .btn-peligro, .btn-primario').forEach(el => {
      if (el.tagName === 'BUTTON' || el.classList.contains('form-desplegable-container')) el.style.display = 'none';
    });
  }
}

// ==================================================
// 3. UI & SIDEBAR
// ==================================================

function filtrarMenuPorRol() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) return;

  const rol = currentUser.role;
  const reglas = PERMISOS[rol];

  // Si es admin, ve todo. Si no, filtramos.
  if (reglas && !reglas.acceso.includes('*')) {

    // 1. Grupos del Sidebar (Operaciones, Finanzas, Admin)
    const gruposPermitidos = reglas.sidebar; // ej: ['operaciones']

    // Ocultar grupos no permitidos
    const todosLosGrupos = document.querySelectorAll('.nav-group');

    todosLosGrupos.forEach(grupo => {
      const titulo = grupo.querySelector('.nav-category-title');
      if (titulo) {
        const targetId = titulo.dataset.target; // ej: #operaciones-links
        const idLimpio = targetId.replace('#', '').replace('-links', ''); // operaciones

        if (!gruposPermitidos.includes(idLimpio)) {
          grupo.style.display = 'none'; // OCULTAR GRUPO COMPLETO
        }
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
  const nombreGranja = currentGranja ? currentGranja.nombre : 'Sin Asignar';

  if (document.getElementById('userInitials')) document.getElementById('userInitials').textContent = inicial;
  if (document.getElementById('dropdownInitials')) document.getElementById('dropdownInitials').textContent = inicial;
  if (document.getElementById('dropdownName')) document.getElementById('dropdownName').textContent = nombre;
  if (document.getElementById('dropdownBranch')) document.getElementById('dropdownBranch').textContent = nombreGranja;

  // Toggle Menú
  userBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('is-active');
  });

  // Cerrar al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!userBtn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('is-active');
    }
  });

  // Botón Cambiar Almacén
  if (changeBranchBtn) {
    changeBranchBtn.addEventListener('click', () => {
      localStorage.removeItem('selectedGranja');
      window.location.href = 'granjas.html';
    });
  }
}

function initializeSidebar() {
  document.querySelectorAll('.nav-category-title').forEach(title => {
    title.addEventListener('click', () => {
      const targetId = title.dataset.target;
      const targetContainer = document.querySelector(targetId);
      if (targetContainer) targetContainer.classList.toggle('is-collapsed');
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
  if (!header) return;

  if (!document.getElementById('mobileMenuBtn')) {
    const btn = document.createElement('button');
    btn.id = 'mobileMenuBtn';
    btn.className = 'mobile-menu-btn';
    btn.innerHTML = '☰';
    header.insertBefore(btn, header.firstChild);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) sidebar.classList.toggle('is-mobile-open');
    });

    document.addEventListener('click', (e) => {
      const sidebar = document.querySelector('.sidebar');
      const btn = document.getElementById('mobileMenuBtn');
      if (sidebar && sidebar.classList.contains('is-mobile-open')) {
        if (!sidebar.contains(e.target) && !btn.contains(e.target)) {
          sidebar.classList.remove('is-mobile-open');
        }
      }
    });
  }
}

// --- 4. DASHBOARD ---
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

    // --- 1. CÁLCULOS ZOOTÉCNICOS (Producción) ---
    let totalAvesInicial = 0;
    let totalMuertes = 0;
    let ultimosPesos = [];

    if (lotes) {
      lotes.forEach(lote => {
        // Sumamos la población inicial
        totalAvesInicial += lote.cantidadInicial || lote.cantidad;

        // Sumamos mortalidad
        const muertesLote = salud ? salud.filter(s => s.loteId === lote.id && s.tipo.toLowerCase() === 'mortalidad').reduce((sum, s) => sum + s.cantidad, 0) : 0;
        totalMuertes += muertesLote;

        // Buscamos el peso más reciente
        const seguimientosLote = seguimiento ? seguimiento.filter(s => s.loteId === lote.id).sort((a, b) => b.semana - a.semana) : [];
        if (seguimientosLote.length > 0) {
          ultimosPesos.push(seguimientosLote[0].peso);
        }
      });
    }
    const totalVivos = lotes ? lotes.filter(l => l.estado === 'disponible').reduce((sum, l) => sum + l.cantidad, 0) : 0;
    // Promedio simple de los pesos actuales de los lotes activos
    const pesoPromedioActual = ultimosPesos.length ? (ultimosPesos.reduce((a, b) => a + b, 0) / ultimosPesos.length).toFixed(2) : 0;
    const mortalidadPromedio = (totalAvesInicial > 0) ? ((totalMuertes / totalAvesInicial) * 100).toFixed(2) : 0;
    // Cálculo de Conversión Alimenticia (Global)
    const conversiones = [];
    if (seguimiento && lotes) {
      seguimiento.forEach(reg => {
        const lote = lotes.find(l => l.id === reg.loteId);
        if (lote && reg.peso > lote.pesoInicial) {
          const pesoGanado = reg.peso - lote.pesoInicial;
          if (pesoGanado > 0) {
            const conversion = reg.consumo / pesoGanado;
            conversiones.push(conversion);
          }
        }
      });
    }
    const promedioConversion = conversiones.length ? (conversiones.reduce((a, b) => a + b, 0) / conversiones.length).toFixed(2) : '0';

    // --- 2. CÁLCULOS FINANCIEROS (Dinero) ---
    // A. Costos Operativos (Registrados en módulo Costos + Automáticos de Alimento/Vacunas)
    const costosOperativos = costos ? costos.reduce((sum, c) => sum + c.monto, 0) : 0;

    // B. Inversión en Lotes (Compra de Pollitos - NUEVO)
    // Sumamos el 'costoInicial' de todos los lotes cargados
    const inversionLotes = lotes ? lotes.reduce((sum, l) => sum + (l.costoInicial || 0), 0) : 0;
    // C. Costo Total Real
    const totalCostos = costosOperativos + inversionLotes;
    // D. Ingresos
    const totalIngresos = ventas ? ventas.reduce((sum, v) => sum + (v.peso * v.precio), 0) : 0;
    // E. Rentabilidad
    const utilidadNeta = totalIngresos - totalCostos;
    // --- 3. ACTUALIZACIÓN DEL DOM ---
    if (document.getElementById('totalVivos')) {
      document.getElementById('totalVivos').textContent = totalVivos;
      document.getElementById('pesoPromedio').textContent = `${pesoPromedioActual} kg`;
      document.getElementById('conversionPromedio').textContent = promedioConversion;
      document.getElementById('mortalidadPromedio').textContent = `${mortalidadPromedio}%`;

      // Financieros
      document.getElementById('costosTotales').textContent = `$${totalCostos.toFixed(2)}`;
      document.getElementById('ingresosTotales').textContent = `$${totalIngresos.toFixed(2)}`;

      // Color para rentabilidad (Verde si ganas, Rojo si pierdes)
      const rentabilidadEl = document.getElementById('rentabilidad');
      rentabilidadEl.textContent = `$${utilidadNeta.toFixed(2)}`;
      rentabilidadEl.style.color = utilidadNeta >= 0 ? '#27ae60' : '#e74c3c';
      rentabilidadEl.style.fontWeight = 'bold';
    }

  } catch (error) {
    console.error('Error al actualizar dashboard:', error);
  }
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
        inline: true,
        locale: "es",
        enable: [{ from: "today", to: "today" }, ...eventosMapa.map(e => e.date)],
        onDayCreate: function (dObj, dStr, fp, dayElem) {
          const fechaStr = dayElem.dateObj.toISOString().split('T')[0];
          const eventosDelDia = eventosMapa.filter(e => e.date === fechaStr);

          if (eventosDelDia.length > 0) {
            // Limpiamos clases previas
            dayElem.classList.remove('evento-retiro', 'evento-pendiente');

            if (eventosDelDia.some(e => e.tipo === 'retiro')) {
              dayElem.classList.add('evento-retiro');
            } else {
              dayElem.classList.add('evento-pendiente');
            }
            dayElem.title = eventosDelDia.map(e => e.title).join('\n');
          }
        },
        onChange: function (selectedDates, dateStr) {
          const eventosHoy = eventosMapa.filter(e => e.date === dateStr);
          if (eventosHoy.length > 0) alert(`📅 ${dateStr}:\n\n${eventosHoy.map(e => `• ${e.title}`).join('\n')}`);
        }
      });
      // INYECCIÓN CSS REFORZADA
      if (!document.getElementById('estilos-calendario-vincwill')) {
        const style = document.createElement('style');
        style.id = 'estilos-calendario-vincwill';
        style.innerHTML = `
        /* Estilo Base para días con evento */
        .flatpickr-day.evento-retiro, 
        .flatpickr-day.evento-pendiente {
            color: white !important;
            border: 0 !important;
            font-weight: bold;
        }
        
        /* ROJO: Retiros de Bioseguridad */
        .flatpickr-day.evento-retiro {
            background: #e74c3c !important; 
            box-shadow: inset 0 0 0 2px #c0392b !important;
        }
        
        /* NARANJA: Agenda Manual */
        .flatpickr-day.evento-pendiente {
            background: #f39c12 !important;
        }
        
        /* HOVER: Que se note al pasar el mouse */
        .flatpickr-day.evento-retiro:hover,
        .flatpickr-day.evento-pendiente:hover {
            opacity: 0.8;
            transform: scale(1.1);
            z-index: 2;
        }`;
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
      if (ctx) {
        new Chart(ctx.getContext('2d'), {
          type: 'line',
          data: { labels, datasets: [{ label: 'Peso Promedio (kg)', data: dataPeso, borderColor: 'blue', tension: 0.1 }] },
          options: { scales: { y: { beginAtZero: true } } }
        });
      }
    })
    .catch(error => console.error('Error en gráfico de seguimiento:', error));
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
      const labels = Object.keys(categories);
      const data = Object.values(categories);
      const ctx = document.getElementById('costosPieChart');
      if (ctx) {
        new Chart(ctx.getContext('2d'), {
          type: 'pie',
          data: { labels, datasets: [{ data, backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'] }] },
          options: { responsive: true }
        });
      }
    })
    .catch(error => console.error('Error en gráfico de costos:', error));
}

function mostrarIngresosCostosBarChart() {
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;
  Promise.all([
    fetch(`${API_URL}/lotes?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
    fetch(`${API_URL}/ventas?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
    fetch(`${API_URL}/costos?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse)
  ])
    .then(([lotes, ventas, costos]) => {
      if (!lotes || !ventas || !costos) return;
      const dataIngresos = {}, dataCostos = {};
      lotes.forEach(l => {
        dataIngresos[l.loteId] = ventas.filter(v => v.loteId === l.id).reduce((sum, v) => sum + (v.peso * v.precio), 0);
        dataCostos[l.loteId] = costos.filter(c => c.loteId === l.id).reduce((sum, c) => sum + c.monto, 0);
      });
      const labels = Object.keys(dataIngresos);
      const ingresosData = Object.values(dataIngresos);
      const costosData = Object.values(dataCostos);
      const ctx = document.getElementById('ingresosCostosBarChart');
      if (ctx) {
        new Chart(ctx.getContext('2d'), {
          type: 'bar',
          data: {
            labels, datasets: [
              { label: 'Ingresos ($)', data: ingresosData, backgroundColor: '#36A2EB' },
              { label: 'Costos ($)', data: costosData, backgroundColor: '#FF6384' }
            ]
          },
          options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
      }
    })
    .catch(error => console.error('Error en gráfico de ingresos/costos:', error));
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
        if (mortalidadAlta.length > 0) {
          mortalidadAlta.forEach(s => {
            const li = document.createElement('li');
            li.textContent = `Alerta: Alta mortalidad Lote ${s.loteId} (${s.cantidad} aves, ${new Date(s.fecha).toLocaleDateString()})`;
            alertasList.appendChild(li);
          });
        } else {
          alertasList.innerHTML = '<li>No hay alertas de mortalidad.</li>';
        }
      }
    })
    .catch(error => console.error('Error en alertas:', error));
}


// --- 5. INICIALIZACIÓN PRINCIPAL ---

// --- INICIALIZACIÓN PRINCIPAL (app.js) ---
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop();

  if (path === 'login.html') {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.onsubmit = login;
    return;
  }

  checkAccess(); // Valida permisos y redirige si no tiene acceso

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
    // Llamar al resto de gráficos
    if (typeof mostrarGraficosDashboard === 'function') mostrarGraficosDashboard();
    if (typeof mostrarCostosPieChart === 'function') mostrarCostosPieChart();
    if (typeof mostrarIngresosCostosBarChart === 'function') mostrarIngresosCostosBarChart();
    if (typeof mostrarAlertasProduccion === 'function') mostrarAlertasProduccion();
  }
});

function enableTableLogic(tableId, searchInputId = null) {
  const table = document.getElementById(tableId);
  if (!table) return;

  // 1. LÓGICA DE ORDENAMIENTO
  const headers = table.querySelectorAll('th');
  const tbody = table.querySelector('tbody');

  headers.forEach((header, index) => {
    // Ignorar columna Acciones o las marcadas como no-sort
    if (header.innerText.toLowerCase().includes('acciones') || header.classList.contains('no-sort')) {
      header.classList.add('no-sort');
      return;
    }

    header.classList.add('sortable');

    header.addEventListener('click', () => {
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const isAsc = !header.classList.contains('asc');

      // Limpiar clases de otros headers
      headers.forEach(h => h.classList.remove('asc', 'desc'));
      header.classList.toggle('asc', isAsc);
      header.classList.toggle('desc', !isAsc);

      rows.sort((rowA, rowB) => {
        const cellA = rowA.children[index].innerText.trim();
        const cellB = rowB.children[index].innerText.trim();

        return compareCells(cellA, cellB, isAsc);
      });

      // Re-inyectar filas ordenadas
      tbody.append(...rows);
    });
  });

  // 2. LÓGICA DE BÚSQUEDA (FILTRO)
  if (searchInputId) {
    const input = document.getElementById(searchInputId);
    if (input) {
      input.addEventListener('keyup', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = tbody.querySelectorAll('tr');

        rows.forEach(row => {
          // Unimos todo el texto de la fila para buscar
          const text = row.innerText.toLowerCase();
          row.style.display = text.includes(term) ? '' : 'none';
        });
      });
    }
  }
}

/**
 * Compara dos valores inteligentemente (Moneda, Fecha, Número o Texto)
 */
function compareCells(a, b, isAsc) {
  // 1. Limpieza de datos (Quitar $, comas, espacios extra)
  const clean = (val) => val.replace(/[$,]/g, '').trim();

  const valA = clean(a);
  const valB = clean(b);

  // 2. Intentar como Número
  const numA = parseFloat(valA);
  const numB = parseFloat(valB);

  if (!isNaN(numA) && !isNaN(numB)) {
    return isAsc ? numA - numB : numB - numA;
  }

  // 3. Intentar como Fecha (Formato esperado dd/mm/yyyy o yyyy-mm-dd)
  // Simple detección: contiene '/' o '-'
  const dateA = new Date(valA);
  const dateB = new Date(valB);

  if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime()) && (valA.includes('/') || valA.includes('-'))) {
    return isAsc ? dateA - dateB : dateB - dateA;
  }

  // 4. Fallback: Texto normal
  return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
}

window.addEventListener('pageshow', (event) => { if (event.persisted) window.location.reload(); });