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
      option.textContent = `${lote.loteId} (Cantidad: ${lote.cantidad || 'N/A'})`;
      select.appendChild(option);
    });
    console.log('Lotes cargados en select con éxito');
  } catch (error) {
    console.error('Error al cargar lotes para select:', error);
    alert('Error al cargar lotes: ' + error.message);
  }
}

// Función para cargar los seguimientos
async function cargarSeguimiento() {
  try {
    const res = await fetch(`${window.API_URL}/seguimiento`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('Respuesta de /seguimiento - Status:', res.status, 'Status Text:', res.statusText);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const seguimiento = await res.json();
    console.log('Datos recibidos de /seguimiento:', seguimiento);
    const tbody = document.getElementById('tablaSeguimiento'); // Corregido a tablaSeguimiento
    if (!tbody) throw new Error('Elemento tablaSeguimiento no encontrado');
    tbody.innerHTML = '';
    if (Array.isArray(seguimiento) && seguimiento.length > 0) {
      seguimiento.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${s.loteId || 'N/A'}</td>
          <td>${s.semana || 'N/A'}</td>
          <td>${s.peso || 0}</td>
          <td>${s.consumo || 0}</td>
          <td>${s.observaciones || 'N/A'}</td>
          <td>${s.fecha ? new Date(s.fecha).toLocaleDateString() : 'N/A'}</td>
          <td>
            <button onclick="editarSeguimiento(${s.id || 0})">Editar</button>
            <button onclick="eliminarSeguimiento(${s.id || 0})">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      console.log('Tabla de seguimiento rellenada con éxito');
    } else {
      tbody.innerHTML = '<tr><td colspan="7">No hay seguimientos registrados</td></tr>';
      console.log('Tabla de seguimiento vacía, mostrando mensaje');
    }
  } catch (error) {
    console.error('Error al cargar seguimiento:', error);
    const tbody = document.getElementById('tablaSeguimiento');
    if (tbody) tbody.innerHTML = `<tr><td colspan="7">Error al cargar seguimiento: ${error.message}</td></tr>`;
  }
}

// Función para guardar un seguimiento
async function guardarSeguimiento(e) {
  e.preventDefault();
  const seguimiento = {
    loteId: parseInt(document.getElementById('loteSelect').value), // Corregido a loteSelect
    semana: parseInt(document.getElementById('semana').value),
    peso: parseFloat(document.getElementById('peso').value),
    consumo: parseFloat(document.getElementById('consumo').value),
    observaciones: document.getElementById('observaciones').value,
    fecha: new Date().toISOString().split('T')[0] // Usa fecha actual si no hay input
  };
  console.log('Datos enviados a /seguimiento:', seguimiento);
  try {
    const res = await fetch(`${window.API_URL}/seguimiento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(seguimiento)
    });
    console.log('Respuesta de guardarSeguimiento - Status:', res.status, 'Status Text:', res.statusText);
    if (res.ok) {
      document.getElementById('seguimientoForm').reset();
      await cargarSeguimiento();
      console.log('Seguimiento guardado y tabla recargada');
    } else {
      const errorText = await res.text();
      console.error('Error al guardar seguimiento - Detalle:', errorText);
      alert('Error al guardar seguimiento: ' + (errorText || 'Desconocido'));
    }
  } catch (error) {
    console.error('Error de conexión o inesperado:', error);
    alert('Error de conexión o inesperado');
  }
}

// Función para editar un seguimiento
async function editarSeguimiento(id) {
  try {
    console.log('Intentando editar seguimiento con id:', id);
    const res = await fetch(`${window.API_URL}/seguimiento/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('Respuesta de editarSeguimiento - Status:', res.status, 'Status Text:', res.statusText);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const s = await res.json();
    console.log('Datos recibidos para edición:', s);
    document.getElementById('loteSelect').value = s.loteId; // Corregido a loteSelect
    document.getElementById('semana').value = s.semana;
    document.getElementById('peso').value = s.peso;
    document.getElementById('consumo').value = s.consumo;
    document.getElementById('observaciones').value = s.observaciones || '';
    // No hay input de fecha, se usará la fecha actual al guardar
    document.getElementById('seguimientoForm').onsubmit = async (e) => {
      e.preventDefault();
      const updatedReg = {
        loteId: parseInt(document.getElementById('loteSelect').value),
        semana: parseInt(document.getElementById('semana').value),
        peso: parseFloat(document.getElementById('peso').value),
        consumo: parseFloat(document.getElementById('consumo').value),
        observaciones: document.getElementById('observaciones').value,
        fecha: new Date().toISOString().split('T')[0]
      };
      const putRes = await fetch(`${window.API_URL}/seguimiento/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updatedReg)
      });
      console.log('Respuesta de PUT - Status:', putRes.status, 'Status Text:', putRes.statusText);
      if (putRes.ok) {
        document.getElementById('seguimientoForm').reset();
        document.getElementById('seguimientoForm').onsubmit = guardarSeguimiento;
        cargarSeguimiento();
      } else {
        throw new Error(`HTTP error! status: ${putRes.status}`);
      }
    };
  } catch (error) {
    console.error('Error al editar seguimiento:', error);
    alert('Error al editar seguimiento: ' + error.message);
  }
}

// Función para eliminar un seguimiento
async function eliminarSeguimiento(id) {
  if (confirm('¿Seguro que quieres eliminar este seguimiento?')) {
    try {
      console.log('Intentando eliminar seguimiento con id:', id);
      const res = await fetch(`${window.API_URL}/seguimiento/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      console.log('Respuesta de eliminarSeguimiento - Status:', res.status, 'Status Text:', res.statusText);
      if (res.ok) {
        cargarSeguimiento();
      } else {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
    } catch (error) {
      console.error('Error al eliminar seguimiento:', error);
      alert('Error al eliminar seguimiento: ' + error.message);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && currentUser.role !== 'viewer') {
    const seguimientoForm = document.getElementById('seguimientoForm');
    const seguimientoTable = document.getElementById('seguimientoTable');
    if (seguimientoForm) seguimientoForm.style.display = 'grid';
    if (seguimientoTable) seguimientoTable.style.display = 'table';
  }
  cargarLotesForSelect(); // Carga los lotes al iniciar
  cargarSeguimiento();   // Carga los seguimientos al iniciar
});

// Vincula el evento submit al formulario
document.getElementById('seguimientoForm').onsubmit = guardarSeguimiento;