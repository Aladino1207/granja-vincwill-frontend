const API_URL = 'https://granja-vincwill-backend.onrender.com';

async function cargarCostos() {
  try {
    const res = await fetch(`${API_URL}/costos`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const costos = await res.json();
    const tbody = document.getElementById('costoTableBody');
    tbody.innerHTML = '';
    costos.forEach(costo => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${costo.loteId}</td>
        <td>${costo.categoria}</td>
        <td>${costo.descripcion}</td>
        <td>${costo.monto}</td>
        <td>${new Date(costo.fecha).toLocaleDateString()}</td>
        <td>
          <button onclick="editarCosto(${costo.id})">Editar</button>
          <button onclick="eliminarCosto(${costo.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error al cargar costos:', error);
  }
}

async function guardarCosto(e) {
  e.preventDefault();
  const costo = {
    loteId: parseInt(document.getElementById('loteId').value),
    categoria: document.getElementById('categoria').value,
    descripcion: document.getElementById('descripcion').value,
    monto: parseFloat(document.getElementById('monto').value),
    fecha: document.getElementById('fecha').value
  };
  try {
    const res = await fetch(`${API_URL}/costos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(costo)
    });
    if (res.ok) {
      document.getElementById('costoForm').reset();
      cargarCostos();
    } else {
      alert('Error al guardar costo');
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

async function editarCosto(id) {
  try {
    const res = await fetch(`${API_URL}/costos/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const costo = await res.json();
    document.getElementById('loteId').value = costo.loteId;
    document.getElementById('categoria').value = costo.categoria;
    document.getElementById('descripcion').value = costo.descripcion;
    document.getElementById('monto').value = costo.monto;
    document.getElementById('fecha').value = costo.fecha.split('T')[0];
    document.getElementById('costoForm').onsubmit = async (e) => {
      e.preventDefault();
      await fetch(`${API_URL}/costos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(costo)
      });
      document.getElementById('costoForm').reset();
      document.getElementById('costoForm').onsubmit = guardarCosto;
      cargarCostos();
    };
  } catch (error) {
    console.error('Error al editar costo:', error);
  }
}

async function eliminarCosto(id) {
  if (confirm('¿Seguro que quieres eliminar este costo?')) {
    try {
      await fetch(`${API_URL}/costos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      cargarCostos();
    } catch (error) {
      alert('Error al eliminar costo');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && currentUser.role !== 'viewer') {
    document.getElementById('costoForm').style.display = 'grid';
    document.getElementById('costoTable').style.display = 'table';
  }
  cargarCostos();
});