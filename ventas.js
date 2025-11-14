// --- V 3.1: Variable global para la lista de clientes ---
let listaClientes = [];

// --- Lógica de Carga (BLINDADA) ---
async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const lotes = await res.json();
    const select = document.getElementById('loteSelect');
    select.innerHTML = '<option value="">Selecciona un Lote</option>';

    lotes.filter(lote => lote.estado === 'disponible').forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (Stock: ${lote.cantidad})`;
      option.dataset.cantidad = lote.cantidad;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes para select:', error);
  }
}

// --- NUEVO V 3.1: Cargar Clientes para la búsqueda ---
async function cargarClientes() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/clientes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    listaClientes = await res.json();
  } catch (error) {
    console.error('Error al cargar clientes para select:', error);
  }
}

// --- Cargar Clientes ---
async function cargarClientesForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${API_URL}/clientes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const clientes = await res.json();
    const select = document.getElementById('clienteSelect');
    select.innerHTML = '<option value="">Selecciona un Cliente</option>';

    clientes.forEach(cliente => {
      const option = document.createElement('option');
      option.value = cliente.id;
      option.textContent = `${cliente.nombre} (${cliente.identificacion})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar clientes para select:', error);
  }
}

async function cargarVentas() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    // Gracias al parche de index.js, esto ahora trae Lote.loteId y Cliente.nombre
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
        tr.innerHTML = `
          <td>${venta.Lote ? venta.Lote.loteId : 'N/A'}</td>
          <td>${venta.Cliente ? venta.Cliente.nombre : 'N/A'}</td>
          <td>${venta.cantidadVendida}</td>
          <td>${venta.peso.toFixed(2)}</td>
          <td>${venta.precio.toFixed(2)}</td>
          <td>${new Date(venta.fecha).toLocaleDateString()}</td>
          <td>
            <button onclick="eliminarVenta(${venta.id})" class="btn btn-sm btn-peligro">Revertir</button>
          </td>
        `;
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
  document.getElementById('clienteId').value = '';
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

  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const loteId = document.getElementById('loteSelect').value;
  const clienteId = document.getElementById('clienteId').value; // <-- V 3.1: Obtenido del input oculto

  if (!loteId || !clienteId) {
    alert('Por favor selecciona un Lote y un Cliente válido.');
    return;
  }

  const venta = {
    loteId: parseInt(loteId),
    clienteId: parseInt(clienteId), // <-- V 3.1
    cantidadVendida: parseInt(document.getElementById('cantidadVendida').value),
    peso: parseFloat(document.getElementById('peso').value),
    precio: parseFloat(document.getElementById('precio').value),
    fecha: document.getElementById('fecha').value,
    granjaId: granjaId
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
  alert('Función no implementada. Por favor, "Revierta" la venta y regístrela de nuevo.');
}

async function eliminarVenta(id) {
  if (confirm('¿Seguro que quieres REVERTIR esta venta? Esto devolverá el stock al lote.')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();
      if (!granjaId) return;

      const res = await fetch(`${window.API_URL}/ventas/${id}?granjaId=${granjaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        cargarVentas();
        cargarLotesForSelect();
      } else {
        const errorText = await res.json();
        alert('Error al revertir venta: ' + (errorText.error || 'Desconocido'));
      }
    } catch (error) {
      console.error('Error al revertir venta:', error);
    }
  }
}

// --- V 3.1: LÓGICA DEL COMBOBOX CON BÚSQUEDA (CLIENTE) ---

function setupClienteSearch() {
  const searchInput = document.getElementById('clienteSearch');
  const resultsContainer = document.getElementById('clienteResults');
  const dropdown = document.getElementById('clienteDropdown');
  const hiddenInput = document.getElementById('clienteId');

  // 1. Mostrar resultados al escribir
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    hiddenInput.value = ''; // Limpiar ID si el usuario escribe

    if (query.length < 2) {
      resultsContainer.innerHTML = '';
      dropdown.classList.remove('is-open');
      return;
    }

    const filtrados = listaClientes.filter(c =>
      c.nombre.toLowerCase().includes(query) ||
      c.identificacion.includes(query)
    );

    resultsContainer.innerHTML = '';
    if (filtrados.length > 0) {
      filtrados.forEach(c => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.innerHTML = `<strong>${c.nombre}</strong> <span>(${c.tipoIdentificacion}: ${c.identificacion})</span>`;
        item.onclick = () => {
          seleccionarCliente(c);
        };
        resultsContainer.appendChild(item);
      });
      dropdown.classList.add('is-open');
    } else {
      dropdown.classList.remove('is-open');
    }
  });

  // 2. Función para seleccionar un cliente
  function seleccionarCliente(cliente) {
    searchInput.value = `${cliente.nombre} (${cliente.identificacion})`;
    hiddenInput.value = cliente.id;
    dropdown.classList.remove('is-open');
  }

  // 3. Cerrar si se hace clic fuera
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove('is-open');
    }
  });
}

// --- V 3.1: LÓGICA DEL MODAL DE CREACIÓN RÁPIDA (CLIENTE) ---

function setupQuickAddClienteModal() {
  const modal = document.getElementById('quickAddModal');
  const openBtn = document.getElementById('openQuickAddCliente');
  const closeBtn = document.getElementById('closeQuickAddModal');
  const form = document.getElementById('quickAddForm');
  const errorMsg = document.getElementById('quickAddError');

  openBtn.addEventListener('click', () => {
    modal.classList.add('is-open');
    form.reset();
  });
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('is-open');
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('is-open');
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const nuevoCliente = {
      nombre: document.getElementById('quick_nombre').value,
      tipoIdentificacion: document.getElementById('quick_tipoIdentificacion').value,
      identificacion: document.getElementById('quick_identificacion').value,
      granjaId: granjaId // Se asigna a la granja activa
    };

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${window.API_URL}/clientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(nuevoCliente)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error del servidor');
      }

      const clienteCreado = await res.json();

      // 1. Cerrar el modal
      modal.classList.remove('is-open');
      form.reset();

      // 2. Actualizar la lista global de clientes
      await cargarClientes();

      // 3. Autoseleccionar el cliente recién creado
      document.getElementById('clienteSearch').value = `${clienteCreado.nombre} (${clienteCreado.identificacion})`;
      document.getElementById('clienteId').value = clienteCreado.id;

    } catch (error) {
      errorMsg.textContent = `Error: ${error.message}`;
      errorMsg.style.display = 'block';
    }
  };
}

// --- Event Listener Principal (BLINDADO) ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  if (granja) {
    document.querySelector('header h1').textContent = `Ventas (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('ventaForm');
  const formContainer = document.getElementById('formContainer');

  if (currentUser && currentUser.role !== 'viewer') {
    toggleBtn.style.display = 'block';

    toggleBtn.addEventListener('click', () => {
      const isOpen = formContainer.classList.contains('is-open');
      if (isOpen) {
        cerrarFormulario();
      } else {
        form.reset();
        document.getElementById('ventaId').value = '';
        document.getElementById('clienteId').value = '';
        formTitle.textContent = 'Registrar Venta';
        abrirFormulario();
      }
    });

    cancelBtn.addEventListener('click', cerrarFormulario);
    form.onsubmit = guardarVenta;

    // V 3.1: Inicializar búsqueda y modal
    setupClienteSearch();
    setupQuickAddClienteModal();

  } else {
    toggleBtn.style.display = 'none';
  }

  cargarLotesForSelect();
  cargarClientes(); // <-- NUEVO V 3.1
  cargarVentas();
});