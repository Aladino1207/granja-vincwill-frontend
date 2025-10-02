// Función para cargar lotes en el <select>
async function cargarLotesForSelect() {
  try {
    const res = await fetch(`${window.API_URL}/lotes`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('Respuesta de /lotes - Status:', res.status, 'Status Text:', res.statusText);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    console.log('Datos recibidos de /lotes:', lotes);
    const select = document.getElementById('loteSelect');
    if (!select) throw new Error('Elemento loteSelect no encontrado');
    select.innerHTML = '<option value="">Selecciona un Lote</option>';
    lotes.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (Cantidad: ${lote.cantidad})`;
      select.appendChild(option);
    });
    console.log('Lotes cargados en select con éxito');
  } catch (error) {
    console.error('Error al cargar lotes para select:', error);
    alert('Error al cargar lotes: ' + error.message);
  }
}

// Función para cargar los costos
async function cargarCostos() {
  try {
    const res = await fetch(`${window.API_URL}/costos`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('Respuesta de /costos - Status:', res.status, 'Status Text:', res.statusText);
    const costos = await res.json();
    console.log('Datos recibidos de /costos:', costos);
    const tbody = document.getElementById('tablaCostos');
    if (!tbody) throw new Error('Elemento tablaCostos no encontrado');
    tbody.innerHTML = '';
    if (Array.isArray(costos) && costos.length > 0) {
      costos.forEach(costo => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${costo.loteId || 'N/A'}</td>
          <td>${costo.categoria || 'N/A'}</td>
          <td>${costo.descripcion || 'N/A'}</td>
          <td>${costo.monto || 0}</td>
          <td>${costo.fecha ? new Date(costo.fecha).toLocaleDateString() : 'N/A'}</td>
          <td>
            <button onclick="editarCosto(${costo.id || 0})">Editar</button>
            <button onclick="eliminarCosto(${costo.id || 0})">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      console.log('Tabla rellenada con éxito');
    } else {
      tbody.innerHTML = '<tr><td colspan="6">No hay costos registrados</td></tr>';
      console.log('Tabla vacía, mostrando mensaje');
    }
  } catch (error) {
    console.error('Error al cargar costos:', error);
    const tbody = document.getElementById('tablaCostos');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6">Error al cargar costos: ${error.message}</td></tr>`;
  }
}

async function guardarCosto(e) {
  e.preventDefault();
  const costo = {
    loteId: parseInt(document.getElementById('loteSelect').value),
    categoria: document.getElementById('categoria').value,
    descripcion: document.getElementById('descripcion').value,
    monto: parseFloat(document.getElementById('monto').value),
    fecha: document.getElementById('fecha').value
  };
  try {
    const res = await fetch(`${window.API_URL}/costos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(costo)
    });
    console.log('Respuesta de guardarCosto - Status:', res.status, 'Status Text:', res.statusText);
    if (res.ok) {
      document.getElementById('costoForm').reset();
      await cargarCostos();
      console.log('Costo guardado y tabla recargada');
    } else {
      const errorText = await res.text();
      console.error('Error al guardar costo:', errorText);
      alert('Error al guardar costo: ' + (errorText || 'Desconocido'));
    }
  } catch (error) {
    console.error('Error de conexión:', error);
    alert('Error de conexión');
  }
}

async function editarCosto(id) {
  try {
    const res = await fetch(`${window.API_URL}/costos/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const costo = await res.json();
    document.getElementById('loteSelect').value = costo.loteId;
    document.getElementById('categoria').value = costo.categoria;
    document.getElementById('descripcion').value = costo.descripcion;
    document.getElementById('monto').value = costo.monto;
    document.getElementById('fecha').value = costo.fecha.split('T')[0];
    document.getElementById('costoForm').onsubmit = async (e) => {
      e.preventDefault();
      await fetch(`${window.API_URL}/costos/${id}`, {
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
      await fetch(`${window.API_URL}/costos/${id}`, {
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
  const costoForm = document.getElementById('costoForm');
  const costoTable = document.getElementById('costoTable');
  
  console.log('Verificando elementos - costoForm:', costoForm, 'costoTable:', costoTable);

  if (currentUser && currentUser.role !== 'viewer') {
    if (costoForm) {
      costoForm.style.display = 'grid';
    } else {
      console.error('Elemento costoForm no encontrado en el DOM');
    }
    if (costoTable) {
      costoTable.style.display = 'table';
    } else {
      console.error('Elemento costoTable no encontrado en el DOM');
    }
  } else {
    console.log('Rol de usuario:', currentUser ? currentUser.role : 'No autenticado');
  }
  cargarLotesForSelect();
  cargarCostos();
});