// --- Lógica de Carga (BLINDADA) ---
async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const lotes = await res.json();
    const select = document.getElementById('loteSelect');
    select.innerHTML = '<option value="">Selecciona un Lote</option>';

    // Filtramos solo lotes disponibles
    lotes.filter(lote => lote.estado === 'disponible').forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (Stock: ${lote.cantidad})`;
      option.dataset.cantidad = lote.cantidad; // Guardamos la cantidad
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes para select:', error);
  }
}

async function cargarVentas() {
  try {
    const token = localStorage.getItem('token');
    // V 3.0: Obtenemos la granja activa
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // V 3.0: Añadimos granjaId al fetch
    const res = await fetch(`${window.API_URL}/ventas?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const ventas = await res.json();
    const tbody = document.getElementById('ventaTableBody');
    tbody.innerHTML = '';

    if (Array.isArray(ventas) && ventas.length > 0) {
      ventas.forEach(venta => {
        const tr = document.createElement('tr');
        // Usamos el 'venta.Lote.loteId' que el backend nos da
        tr.innerHTML = `
          <td>${venta.Lote ? venta.Lote.loteId : 'Lote Borrado'}</td>
          <td>${venta.cantidadVendida}</td>
          <td>${venta.peso.toFixed(2)}</td>
          <td>${venta.precio.toFixed(2)}</td>
          <td>${new Date(venta.fecha).toLocaleDateString()}</td>
          <td>${venta.cliente || 'Sin cliente'}</td>
          <td>
            <button onclick="eliminarVenta(${venta.id})" class="btn btn-sm btn-peligro">Revertir</button>
          </td>
        `;
        // Nota: Editar una venta es complejo por las transacciones de stock.
        // Es más seguro solo "Revertir" (Eliminar).
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

// --- Funciones CRUD (BLINDADAS) ---

async function guardarVenta(e) {
  e.preventDefault();

  const ventaId = document.getElementById('ventaId').value;
  if (ventaId) {
    alert('La edición de ventas no está soportada. Por favor, revierta la venta y créela de nuevo.');
    return;
  }

  // V 3.0: Obtenemos la granja activa
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

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
    cliente: document.getElementById('cliente').value || 'Sin cliente',
    granjaId: granjaId // V 3.0: Añadido
  };

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/ventas`, {
      method: 'POST',
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

    cerrarFormulario();
    await cargarVentas();
    await cargarLotesForSelect(); // Recargamos lotes para actualizar stock

  } catch (error) {
    console.error('Error de conexión:', error);
  }
}

async function editarVenta(id) {
  // La edición de ventas es muy compleja por las transacciones de stock.
  // Es más seguro eliminar (revertir) y crear una nueva.
  alert('Función no implementada. Por favor, "Revierta" la venta y regístrela de nuevo.');
}

async function eliminarVenta(id) {
  if (confirm('¿Seguro que quieres REVERTIR esta venta? Esto devolverá el stock al lote.')) {
    try {
      const token = localStorage.getItem('token');
      // V 3.0: Obtenemos la granja activa
      const granjaId = getSelectedGranjaId();
      if (!granjaId) return;

      // V 3.0: Añadimos granjaId al fetch
      const res = await fetch(`${API_URL}/ventas/${id}?granjaId=${granjaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        cargarVentas();
        cargarLotesForSelect(); // Actualizar stock en el select
      } else {
        const errorText = await res.json();
        alert('Error al revertir venta: ' + (errorText.error || 'Desconocido'));
      }
    } catch (error) {
      console.error('Error al revertir venta:', error);
    }
  }
}

// --- Event Listener Principal (BLINDADO) ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  // V 3.0: Poner el nombre de la granja en el título
  if (granja) {
    document.querySelector('header h1').textContent = `Ventas (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('ventaForm');
  const formContainer = document.getElementById('formContainer');

  // Evento para autocompletar la cantidad al seleccionar lote
  const loteSelect = document.getElementById('loteSelect');
  if (loteSelect) {
    loteSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      const cantidadInput = document.getElementById('cantidadVendida');
      if (selectedOption && selectedOption.dataset.cantidad) {
        cantidadInput.value = selectedOption.dataset.cantidad;
        cantidadInput.max = selectedOption.dataset.cantidad; // Opcional: validación HTML
      } else {
        cantidadInput.value = '';
        cantidadInput.max = '';
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
        form.reset();
        document.getElementById('ventaId').value = '';
        formTitle.textContent = 'Registrar Venta';
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