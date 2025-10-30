/// === MOSTRAR LOTES ===
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

// === FUNCIÓN REUTILIZABLE: fetch con timeout ===
async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(id);

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error('Respuesta no es JSON');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Tiempo agotado. El servidor no respondió a tiempo.');
    }
    throw error;
  }
}

// === CARGAR LOTES ===
async function cargarLotes() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No estás autenticado');
      window.location.href = 'login.html';
      return;
    }

    // === FUNCIÓN REUTILIZABLE: fetch con timeout ===
    const lotes = await window.fetchWithTimeout(`${API_URL}/lotes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, 15000); // 15 segundos

    mostrarLotes(lotes);
  } catch (error) {
    console.error('Error al cargar lotes:', error);
    alert('Error al cargar lotes: ' + error.message);
  }
}

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

    // Usa fetchWithTimeout
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
    console.log('Lote creado:', nuevoLote);
  } catch (error) {
    console.error('Error:', error);
    alert('Error al guardar lote: ' + error.message);
  }
}

async function editarLote(id) {
  try {
    const token = localStorage.getItem('token');
    console.log('Token usado para editar:', token); // Depuración
    const res = await fetch(`${API_URL}/lotes/${id}`, { // Usar id interno
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lote = await res.json();
    document.getElementById('loteId').value = lote.loteId;
    document.getElementById('cantidad').value = lote.cantidad;
    document.getElementById('pesoInicial').value = lote.pesoInicial;
    document.getElementById('fechaIngreso').value = lote.fechaIngreso.split('T')[0]; // Formato YYYY-MM-DD
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
      const putRes = await fetch(`${API_URL}/lotes/${id}`, { // Usar id interno
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedLote)
      });
      if (putRes.ok) {
        document.getElementById('loteForm').reset();
        document.getElementById('loteForm').onsubmit = guardarLote;
        cargarLotes();
        alert('Lote actualizado exitosamente');
      } else {
        const errorData = await putRes.json();
        console.error('Error al actualizar:', errorData);
        alert('Error al actualizar lote: ' + (errorData.error || 'Desconocido'));
      }
    };
  } catch (error) {
    console.error('Error al editar lote:', error);
    alert('Error al cargar datos del lote. Intenta de nuevo.');
  }
}

async function eliminarLote(id) {
  if (confirm('¿Seguro que quieres eliminar este lote?')) {
    try {
      const token = localStorage.getItem('token');
      console.log('Token usado para eliminar:', token); // Depuración
      const res = await fetch(`${API_URL}/lotes/${id}`, { // Usar id interno
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        cargarLotes();
        alert('Lote eliminado exitosamente');
      } else {
        const errorData = await res.json();
        console.error('Error al eliminar:', errorData);
        alert('Error al eliminar lote: ' + (errorData.error || 'Desconocido'));
      }
    } catch (error) {
      alert('Error de conexión al eliminar lote');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const token = localStorage.getItem('token');

  // 1. Verifica rol
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

  // 2. Mostrar UI
  const loteForm = document.getElementById('loteForm');
  if (loteForm) {
    loteForm.style.display = 'grid';
    loteForm.onsubmit = guardarLote;
  }
  document.getElementById('loteTable').style.display = 'table';

  // 3. CARGAR LOTES CON RETRASO
  setTimeout(() => {
    if (token) {
      cargarLotes();
    } else {
      console.warn('Token no disponible. Redirigiendo...');
      window.location.href = 'login.html';
    }
  }, 100);
});