const API_URL = 'https://granja-vincwill-backend.onrender.com';

async function cargarReportes() {
  try {
    // Simulación de reportes combinando datos (puedes personalizar)
    const [lotes, ventas, costos] = await Promise.all([
      fetch(`${API_URL}/lotes`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()),
      fetch(`${API_URL}/ventas`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json()),
      fetch(`${API_URL}/costos`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json())
    ]);
    const tbody = document.getElementById('reporteTableBody');
    tbody.innerHTML = '';
    const totalIngresos = ventas.reduce((sum, v) => sum + (v.peso * v.precio), 0);
    const totalCostos = costos.reduce((sum, c) => sum + c.monto, 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>Total Ingresos</td>
      <td>$${totalIngresos.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
    const tr2 = document.createElement('tr');
    tr2.innerHTML = `
      <td>Total Costos</td>
      <td>$${totalCostos.toFixed(2)}</td>
    `;
    tbody.appendChild(tr2);
    const tr3 = document.createElement('tr');
    tr3.innerHTML = `
      <td>Rentabilidad</td>
      <td>$${(totalIngresos - totalCostos).toFixed(2)}</td>
    `;
    tbody.appendChild(tr3);
  } catch (error) {
    console.error('Error al cargar reportes:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser) {
    document.getElementById('reporteTable').style.display = 'table';
  }
  cargarReportes();
});