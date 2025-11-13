// --- Lógica de Carga ---

async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/lotes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const select = document.getElementById('loteSelect');
    if (!select) throw new Error('Elemento loteSelect no encontrado');
    select.innerHTML = '<option value="">Selecciona un Lote</option>';
    lotes.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (Stock: ${lote.cantidad})`;
      // Guardamos la cantidad en un dataset por si la necesitamos validar
      option.dataset.cantidad = lote.cantidad;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes para select:', error);
  }
}

async function cargarVentas() {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No autenticado');

    const res = await fetch(`${window.API_URL}/ventas`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const ventas = await res.json();
    const tbody = document.getElementById('ventaTableBody');

    if (!tbody) throw new Error('Elemento ventaTableBody no encontrado'); // Esto ya no fallará
    tbody.innerHTML = '';

    if (Array.isArray(ventas) && ventas.length > 0) {
      ventas.forEach(venta => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${venta.loteId}</td>
          <td>${venta.cantidadVendida}</td>
          <td>${venta.peso.toFixed(2)}</td>
          <td>${venta.precio.toFixed(2)}</td>
          <td>${new Date(venta.fecha).toLocaleDateString()}</td>
          <td>${venta.cliente || 'Sin cliente'}</td>
          <td>
            <button onclick="editarVenta(${venta.id})" class="btn btn-sm btn-primario" style="background-color: #f39c12;">Editar</button>
            <button onclick="eliminarVenta(${venta.id})" class="btn btn-sm btn-peligro">Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="7">No hay ventas registradas</td></tr>';
    }
  } catch (error) {
    console.error('Error al cargar ventas:', error);
  }
}

// --- LÓGICA DEL FORMULARIO DESPLEGABLE ---

function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}

function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Registrar Nueva Venta';

  document.getElementById('ventaForm').reset();
  document.getElementById('ventaId').value = '';
  document.getElementById('formTitle').textContent = 'Registrar Venta';
}

// --- Funciones CRUD ---

async function guardarVenta(e) {
  e.preventDefault();

  const ventaId = document.getElementById('ventaId').value;
  const esEdicion = !!ventaId;

  // Validación básica
  const loteSelect = document.getElementById('loteSelect');
  const loteId = loteSelect.value;
  if (!loteId) {
    alert('Por favor selecciona un lote.');
    return;
  }

  const venta = {
    loteId: parseInt(loteId),
    cantidadVendida: parseInt(document.getElementById('cantidadVendida').value),
    peso: parseFloat(document.getElementById('peso').value),
    precio: parseFloat(document.getElementById('precio').value),
    fecha: document.getElementById('fecha').value,
    cliente: document.getElementById('cliente').value || 'Sin cliente'
  };

  const url = esEdicion
    ? `${window.API_URL}/ventas/${ventaId}`
    : `${window.API_URL}/ventas`;
  const method = esEdicion ? 'PUT' : 'POST';

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(venta)
    });

    const responseText = await res.text();

    if (!res.ok) {
      const errorData = responseText ? JSON.parse(responseText).error || responseText : 'Error desconocido';
      alert('Error al guardar venta: ' + errorData);
      return;
    }

    // Éxito
    cerrarFormulario();
    await cargarVentas();
    await cargarLotesForSelect(); // Recargamos lotes para actualizar stock en el select

  } catch (error) {
    console.error('Error de conexión:', error);
    alert('Error de conexión');
  }
}

async function editarVenta(id) {
  try {
    const res = await fetch(`${window.API_URL}/ventas/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const venta = await res.json();

    document.getElementById('formTitle').textContent = 'Editar Venta';
    document.getElementById('ventaId').value = venta.id;
    document.getElementById('loteSelect').value = venta.loteId;
    document.getElementById('cantidadVendida').value = venta.cantidadVendida;
    document.getElementById('peso').value = venta.peso;
    document.getElementById('precio').value = venta.precio;
    document.getElementById('fecha').value = venta.fecha.split('T')[0];
    document.getElementById('cliente').value = venta.cliente || '';

    abrirFormulario();
    window.scrollTo(0, 0);

  } catch (error) {
    console.error('Error al editar venta:', error);
    alert('Error al editar venta: ' + error.message);
  }
}

async function eliminarVenta(id) {
  if (confirm('¿Seguro que quieres eliminar esta venta? Esto devolverá los pollos al lote.')) {
    try {
      const res = await fetch(`${window.API_URL}/ventas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        cargarVentas();
        cargarLotesForSelect(); // Actualizar stock
      } else {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
    } catch (error) {
      console.error('Error al eliminar venta:', error);
      alert('Error al eliminar venta');
    }
  }
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('ventaForm');
  const formContainer = document.getElementById('formContainer');

  // Lógica automática para sugerir cantidad (Opcional)
  const loteSelect = document.getElementById('loteSelect');
  if (loteSelect) {
    loteSelect.addEventListener('change', (e) => {
      // Al cambiar de lote, podríamos sugerir la cantidad total disponible
      // (Esto es opcional, pero útil)
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (selectedOption && selectedOption.dataset.cantidad) {
        // Descomenta si quieres que se autocomplete la cantidad máxima
        // document.getElementById('cantidadVendida').value = selectedOption.dataset.cantidad;
      }
    });
  }

  if (currentUser && currentUser.role !== 'viewer') {
    toggleBtn.style.display = 'block';

    toggleBtn.addEventListener('click', () => {
      const isOpen = formContainer.classList.contains('is-open');
      if (isOpen) {
        cerrarFormulario();
      } else {
        // Abrir para crear
        document.getElementById('formTitle').textContent = 'Registrar Venta';
        document.getElementById('ventaId').value = '';
        document.getElementById('ventaForm').reset();
        abrirFormulario();
      }
    });

    cancelBtn.addEventListener('click', cerrarFormulario);
    form.onsubmit = guardarVenta;

  } else {
    toggleBtn.style.display = 'none';
  }

  cargarLotesForSelect();
  cargarVentas();

});

