// lotes.js - GESTIÓN DE LOTES (FINAL)

// === MOSTRAR LOTES ===
function mostrarLotes(lotes) {
  const tbody = document.getElementById('loteTableBody');
  if (!tbody) {
    console.error('No se encontró loteTableBody');
    return;
  }

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
}

// === CARGAR LOTES ===
async function cargarLotes() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    const lotes = await window.fetchWithTimeout(`${API_URL}/lotes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, 15000);

    mostrarLotes(lotes);
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar lotes: ' + error.message);
  }
}

// === GUARDAR LOTE ===
async function guardarLote(e) {
  e.preventDefault();
  console.log('Intentando guardar lote...');

  const loteId = document.getElementById('loteId').value;
  const cantidad = parseInt(document.getElementById('cantidad').value);
  const pesoInicial = parseFloat(document.getElementById('pesoInicial').value);
  const fechaIngreso = document.getElementById('fechaIngreso').value;
  const estado = document.getElementById('estado').value === 'Activo' ? 'disponible' : 'vendido';

  if (!loteId || isNaN(cantidad) || isNaN(pesoInicial) || !fechaIngreso) {
    alert('Por favor, completa todos los campos correctamente.');
    return;
  }

  const lote = { loteId, cantidad, pesoInicial, fechaIngreso, estado };

  try {
    const token = localStorage.getItem('token');

    const nuevoLote = await window.fetchWithTimeout(`${API_URL}/lotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(lote)
    }, 15000);

    document.getElementById('loteForm').reset();
    cargarLotes();
    alert('Lote guardado exitosamente');
  } catch (error) {
    console.error('Error:', error);
    alert('Error al guardar lote: ' + error.message);
  }
}

// === EDITAR LOTE ===
async function editarLote(id) {
  try {
    const token = localStorage.getItem('token');
    const lote = await window.fetchWithTimeout(`${API_URL}/lotes/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }, 15000);

    document.getElementById('loteId').value = lote.loteId;
    document.getElementById('cantidad').value = lote.cantidad;
    document.getElementById('pesoInicial').value = lote.pesoInicial;
    document.getElementById('fechaIngreso').value = lote.fechaIngreso.split('T')[0];
    document.getElementById('estado').value = lote.estado === 'disponible' ? 'Activo' : 'Terminado';

    document.getElementById('loteForm').onsubmit = async (e) => {
      e.preventDefault();
      const updatedLote = {
        loteId: document.getElementById('loteId').value,
        cantidad: parseInt(document.getElementById('cantidad').value),
        pesoInicial: parseFloat(document.getElementById('pesoInicial').value),
        fechaIngreso: document.getElementById('fechaIngreso').value,
        estado: document.getElementById('estado').value === 'Activo' ? 'disponible' : 'vendido'
      };

      await window.fetchWithTimeout(`${API_URL}/lotes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedLote)
      }, 15000);

      document.getElementById('loteForm').reset();
      document.getElementById('loteForm').onsubmit = guardarLote;
      cargarLotes();
      alert('Lote actualizado exitosamente');
    };
  } catch (error) {
    console.error('Error:', error);
    alert('Error al editar lote: ' + error.message);
  }
}

// === ELIMINAR LOTE ===
async function eliminarLote(id) {
  if (confirm('¿Seguro que quieres eliminar este lote?')) {
    try {
      const token = localStorage.getItem('token');

      await window.fetchWithTimeout(`${API_URL}/lotes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }, 15000);

      cargarLotes();
      alert('Lote eliminado exitosamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar lote: ' + error.message);
    }
  }
}

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const token = localStorage.getItem('token');

  if (!currentUser || !['admin', 'empleado'].includes(currentUser.role)) {
    document.querySelector('main').innerHTML = `
      <section>
        <h2>Acceso Denegado</h2>
        <p>Solo Administradores y Empleados pueden gestionar lotes.</p>
        <a href="index.html">Volver al Dashboard</a>
      </section>
    `;
    return;
  }

  const loteForm = document.getElementById('loteForm');
  if (loteForm) {
    loteForm.style.display = 'grid';
    loteForm.onsubmit = guardarLote;
  }
  document.getElementById('loteTable').style.display = 'table';

  setTimeout(() => {
    if (token) {
      cargarLotes();
    } else {
      window.location.href = 'login.html';
    }
  }, 100);
});