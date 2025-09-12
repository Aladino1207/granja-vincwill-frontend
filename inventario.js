const API_URL = 'https://granja-vincwill-backend.onrender.com';

async function cargarInventario() {
  try {
    const res = await fetch(`${API_URL}/inventario`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const inventario = await res.json();
    const tbody = document.getElementById('inventarioTableBody');
    tbody.innerHTML = '';
    inventario.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.producto}</td>
        <td>${item.categoria}</td>
        <td>${item.cantidad}</td>
        <td>${item.costo}</td>
        <td>${new Date(item.fecha).toLocaleDateString()}</td>
        <td>
          <button onclick="editarInventario(${item.id})">Editar</button>
          <button onclick="eliminarInventario(${item.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error al cargar inventario:', error);
  }
}

async function guardarInventario(e) {
  e.preventDefault();
  const inventario = {
    producto: document.getElementById('producto').value,
    categoria: document.getElementById('categoria').value,
    cantidad: parseFloat(document.getElementById('cantidad').value),
    costo: parseFloat(document.getElementById('costo').value),
    fecha: document.getElementById('fecha').value
  };
  try {
    const res = await fetch(`${API_URL}/inventario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(inventario)
    });
    if (res.ok) {
      document.getElementById('inventarioForm').reset();
      cargarInventario();
    } else {
      alert('Error al guardar inventario');
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

async function editarInventario(id) {
  try {
    const res = await fetch(`${API_URL}/inventario/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const item = await res.json();
    document.getElementById('producto').value = item.producto;
    document.getElementById('categoria').value = item.categoria;
    document.getElementById('cantidad').value = item.cantidad;
    document.getElementById('costo').value = item.costo;
    document.getElementById('fecha').value = item.fecha.split('T')[0];
    document.getElementById('inventarioForm').onsubmit = async (e) => {
      e.preventDefault();
      await fetch(`${API_URL}/inventario/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(item)
      });
      document.getElementById('inventarioForm').reset();
      document.getElementById('inventarioForm').onsubmit = guardarInventario;
      cargarInventario();
    };
  } catch (error) {
    console.error('Error al editar inventario:', error);
  }
}

async function eliminarInventario(id) {
  if (confirm('¿Seguro que quieres eliminar este inventario?')) {
    try {
      await fetch(`${API_URL}/inventario/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      cargarInventario();
    } catch (error) {
      alert('Error al eliminar inventario');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && currentUser.role !== 'viewer') {
    document.getElementById('inventarioForm').style.display = 'grid';
    document.getElementById('inventarioTable').style.display = 'table';
  }
  cargarInventario();
});