window.API_URL = 'https://granja-vincwill-backend.onrender.com';

// --- 1. UTILIDADES GLOBALES ---

function getSelectedGranjaId() {
  try {
    const granja = JSON.parse(localStorage.getItem('selectedGranja'));
    if (granja && granja.id) {
      return granja.id;
    }
  } catch (e) {
    console.error("Error al parsear granja seleccionada:", e);
  }
  // Si estamos en paginas publicas no hacemos logout forzoso inmediatamente
  const path = window.location.pathname.split('/').pop();
  if (path !== 'login.html' && path !== 'granjas.html') {
    console.warn('No hay granja seleccionada, redirigiendo...');
    window.location.href = 'granjas.html';
  }
  return null;
}

async function handleJsonResponse(res) {
  if (!res.ok) {
    if (res.status === 401) logout();
    const text = await res.text();
    console.error('Fetch error:', res.status, text);
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return null;
  }
  return await res.json();
}

// --- 2. AUTENTICACIÓN ---

async function login(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorMessage = document.getElementById('errorMessage');

  if (!email || !password) {
    errorMessage.textContent = 'Por favor, ingresa email y contraseña.';
    return;
  }
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const text = await res.text();
    if (!res.ok) {
      const errorData = text ? JSON.parse(text).error || text : 'Error desconocido';
      errorMessage.textContent = `Error en login: ${errorData}`;
      return;
    }
    const data = JSON.parse(text);
    localStorage.setItem('token', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    errorMessage.textContent = '';

    // Redirigir a selección de granja
    window.location.href = 'granjas.html';

  } catch (error) {
    errorMessage.textContent = 'Error de conexión al servidor.';
    console.error('Login error:', error);
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
  const path = window.location.pathname.split('/').pop();

  if (path === 'login.html') return;

  if (!token || !currentUser) {
    logout();
    return;
  }

  // Si no tiene granja, debe ir a seleccionarla (excepto si ya está ahí)
  if (!selectedGranja) {
    if (path === 'granjas.html') return;
    window.location.href = 'granjas.html';
    return;
  }

  // Si tiene granja y trata de ir a login o selección, lo mandamos al dashboard
  if (path === 'login.html' || path === 'granjas.html') {
    window.location.href = 'index.html';
    return;
  }

  // Verificación de validez del token
  try {
    const res = await fetch(`${API_URL}/mis-granjas`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { logout(); return; }
  } catch (error) {
    logout();
    return;
  }

  // Permisos de Viewer
  if (currentUser.role === 'viewer' && path !== 'index.html') {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.innerHTML = `
          <section class="card">
            <h2>Acceso Denegado</h2>
            <p>No tienes permisos para ver esta página.</p>
            <a href="index.html">Volver al Dashboard</a>
          </section>`;
    }
    document.querySelectorAll('.form-desplegable-container, #toggleFormBtn').forEach(el => {
      el.style.display = 'none';
    });
  }
}

// --- 3. LÓGICA DE UI (HEADER Y SIDEBAR) ---

function initializeUserProfile() {
  const userBtn = document.getElementById('userMenuBtn');
  const dropdown = document.getElementById('userDropdown');
  const changeBranchBtn = document.getElementById('changeBranchBtn');

  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const currentGranja = JSON.parse(localStorage.getItem('selectedGranja'));

  if (!userBtn || !currentUser) return;

  // Poblar datos
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
      localStorage.removeItem('selectedGranja'); // Borramos solo la granja
      window.location.href = 'granjas.html';
    });
  }
}

function initializeSidebar() {
  // Acordeón
  document.querySelectorAll('.nav-category-title').forEach(title => {
    title.addEventListener('click', () => {
      const targetId = title.dataset.target;
      const targetContainer = document.querySelector(targetId);
      if (targetContainer) {
        targetContainer.classList.toggle('is-collapsed');
      }
    });
  });

  // Link Activo
  const path = window.location.pathname.split('/').pop();
  try {
    let activeLink;
    if (path === '' || path === 'index.html') {
      activeLink = document.querySelector(`.sidebar nav a[href="index.html"]`);
    } else {
      activeLink = document.querySelector(`.sidebar nav a[href="${path}"]`);
    }

    if (activeLink) {
      activeLink.classList.add('active');
      const parentContainer = activeLink.closest('.nav-links-container');
      // Asegurar que la categoría del link activo esté desplegada
      if (parentContainer) {
        parentContainer.classList.remove('is-collapsed');
        // Opcional: Colapsar los otros
      }
    }
  } catch (e) {
    // Ignorar error si no encuentra el link
  }
}

// --- 4. LÓGICA DEL DASHBOARD (GRÁFICOS Y DATOS) ---

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

    let totalAvesInicial = 0;
    let totalMuertes = 0;
    let ultimosPesos = [];

    if (lotes) {
      lotes.forEach(lote => {
        totalAvesInicial += lote.cantidadInicial || lote.cantidad;
        const muertesLote = salud ? salud.filter(s => s.loteId === lote.id && s.tipo.toLowerCase() === 'mortalidad').reduce((sum, s) => sum + s.cantidad, 0) : 0;
        totalMuertes += muertesLote;

        const seguimientosLote = seguimiento ? seguimiento.filter(s => s.loteId === lote.id).sort((a, b) => b.semana - a.semana) : [];
        if (seguimientosLote.length > 0) {
          ultimosPesos.push(seguimientosLote[0].peso);
        }
      });
    }

    const totalVivos = lotes ? lotes.filter(l => l.estado === 'disponible').reduce((sum, l) => sum + l.cantidad, 0) : 0;
    const pesoPromedioActual = ultimosPesos.length ? (ultimosPesos.reduce((a, b) => a + b, 0) / ultimosPesos.length).toFixed(2) : 0;
    const mortalidadPromedio = (totalAvesInicial > 0) ? ((totalMuertes / totalAvesInicial) * 100).toFixed(2) : 0;

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
    const promedio = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : '0';

    const totalCostos = costos ? costos.reduce((sum, c) => sum + c.monto, 0) : 0;
    const totalIngresos = ventas ? ventas.reduce((sum, v) => sum + (v.peso * v.precio), 0) : 0;
    const rentabilidad = totalIngresos - totalCostos;

    if (document.getElementById('totalVivos')) {
      document.getElementById('totalVivos').textContent = totalVivos;
      document.getElementById('pesoPromedio').textContent = `${pesoPromedioActual} kg`;
      document.getElementById('conversionPromedio').textContent = promedio(conversiones);
      document.getElementById('mortalidadPromedio').textContent = `${mortalidadPromedio}%`;
      document.getElementById('costosTotales').textContent = `$${totalCostos.toFixed(2)}`;
      document.getElementById('ingresosTotales').textContent = `$${totalIngresos.toFixed(2)}`;
      document.getElementById('rentabilidad').textContent = `$${rentabilidad.toFixed(2)}`;
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

    if (agendaData) {
      agendaData.forEach(ev => {
        eventosMapa.push({
          date: ev.fecha,
          title: `AGENDA: ${ev.descripcion}`,
          tipo: 'pendiente'
        });
      });
    }
    if (saludData) {
      saludData.forEach(s => {
        if (s.fechaRetiro) {
          eventosMapa.push({
            date: s.fechaRetiro.split('T')[0],
            title: `BIOSEGURIDAD: Fin Retiro ${s.nombre} (Lote ${s.loteId})`,
            tipo: 'retiro'
          });
        }
      });
    }

    if (window.flatpickr) {
      flatpickr("#calendario-container", {
        inline: true,
        locale: "es",
        enable: [{ from: "today", to: "today" }, ...eventosMapa.map(e => e.date)],
        onDayCreate: function (dObj, dStr, fp, dayElem) {
          const fechaStr = dayElem.dateObj.toISOString().split('T')[0];
          const eventosDelDia = eventosMapa.filter(e => e.date === fechaStr);
          if (eventosDelDia.length > 0) {
            if (eventosDelDia.some(e => e.tipo === 'retiro')) dayElem.classList.add('evento-retiro');
            else dayElem.classList.add('evento-pendiente');
            dayElem.title = eventosDelDia.map(e => e.title).join('\n');
          }
        },
        onChange: function (selectedDates, dateStr, instance) {
          const eventosHoy = eventosMapa.filter(e => e.date === dateStr);
          if (eventosHoy.length > 0) {
            const mensaje = eventosHoy.map(e => `• ${e.title}`).join('\n');
            alert(`📅 Actividades para el ${dateStr}:\n\n${mensaje}`);
          }
        }
      });
    }
    // Inyectar estilos
    if (!document.getElementById('estilos-calendario-vincwill')) {
      const style = document.createElement('style');
      style.id = 'estilos-calendario-vincwill';
      style.innerHTML = `
        .evento-retiro { background-color: #e74c3c !important; color: white !important; border: 1px solid #c0392b !important; }
        .evento-pendiente { background-color: #f39c12 !important; color: white !important; font-weight: bold; }
        .flatpickr-day.evento-pendiente:hover { background-color: #d35400 !important; }
      `;
      document.head.appendChild(style);
    }
  } catch (error) { console.error('Error al mostrar calendario:', error); }
}

async function mostrarGraficoAgua() {
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;
  try {
    const res = await fetch(`${API_URL}/agua?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    const aguaData = await handleJsonResponse(res);
    if (!aguaData) return;

    const hoy = new Date();
    const dataPorDia = {};
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - i);
      dataPorDia[fecha.toISOString().split('T')[0]] = 0;
    }
    aguaData.forEach(r => {
      const fechaStr = r.fecha.split('T')[0];
      if (dataPorDia[fechaStr] !== undefined) dataPorDia[fechaStr] += r.cantidad;
    });
    const labels = Object.keys(dataPorDia).map(d => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }));
    const data = Object.values(dataPorDia);
    const ctx = document.getElementById('aguaChart');
    if (ctx) {
      new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Consumo de Agua (Litros)', data: data, backgroundColor: '#3498db' }] },
        options: { scales: { y: { beginAtZero: true } } }
      });
    }
  } catch (error) { console.error('Error en gráfico de agua:', error); }
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

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop();

  // A. SI ESTAMOS EN LOGIN, VINCULAR Y SALIR
  if (path === 'login.html') {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.onsubmit = login;
    }
    return; // Detener ejecución aquí para no cargar lógica de UI
  }

  // B. PARA TODAS LAS DEMÁS PÁGINAS

  // 1. Verificar acceso (Redirige si es necesario)
  checkAccess();

  // 2. Inicializar UI (Header y Sidebar)
  // Solo si no estamos en la página de selección de granjas (que no tiene sidebar/header completo)
  if (path !== 'granjas.html') {
    initializeUserProfile();
    initializeSidebar();
  }

  // 3. Lógica específica del Dashboard
  if (path === 'index.html') {
    const granja = JSON.parse(localStorage.getItem('selectedGranja'));
    if (granja) {
      const titleEl = document.querySelector('header h1');
      if (titleEl) titleEl.textContent = `Dashboard (${granja.nombre})`;
    }
    actualizarDashboard();
    mostrarCalendario();
    mostrarGraficosDashboard();
    mostrarCostosPieChart();
    mostrarIngresosCostosBarChart();
    mostrarGraficoAgua();
    mostrarAlertasProduccion();
  }
});

// Prevenir caché bfcache
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});