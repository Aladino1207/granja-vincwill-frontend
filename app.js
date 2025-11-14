window.API_URL = 'https://granja-vincwill-backend.onrender.com';

// --- V 3.0: FUNCIÓN UTILITARIA GLOBAL ---
// Esta función es la CLAVE de V 3.0
function getSelectedGranjaId() {
  try {
    const granja = JSON.parse(localStorage.getItem('selectedGranja'));
    if (granja && granja.id) {
      return granja.id;
    }
  } catch (e) {
    console.error("Error al parsear granja seleccionada:", e);
  }

  // Si no hay granja o falla el parseo, limpiamos todo y vamos a login.
  console.warn('No hay granja seleccionada, redirigiendo...');
  logout(); // Forzamos logout y limpieza
  return null;
}

// --- V 3.0: login() MODIFICADO ---
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

    // --- CAMBIO CLAVE: De index.html a granjas.html ---
    window.location.href = 'granjas.html';

  } catch (error) {
    errorMessage.textContent = 'Error de conexión al servidor.';
    console.error('Login error:', error);
  }
}

// --- V 3.0: logout() MODIFICADO ---
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('selectedGranja'); // ¡MUY IMPORTANTE!
  window.location.href = 'login.html';
}

// --- V 3.0: checkAccess() REESCRITO ---
async function checkAccess() {
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const selectedGranja = localStorage.getItem('selectedGranja'); // Solo chequear si existe
  const path = window.location.pathname.split('/').pop();

  if (path === 'login.html') return;

  if (!token || !currentUser) {
    logout();
    return;
  }

  if (!selectedGranja) {
    if (path === 'granjas.html') {
      return; // Está en la página correcta
    }
    // Si no tiene granja y no está en granjas.html, lo forzamos a ir
    window.location.href = 'granjas.html';
    return;
  }

  // Si tiene token Y granja, no debe estar en login o granjas
  if (path === 'login.html' || path === 'granjas.html') {
    window.location.href = 'index.html';
    return;
  }

  // Verificación de token
  try {
    const res = await fetch(`${API_URL}/mis-granjas`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { // Si el token expiró o es inválido
      logout();
      return;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    logout();
    return;
  }

  // Lógica de permisos de roles
  if (currentUser.role === 'viewer' && path !== 'index.html') {
    document.querySelector('main').innerHTML = `
      <section class="card">
        <h2>Acceso Denegado</h2>
        <p>No tienes permisos para ver esta página.</p>
        <a href="index.html">Volver al Dashboard</a>
      </section>`;
    // Ocultar elementos de UI si es viewer
    document.querySelectorAll('.form-desplegable-container, #toggleFormBtn').forEach(el => {
      el.style.display = 'none';
    });
  }
}

// --- V 3.0: actualizarDashboard() BLINDADO ---
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

    // --- Cálculos ---
    let totalAvesInicial = 0;
    let totalMuertes = 0;
    let ultimosPesos = [];

    lotes.forEach(lote => {
      totalAvesInicial += lote.cantidadInicial || 0;
      // Las muertes ya se restaron, pero las contamos para la métrica
      const muertesLote = salud.filter(s => s.loteId === lote.id && s.tipo.toLowerCase() === 'mortalidad').reduce((sum, s) => sum + s.cantidad, 0);
      totalMuertes += muertesLote;

      const seguimientosLote = seguimiento.filter(s => s.loteId === lote.id).sort((a, b) => b.semana - a.semana);
      if (seguimientosLote.length > 0) {
        ultimosPesos.push(seguimientosLote[0].peso);
      }
    });

    const totalVivos = lotes.filter(l => l.estado === 'disponible').reduce((sum, l) => sum + l.cantidad, 0);
    const pesoPromedioActual = ultimosPesos.length ? (ultimosPesos.reduce((a, b) => a + b, 0) / ultimosPesos.length).toFixed(2) : 0;
    const mortalidadPromedio = (totalAvesInicial > 0) ? ((totalMuertes / totalAvesInicial) * 100).toFixed(2) : 0;

    const conversiones = [];
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
    const promedio = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : '0';

    const totalCostos = costos.reduce((sum, c) => sum + c.monto, 0);
    const totalIngresos = ventas.reduce((sum, v) => sum + (v.peso * v.precio), 0); // Asumiendo precio es por kg
    const rentabilidad = totalIngresos - totalCostos;

    // --- Poblar HTML ---
    if (document.getElementById('totalVivos')) { // Chequeo de seguridad
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

async function handleJsonResponse(res) {
  if (!res.ok) {
    if (res.status === 401) logout(); // Si el token expira, desloguear
    const text = await res.text();
    console.error('Fetch error:', res.status, text);
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  try {
    const text = await res.text();
    if (!text) return null; // Manejar respuestas vacías (ej: DELETE 204)
    return JSON.parse(text); // Parsear el texto
  } catch (e) {
    console.error("Error al parsear JSON:", e, res);
    throw new Error("Respuesta del servidor no es JSON válido.");
  }
}

// --- V 3.0: GRÁFICOS BLINDADOS ---
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

    flatpickr("#calendario-container", {
      inline: true,
      locale: "es",
      enable: [{ from: "today", to: "today" }, ...eventosMapa.map(e => e.date)],
      onDayCreate: function (dObj, dStr, fp, dayElem) {
        const fechaStr = dayElem.dateObj.toISOString().split('T')[0];
        const eventosDelDia = eventosMapa.filter(e => e.date === fechaStr);

        if (eventosDelDia.length > 0) {
          if (eventosDelDia.some(e => e.tipo === 'retiro')) {
            dayElem.classList.add('evento-retiro');
          } else {
            dayElem.classList.add('evento-pendiente');
          }
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

    const estiloId = 'estilos-calendario-vincwill';
    if (!document.getElementById(estiloId)) {
      const style = document.createElement('style');
      style.id = estiloId;
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
      const fechaStr = fecha.toISOString().split('T')[0];
      dataPorDia[fechaStr] = 0;
    }
    aguaData.forEach(r => {
      const fechaStr = r.fecha.split('T')[0];
      if (dataPorDia[fechaStr] !== undefined) {
        dataPorDia[fechaStr] += r.cantidad;
      }
    });
    const labels = Object.keys(dataPorDia).map(d => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }));
    const data = Object.values(dataPorDia);

    const ctx = document.getElementById('aguaChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Consumo de Agua (Litros)', data: data, backgroundColor: '#3498db' }] },
      options: { scales: { y: { beginAtZero: true } } }
    });
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
      const ctx = document.getElementById('produccionChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Peso Promedio (kg)', data: dataPeso, borderColor: 'blue', tension: 0.1 }] },
        options: { scales: { y: { beginAtZero: true } } }
      });
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
      costos.forEach(c => {
        categories[c.categoria] = (categories[c.categoria] || 0) + c.monto;
      });
      const labels = Object.keys(categories);
      const data = Object.values(categories);
      const ctx = document.getElementById('costosPieChart').getContext('2d');
      new Chart(ctx, {
        type: 'pie',
        data: { labels, datasets: [{ data, backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'] }] },
        options: { responsive: true }
      });
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
      const dataIngresos = {};
      const dataCostos = {};
      lotes.forEach(l => {
        dataIngresos[l.loteId] = ventas.filter(v => v.loteId === l.id).reduce((sum, v) => sum + (v.peso * v.precio), 0);
        dataCostos[l.loteId] = costos.filter(c => c.loteId === l.id).reduce((sum, c) => sum + c.monto, 0);
      });
      const labels = Object.keys(dataIngresos);
      const ingresosData = Object.values(dataIngresos);
      const costosData = Object.values(dataCostos);
      const ctx = document.getElementById('ingresosCostosBarChart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels, datasets: [
            { label: 'Ingresos ($)', data: ingresosData, backgroundColor: '#36A2EB' },
            { label: 'Costos ($)', data: costosData, backgroundColor: '#FF6384' }
          ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
      });
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
    })
    .catch(error => console.error('Error en alertas:', error));
}

// --- DOMContentLoaded (MODIFICADO) ---
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop();

  if (path !== 'login.html') {
    checkAccess(); // Se ejecuta en TODAS las páginas (excepto login)
  }

  if (path === 'login.html') {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.onsubmit = login;
  }

  if (path === 'index.html') {
    const granja = JSON.parse(localStorage.getItem('selectedGranja'));
    if (granja) {
      document.querySelector('header h1').textContent = `Dashboard (${granja.nombre})`;
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

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});