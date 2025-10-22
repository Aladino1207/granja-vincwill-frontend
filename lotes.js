async function cargarLotes() {
  try {
    const token = localStorage.getItem('token');
    console.log('Token usado:', token); // Depuración
    const res = await fetch(`${API_URL}/lotes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const tbody = document.getElementById('loteTableBody');
    if (!tbody) throw new Error('Elemento loteTableBody no encontrado');
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
          <button onclick="editarLote(${lote.id})">Editar</button> <!-- Usar id interno -->
          <button onclick="eliminarLote(${lote.id})">Eliminar</button> <!-- Usar id interno -->
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error al cargar lotes:', error);
    alert('Error al cargar lotes. Intenta recargar la página.');
  }
}

async function guardarLote(e) {
  e.preventDefault();
  console.log('Intentando guardar lote...'); // Depuración

  const loteId = document.getElementById('loteId').value;
  const cantidad = parseInt(document.getElementById('cantidad').value);
  const pesoInicial = parseFloat(document.getElementById('pesoInicial').value);
  const fechaIngreso = document.getElementById('fechaIngreso').value;
  const estado = document.getElementById('estado').value === 'Activo' ? 'disponible' : 'vendido'; // Mapear estados

  // Validación básica
  if (!loteId || isNaN(cantidad) || isNaN(pesoInicial) || !fechaIngreso) {
    alert('Por favor, completa todos los campos correctamente.');
    return;
  }

  const lote = {
    loteId,
    cantidad,
    pesoInicial,
    fechaIngreso,
    estado
  };

  try {
    const token = localStorage.getItem('token');
    console.log('Token usado para guardar:', token); // Depuración
    console.log('Datos enviados:', lote); // Depuración
    const res = await fetch(`${API_URL}/lotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(lote)
    });
    if (res.ok) {
      document.getElementById('loteForm').reset();
      cargarLotes();
      console.log('Lote guardado exitosamente');
      alert('Lote guardado exitosamente');
    } else {
      const errorData = await res.json();
      console.error('Error del servidor:', errorData);
      alert('Error al guardar lote: ' + (errorData.error || 'Desconocido'));
    }
  } catch (error) {
    console.error('Error de conexión:', error);
    alert('Error de conexión al servidor. Intenta de nuevo más tarde.');
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
  if (currentUser && ['admin', 'empleado'].includes(currentUser.role)) {
    const loteForm = document.getElementById('loteForm');
    if (loteForm) {
      loteForm.style.display = 'grid';
      loteForm.onsubmit = guardarLote; // Vincula el evento explícitamente
    }
    document.getElementById('loteTable').style.display = 'table';
    cargarLotes(); // Carga los lotes al iniciar
  } else if (currentUser) {
    document.querySelector('main').innerHTML = `
      <section>
        <h2>Acceso Denegado</h2>
        <p>Solo los usuarios con rol de Administrador o Empleado pueden gestionar lotes.</p>
        <a href="index.html">Volver al Dashboard</a>
      </section>
    `;
  }
});