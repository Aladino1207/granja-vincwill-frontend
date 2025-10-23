window.API_URL = 'https://granja-vincwill-backend.granja-vincwill.workers.dev';

async function login(e) {
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
      console.log('Intentando login con email:', email, 'y contraseña:', password);
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const text = await res.text();
      console.log('Respuesta del servidor:', text, 'Status:', res.status);
      if (!res.ok) {
        const errorData = text ? (JSON.parse(text).error || text) : 'Error desconocido';
        errorMessage.textContent = `Error en login: ${errorData}`;
        return; // Detiene la ejecución aquí si falla
      }
      const data = JSON.parse(text);
      localStorage.setItem('token', data.token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      errorMessage.textContent = '';
      window.location.href = 'index.html'; // Redirige solo si tiene éxito
    } catch (error) {
      console.error('Login error:', error);
      errorMessage.textContent = 'Error de conexión al servidor. Intenta de nuevo.';
      // No redirige ni recarga, solo muestra el error
    }
  }
}

function logout() {
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}


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
  if (path === 'usuarios.html' && currentUser.role !== 'admin') {
    document.getElementById('userSection').style.display = 'none';
    document.getElementById('accessDenied').style.display = 'block';
  } else if (path === 'usuarios.html') {
    document.getElementById('userForm').style.display = 'grid';
    document.getElementById('userTable').style.display = 'table';
  }
}

async function actualizarDashboard() {
  try {
    const [lotes, salud, costos, seguimiento, ventas] = await Promise.all([
      fetch(`${API_URL}/lotes`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/salud`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/costos`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/seguimiento`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse),
      fetch(`${API_URL}/ventas`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(handleJsonResponse)
    ]);

    // Carga configuración para notificaciones
    const resConfig = await fetch(`${window.API_URL}/config`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const config = await resConfig.json();
    if (config.length > 0 && config[0].notificaciones === 'Activadas') {
      mostrarAlertasProduccion();
    } else {
      document.getElementById('alertasList').innerHTML = '<li>No hay alertas activadas.</li>';
    }

    let totalVivos = 0;
    lotes.forEach(lote => {
      const muertos = salud.filter(s => s.loteId === lote.id && s.tipo === 'Mortalidad').reduce((sum, s) => sum + s.cantidad, 0);
      totalVivos += lote.cantidad - muertos;
    });
    document.getElementById('totalVivos').textContent = totalVivos;

    const conversiones = [], ganancias = [];
    const porLote = {};

    seguimiento.forEach(reg => {
      const lote = porLote[reg.loteId] ||= { pesoInicial: null, pesoFinal: null, consumo: 0, semanas: new Set() };
      if (lote.pesoInicial === null || reg.semana === 1) lote.pesoInicial = reg.peso;
      lote.pesoFinal = reg.peso;
      lote.consumo += reg.consumo;
      lote.semanas.add(reg.semana);
    });

    for (const loteId in porLote) {
      const l = porLote[loteId];
      const pesoGanado = l.pesoFinal - l.pesoInicial;
      const conversion = l.consumo / (pesoGanado || 1);
      const ganancia = pesoGanado / (l.semanas.size * 7);
      conversiones.push(conversion);
      ganancias.push(ganancia);
    }

    const promedio = arr => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2) : '0';
    document.getElementById('conversionPromedio').textContent = promedio(conversiones);
    document.getElementById('gananciaPromedio').textContent = promedio(ganancias);

    const totalCostos = costos.reduce((sum, c) => sum + c.monto, 0);
    const totalIngresos = ventas.reduce((sum, v) => sum + (v.peso * v.precio), 0);
    const rentabilidad = totalIngresos - totalCostos;

    document.getElementById('costosTotales').textContent = `$${totalCostos.toFixed(2)}`;
    document.getElementById('ingresosTotales').textContent = `$${totalIngresos.toFixed(2)}`;
    document.getElementById('rentabilidad').textContent = `$${rentabilidad.toFixed(2)}`;
  } catch (error) {
    console.error('Error al actualizar dashboard:', error);
  }
}

// ¡NUEVA FUNCIÓN: Maneja respuestas para evitar "Unexpected token '<'"
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
}

function mostrarGraficosDashboard() {
  fetch(`${API_URL}/seguimiento`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then(handleJsonResponse)
    .then(seguimiento => {
      const labels = [...new Set(seguimiento.map(reg => `Semana ${reg.semana}`))];
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
          datasets: [{ label: 'Peso Promedio (kg)', data: dataPeso, borderColor: 'blue' }]
        },
        options: { scales: { y: { beginAtZero: true } } }
      });
    })
    .catch(error => console.error('Error en gráfico de seguimiento:', error));
}

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
          title: {
            display: true,
            text: 'Distribución de Costos por Categoría (%)'
          }
        }
      });
    })
    .catch(error => console.error('Error en gráfico de costos:', error));
}

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
        title: {
          display: true,
          text: 'Ingresos vs Costos por Lote'
        }
      }
    });
  })
  .catch(error => console.error('Error en gráfico de ingresos/costos:', error));
}

function mostrarAlertasProduccion() {
  fetch(`${API_URL}/salud`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then(handleJsonResponse)
    .then(salud => {
      const alertasList = document.getElementById('alertasList');
      alertasList.innerHTML = '';
      const mortalidadAlta = salud.filter(s => s.tipo === 'Mortalidad' && s.cantidad > 10);
      mortalidadAlta.forEach(s => {
        const li = document.createElement('li');
        li.textContent = `Alerta: Alta mortalidad en lote ${s.loteId} (${s.cantidad} aves, ${s.fecha})`;
        alertasList.appendChild(li);
      });
    })
    .catch(error => console.error('Error en alertas:', error));
}

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop();
  if (path !== 'login.html') {
    checkAccess();
  }
  if (path === 'index.html') {
    actualizarDashboard();
    mostrarGraficosDashboard();
    mostrarCostosPieChart();
    mostrarIngresosCostosBarChart();
    mostrarAlertasProduccion();
  }
  // Vincular el evento onsubmit solo para login.html
  if (path === 'login.html') {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.onsubmit = login;
    }
  }
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});