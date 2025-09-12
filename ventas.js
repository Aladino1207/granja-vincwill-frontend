const API_URL = 'https://granja-vincwill-backend.onrender.com';

async function cargarVentas() {
  try {
    const res = await fetch(`${API_URL}/ventas`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const ventas = await res.json();
    const tbody = document.getElementById('ventaTableBody');
    tbody.innerHTML = '';
    ventas.forEach(venta => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${venta.loteId}</td>
        <td>${venta.peso}</td>
        <td>${venta.precio}</td>
        <td>${new Date(venta.fecha).toLocaleDateString()}</td>
        <td>${venta.cliente}</td>
        <td>
          <button onclick="editarVenta(${venta.id})">Editar</button>
          <button onclick="eliminarVenta(${venta.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error al cargar ventas:', error);
  }
}

async function guardarVenta(e) {
  e.preventDefault();
  const venta = {
    loteId: parseInt(document.getElementById('loteId').value),
    peso: parseFloat(document.getElementById('peso').value),
    precio: parseFloat(document.getElementById('precio').value),
    fecha: document.getElementById('fecha').value,
    cliente: document.getElementById('cliente').value
  };
  try {
    const res = await fetch(`${API_URL}/ventas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(venta)
    });
    if (res.ok) {
      document.getElementById('ventaForm').reset();
      cargarVentas();
    } else {
      alert('Error al guardar venta');
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

async function editarVenta(id) {
  try {
    const res = await fetch(`${API_URL}/ventas/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const venta = await res.json();
    document.getElementById('loteId').value = venta.loteId;
    document.getElementById('peso').value = venta.peso;
    document.getElementById('precio').value = venta.precio;
    document.getElementById('fecha').value = venta.fecha.split('T')[0];
    document.getElementById('cliente').value = venta.cliente;
    document.getElementById('ventaForm').onsubmit = async (e) => {
      e.preventDefault();
      await fetch(`${API_URL}/ventas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(venta)
      });
      document.getElementById('ventaForm').reset();
      document.getElementById('ventaForm').onsubmit = guardarVenta;
      cargarVentas();
    };
  } catch (error) {
    console.error('Error al editar venta:', error);
  }
}

async function eliminarVenta(id) {
  if (confirm('¿Seguro que quieres eliminar esta venta?')) {
    try {
      await fetch(`${API_URL}/ventas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      cargarVentas();
    } catch (error) {
      alert('Error al eliminar venta');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && currentUser.role !== 'viewer') {
    document.getElementById('ventaForm').style.display = 'grid';
    document.getElementById('ventaTable').style.display = 'table';
  }
  cargarVentas();
});