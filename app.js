const API_URL = 'https://granja-vincwill-backend.onrender.com'; // Asegúrate de que sea tu URL de Render

async function login(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorMessage = document.getElementById('errorMessage');

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      errorMessage.textContent = '';
      window.location.href = 'index.html';
    } else {
      errorMessage.textContent = data.error || 'Error en login';
    }
  } catch (error) {
    errorMessage.textContent = 'Error de conexión al servidor. Verifica que el backend esté activo.';
    console.error('Login error:', error);
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

  // ¡CAMBIO CLAVE: No ejecutar checkAccess en login.html para evitar loop!
  if (path === 'login.html') {
    return; // Sal de la función si es login
  }

  if (!token || !currentUser) {
    window.location.href = 'login.html';
    return;
  }

  // Verificar token con el backend
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

// Funciones del dashboard (sin cambios)
async function actualizarDashboard() {
  try {
    const [lotes, salud, costos, seguimiento, ventas] = await Promise.all([
      fetch(`${API_URL}/lotes`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()),
      fetch(`${API_URL}/salud`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()),
      fetch(`${API_URL}/costos`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()),
      fetch(`${API_URL}/seguimiento`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()),
      fetch(`${API_URL}/ventas`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json())
    ]);

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

function mostrarGraficosDashboard() {
  fetch(`${API_URL}/seguimiento`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then(res => res.json())
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
    });
}

function mostrarAlertasProduccion() {
  fetch(`${API_URL}/salud`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then(res => res.json())
    .then(salud => {
      const alertasList = document.getElementById('alertasList');
      alertasList.innerHTML = '';
      const mortalidadAlta = salud.filter(s => s.tipo === 'Mortalidad' && s.cantidad > 10);
      mortalidadAlta.forEach(s => {
        const li = document.createElement('li');
        li.textContent = `Alerta: Alta mortalidad en lote ${s.loteId} (${s.cantidad} aves, ${s.fecha})`;
        alertasList.appendChild(li);
      });
    });
}

// ¡CAMBIO CLAVE: Solo ejecutar checkAccess si NO es login.html!
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop();
  if (path !== 'login.html') {
    checkAccess();
  }
  if (path === 'index.html') {
    actualizarDashboard();
    mostrarGraficosDashboard();
    mostrarAlertasProduccion();
  }
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});