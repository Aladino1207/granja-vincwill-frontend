window.API_URL = 'https://granja-vincwill-backend.onrender.com';

// --- Funciones de Autenticación (Sin cambios) ---
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
    window.location.href = 'index.html';
  } catch (error) {
    errorMessage.textContent = 'Error de conexión al servidor.';
    console.error('Login error:', error);
  }
} [cite: 1]

function logout() {
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('token');
  window.location.href = 'login.html';
} [cite: 1]

async function checkAccess() {
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const path = window.location.pathname.split('/').pop();

  if (path === 'login.html') {
    return;
  }
  if (!token || !currentUser) {
    window.location.href = 'login.html';
    return;
  }
  try {
    const res = await fetch(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      logout();
      return;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    logout();
    return;
  }
  if (currentUser.role === 'viewer' && path !== 'index.html') {
    document.querySelector('main').innerHTML = `
      <section>
        <h2>Acceso Denegado</h2>
        <p>Solo los usuarios con rol de Administrador o Empleado pueden acceder a esta página.</p>
        <a href="index.html">Volver al Dashboard</a>
      </section>
    `;
  }
} [cite: 1]

async function handleJsonResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    console.error('Fetch error:', res.status, text);
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await res.text();
    console.error('Non-JSON response:', text);
    throw new Error('Respuesta no es JSON');
  }
  return await res.json();
} [cite: 1]


// --- FUNCIÓN ACTUALIZADA: actualizarDashboard (para 7 métricas) ---
async function actualizarDashboard() {
  try {
    // 1. Obtenemos todos los datos
    const [lotes, salud, costos, seguimiento, ventas, agua] = await Promise.all([
      fetch(`${API_URL}/lotes`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/salud`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/costos`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/seguimiento`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/ventas`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/agua`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse) // Se añade agua
    ]);

    // 2. Cálculos (Ahora con 7 métricas)
    let totalAvesInicial = 0;
    let totalMuertes = 0;
    let totalVivos = 0;
    let pesoPromedioActual = 0;
    let ultimosPesos = [];

    lotes.forEach(lote => {
      // Suma la cantidad inicial de aves
      totalAvesInicial += lote.cantidad;

      // Calcula muertes por lote
      const muertesLote = salud.filter(s => s.loteId === lote.id && s.tipo === 'Mortalidad').reduce((sum, s) => sum + s.cantidad, 0);
      totalMuertes += muertesLote;

      // Encontrar el último peso registrado para este lote
      const seguimientosLote = seguimiento
        .filter(s => s.loteId === lote.id)
        .sort((a, b) => b.semana - a.semana); // Ordenar por semana desc

      if (seguimientosLote.length > 0) {
        ultimosPesos.push(seguimientosLote[0].peso);
      }
    });

    totalVivos = totalAvesInicial - totalMuertes;

    // Calcula el promedio de los últimos pesos de CADA lote
    if (ultimosPesos.length > 0) {
      pesoPromedioActual = (ultimosPesos.reduce((a, b) => a + b, 0) / ultimosPesos.length).toFixed(2);
    }

    // Mortalidad Promedio
    const mortalidadPromedio = (totalAvesInicial > 0) ? ((totalMuertes / totalAvesInicial) * 100).toFixed(2) : 0;

    // Cálculos de Conversión (ICA)
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

    // Cálculos Financieros
    const totalCostos = costos.reduce((sum, c) => sum + c.monto, 0);
    const totalIngresos = ventas.reduce((sum, v) => sum + (v.peso * v.precio), 0);
    const rentabilidad = totalIngresos - totalCostos;

    // 3. Poblar el HTML (con los 7 IDs del nuevo index.html)
    document.getElementById('totalVivos').textContent = totalVivos;
    document.getElementById('pesoPromedio').textContent = `${pesoPromedioActual} kg`;
    document.getElementById('conversionPromedio').textContent = promedio(conversiones);
    document.getElementById('mortalidadPromedio').textContent = `${mortalidadPromedio}%`;
    document.getElementById('costosTotales').textContent = `$${totalCostos.toFixed(2)}`;
    document.getElementById('ingresosTotales').textContent = `$${totalIngresos.toFixed(2)}`;
    document.getElementById('rentabilidad').textContent = `$${rentabilidad.toFixed(2)}`;

  } catch (error) {
    console.error('Error al actualizar dashboard:', error);
  }
}

// --- NUEVA FUNCIÓN: mostrarCalendario ---
async function mostrarCalendario() {
  try {
    // 1. Obtener eventos de 'salud' (para periodos de retiro)
    const saludRes = await fetch(`${API_URL}/salud`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    const saludData = await handleJsonResponse(saludRes);

    // 2. Mapear eventos para el calendario
    const eventos = [];

    // Añadir Períodos de Retiro (de 'salud')
    saludData.forEach(s => {
      if (s.fechaRetiro) {
        eventos.push({
          date: s.fechaRetiro.split('T')[0], // Asegura formato YYYY-MM-DD
          title: `Fin de Retiro (Lote ${s.loteId})` // (Necesitaríamos un JOIN en backend para mostrar 'loteId' string)
        });
      }
      if (s.tipo === 'Vacuna') {
        eventos.push({
          date: s.fecha.split('T')[0],
          title: `Vacuna: ${s.nombre} (Lote ${s.loteId})`
        });
      }
    });

    // 3. Inicializar Flatpickr (el calendario "físico")
    flatpickr("#calendario-container", {
      inline: true, // Lo dibuja "físicamente"
      locale: "es", // Usa la traducción a español

      // Esta función se ejecuta para cada día que se dibuja
      onDayCreate: function (dObj, dStr, fp, dayElem) {
        const fechaStr = dayElem.dateObj.toISOString().split('T')[0];
        const eventosDelDia = eventos.filter(e => e.date === fechaStr);

        if (eventosDelDia.length > 0) {
          dayElem.classList.add('evento-calendario'); // Marca el día
          // Añade un tooltip simple
          dayElem.title = eventosDelDia.map(e => e.title).join('\n');
        }
      },

      // Función que se ejecuta al seleccionar una fecha
      onChange: function (selectedDates, dateStr, instance) {
        const eventosHoy = eventos.filter(e => e.date === dateStr);
        if (eventosHoy.length > 0) {
          alert(`Eventos para ${dateStr}:\n- ${eventosHoy.map(e => e.title).join('\n- ')}`);
        }
      }
    });

    // Añadimos un poco de CSS para marcar los días con eventos
    const style = document.createElement('style');
    style.innerHTML = `
      .evento-calendario {
        background-color: var(--color-secundario-hover);
        color: white !important;
        border-radius: 22px;
        font-weight: bold;
      }
    `;
    document.head.appendChild(style);

  } catch (error) {
    console.error('Error al mostrar calendario:', error);
  }
}

// --- NUEVA FUNCIÓN: mostrarGraficoAgua ---
async function mostrarGraficoAgua() {
  try {
    const res = await fetch(`${API_URL}/agua`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    const aguaData = await handleJsonResponse(res);

    // Agrupar consumo por día (últimos 7 días)
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
      data: {
        labels,
        datasets: [{
          label: 'Consumo de Agua (Litros)',
          data: data,
          backgroundColor: '#3498db'
        }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  } catch (error) {
    console.error('Error en gráfico de agua:', error);
  }
}

// --- Funciones de Gráficos (Sin cambios) ---
function mostrarGraficosDashboard() {
  fetch(`${API_URL}/seguimiento`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then(handleJsonResponse)
    .then(seguimiento => {
      const labels = [...new Set(seguimiento.map(reg => `Semana ${reg.semana}`))].sort((a, b) => parseInt(a.split(' ')[1]) - parseInt(b.split(' ')[1]));
      const dataPeso = labels.map(label => {
        const semana = parseInt(label.split(' ')[1]);
        const pesos = seguimiento.filter(reg => reg.semana === semana).map(reg => reg.peso);
        return pesos.length ? pesos.reduce((a, b) => a + b) / pesos.length : 0;
      });

      const ctx = document.getElementById('produccionChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{ label: 'Peso Promedio (kg)', data: dataPeso, borderColor: 'blue', tension: 0.1 }]
        },
        options: { scales: { y: { beginAtZero: true } } }
      });
    })
    .catch(error => console.error('Error en gráfico de seguimiento:', error));
} [cite: 1]

function mostrarCostosPieChart() {
  fetch(`${API_URL}/costos`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then(handleJsonResponse)
    .then(costos => {
      const categories = {};
      costos.forEach(c => {
        categories[c.categoria] = (categories[c.categoria] || 0) + c.monto;
      });

      const labels = Object.keys(categories);
      const data = Object.values(categories);

      const ctx = document.getElementById('costosPieChart').getContext('2d');
      new Chart(ctx, {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
          }]
        },
        options: {
          responsive: true,
        }
      });
    })
    .catch(error => console.error('Error en gráfico de costos:', error));
} [cite: 1]

function mostrarIngresosCostosBarChart() {
  Promise.all([
    fetch(`${API_URL}/lotes`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
    fetch(`${API_URL}/ventas`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
    fetch(`${API_URL}/costos`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse)
  ])
    .then(([lotes, ventas, costos]) => {
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
          labels,
          datasets: [
            { label: 'Ingresos ($)', data: ingresosData, backgroundColor: '#36A2EB' },
            { label: 'Costos ($)', data: costosData, backgroundColor: '#FF6384' }
          ]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true } },
        }
      });
    })
    .catch(error => console.error('Error en gráfico de ingresos/costos:', error));
} [cite: 1]

function mostrarAlertasProduccion() {
  fetch(`${API_URL}/salud`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then(handleJsonResponse)
    .then(salud => {
      const alertasList = document.getElementById('alertasList');
      alertasList.innerHTML = '';
      const mortalidadAlta = salud.filter(s => s.tipo === 'Mortalidad' && s.cantidad > 10);
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
} [cite: 1]

// --- MODIFICADO: DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop();

  if (path !== 'login.html') {
    checkAccess();
  }

  if (path === 'index.html') {
    actualizarDashboard();
    mostrarCalendario(); // <--- NUEVA LLAMADA
    mostrarGraficosDashboard();
    mostrarCostosPieChart();
    mostrarIngresosCostosBarChart();
    mostrarGraficoAgua(); // <--- NUEVA LLAMADA
    mostrarAlertasProduccion();
  }

  if (path === 'login.html') {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.onsubmit = login;
    }
  }
});

// --- (pageshow sin cambios) ---
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});