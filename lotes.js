const API_URL = 'https://granja-vincwill-backend.onrender.com'; // Actualiza con la URL de Render

async function cargarLotes() {
  try {
    const res = await fetch(`${API_URL}/lotes`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const lotes = await res.json();
    const tbody = document.getElementById('loteTableBody');
    tbody.innerHTML = '';
    lotes.forEach(lote => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${lote.loteId}</td>
        <td>${lote.cantidad}</td>
        <td>${lote.pesoInicial}</td>
        <td>${new Date(lote.fechaIngreso).toLocaleDateString()}</td>
        <td>${lote.estado}</td>
        <td>
          <button onclick="editarLote(${lote.id})">Editar</button>
          <button onclick="eliminarLote(${lote.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error al cargar lotes:', error);
  }
}

async function guardarLote(e) {
  e.preventDefault();
  const lote = {
    loteId: document.getElementById('loteId').value,
    cantidad: parseInt(document.getElementById('cantidad').value),
    pesoInicial: parseFloat(document.getElementById('pesoInicial').value),
    fechaIngreso: document.getElementById('fechaIngreso').value,
    estado: document.getElementById('estado').value
  };
  try {
    const res = await fetch(`${API_URL}/lotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(lote)
    });
    if (res.ok) {
      document.getElementById('loteForm').reset();
      cargarLotes();
    } else {
      alert('Error al guardar lote');
    }
  } catch (error) {
    alert('Error de conexión');
  }
}

async function editarLote(id) {
  try {
    const res = await fetch(`${API_URL}/lotes/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const lote = await res.json();
    document.getElementById('loteId').value = lote.loteId;
    document.getElementById('cantidad').value = lote.cantidad;
    document.getElementById('pesoInicial').value = lote.pesoInicial;
    document.getElementById('fechaIngreso').value = lote.fechaIngreso.split('T')[0];
    document.getElementById('estado').value = lote.estado;
    document.getElementById('loteForm').onsubmit = async (e) => {
      e.preventDefault();
      await fetch(`${API_URL}/lotes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(lote)
      });
      document.getElementById('loteForm').reset();
      document.getElementById('loteForm').onsubmit = guardarLote;
      cargarLotes();
    };
  } catch (error) {
    console.error('Error al editar lote:', error);
  }
}

async function eliminarLote(id) {
  if (confirm('¿Seguro que quieres eliminar este lote?')) {
    try {
      await fetch(`${API_URL}/lotes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      cargarLotes();
    } catch (error) {
      alert('Error al eliminar lote');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && currentUser.role !== 'viewer') {
    document.getElementById('loteForm').style.display = 'grid';
    document.getElementById('loteTable').style.display = 'table';
  }
  cargarLotes();
});