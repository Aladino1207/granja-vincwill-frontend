
async function cargarVentas() {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('No estás autenticado. Por favor, inicia sesión.');
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/ventas`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const ventas = await res.json();
      const tbody = document.getElementById('ventaTableBody');
      tbody.innerHTML = '';
      ventas.forEach(venta => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${venta.loteId}</td>
          <td>${venta.cantidadVendida}</td>
          <td>${venta.peso}</td>
          <td>${venta.precio}</td>
          <td>${venta.fecha}</td>
          <td>${venta.cliente || 'Sin cliente'}</td>
          <td><button onclick="eliminarVenta(${venta.id})">Eliminar</button></td>
        `;
        tbody.appendChild(row);
      });
    } else {
      const errorData = await res.json();
      console.error('Error al cargar ventas:', errorData);
    }
  } catch (error) {
    console.error('Error de conexión:', error);
    alert('Error al cargar ventas');
  }
}

async function eliminarVenta(id) {
  const token = localStorage.getItem('token');
  if (!token) return;

  if (confirm('¿Estás seguro de eliminar esta venta?')) {
    try {
      const res = await fetch(`${API_URL}/ventas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        cargarVentas();
      } else {
        const errorData = await res.json();
        console.error('Error al eliminar venta:', errorData);
        alert('Error al eliminar venta');
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      alert('Error al eliminar venta');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarVentas();
});
