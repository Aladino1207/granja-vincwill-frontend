// --- Variables Globales ---
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
  } catch (error) { console.error(error); }
}

async function cargarClientes() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/clientes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) listaClientes = await res.json();
  } catch (error) { console.error(error); }
}

async function cargarVentas() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/ventas?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const ventas = await res.json();
    const tbody = document.getElementById('ventaTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (Array.isArray(ventas) && ventas.length > 0) {
      ventas.forEach(venta => {
        const tr = document.createElement('tr');
        const total = (venta.peso * venta.precio).toFixed(2);

        tr.innerHTML = `
          <td>${venta.Lote ? venta.Lote.loteId : 'N/A'}</td>
          <td>${venta.Cliente ? venta.Cliente.nombre : 'N/A'}</td>
          <td>${venta.cantidadVendida}</td>
          <td>${venta.peso.toFixed(2)}</td>
          <td>$${venta.precio.toFixed(2)}</td>
          <td><strong>$${total}</strong></td>
          <td>${new Date(venta.fecha).toLocaleDateString()}</td>
          <td>
            <button onclick="eliminarVenta(${venta.id})" class="btn btn-sm btn-peligro">Revertir</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="8">No hay ventas registradas.</td></tr>';
    }
  } catch (error) { console.error(error); }
}

// --- CALCULADORA DE VENTA (Tiempo Real) ---
function calcularTotalVenta() {
  const peso = parseFloat(document.getElementById('peso').value) || 0;
  const precio = parseFloat(document.getElementById('precio').value) || 0;
  const unidad = document.getElementById('unidadPeso').value;

  // Actualizar etiqueta visual
  document.getElementById('lblPrecioUnidad').textContent = `/${unidad}`;

  const total = peso * precio;
  document.getElementById('displayTotalVenta').textContent = `$${total.toFixed(2)}`;
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
  const searchInput = document.getElementById('clienteSearch');
  if (searchInput) searchInput.value = '';
  document.getElementById('displayTotalVenta').textContent = '$0.00';
  document.getElementById('formTitle').textContent = 'Registrar Venta';
}

// --- Funciones CRUD ---

async function guardarVenta(e) {
  e.preventDefault();
  const ventaId = document.getElementById('ventaId').value;
  if (ventaId) { alert('Edición no soportada.'); return; }
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const loteId = document.getElementById('loteSelect').value;
  const clienteId = document.getElementById('clienteId').value;

  if (!loteId || !clienteId) { alert('Selecciona Lote y Cliente.'); return; }

  // Datos crudos
  let peso = parseFloat(document.getElementById('peso').value);
  let precio = parseFloat(document.getElementById('precio').value);
  const unidad = document.getElementById('unidadPeso').value;

  // --- CONVERSIÓN A ESTÁNDAR (KG) ---
  // Si el usuario vendió en Libras, convertimos a Kilos para la base de datos
  // PERO el precio también debe ajustarse (Precio por Libra -> Precio por Kilo)
  // Total en $ debe ser el mismo. 
  // Ejemplo: 100 lb a $1.00/lb = $100.
  // En kg: 45.36 kg. Precio/kg = $100 / 45.36 = $2.204/kg

  if (unidad === 'lb') {
    const pesoEnLibras = peso;
    const precioPorLibra = precio;

    peso = pesoEnLibras / 2.20462; // Convertir peso a kg
    precio = precioPorLibra * 2.20462; // Convertir precio a $/kg
  }

  const venta = {
    loteId: parseInt(loteId),
    clienteId: parseInt(clienteId),
    cantidadVendida: parseInt(document.getElementById('cantidadVendida').value),
    peso: peso,   // Guardado siempre en kg
    precio: precio, // Guardado siempre en $/kg
    fecha: document.getElementById('fecha').value,
    granjaId: granjaId
  };

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${window.API_URL}/ventas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(venta)
    });

    if (!res.ok) {
      const errorText = await res.json();
      alert('Error: ' + (errorText.error || 'Desconocido'));
      return;
    }

    cerrarFormulario();
    await cargarVentas();
    await cargarLotesForSelect();

  } catch (error) { alert('Error de conexión'); }
}

async function eliminarVenta(id) {
  // Confirmación clara para el usuario
  if (!confirm('¿Seguro que quieres REVERTIR esta venta? Esto devolverá los pollos al stock del lote.')) {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/ventas/${id}?granjaId=${granjaId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      // ÉXITO: Recargamos la lista de ventas y el selector de lotes (para ver el stock recuperado)
      await cargarVentas();
      await cargarLotesForSelect();
      // Opcional: alert('Venta revertida correctamente');
    } else {
      // ERROR: Mostramos el mensaje que envió el backend
      const err = await res.json();
      alert('Error al revertir venta: ' + (err.error || 'Desconocido'));
    }
  } catch (error) {
    console.error('Error de red o código:', error);
    alert('Error de conexión al intentar eliminar.');
  }
}

// --- LÓGICA DE BÚSQUEDA DE CLIENTE (V 3.1) ---
function setupClienteSearch() {
  const searchInput = document.getElementById('clienteSearch');
  const resultsContainer = document.getElementById('clienteResults');
  const dropdown = document.getElementById('clienteDropdown');
  const hiddenInput = document.getElementById('clienteId');
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    hiddenInput.value = '';
    if (query.length < 1) { resultsContainer.innerHTML = ''; dropdown.classList.remove('is-open'); return; }

    const filtrados = listaClientes.filter(c => c.nombre.toLowerCase().includes(query) || c.identificacion.includes(query));
    resultsContainer.innerHTML = '';
    if (filtrados.length > 0) {
      filtrados.forEach(c => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.innerHTML = `<strong>${c.nombre}</strong> <span>(${c.identificacion})</span>`;
        item.onclick = () => { searchInput.value = c.nombre; hiddenInput.value = c.id; dropdown.classList.remove('is-open'); };
        resultsContainer.appendChild(item);
      });
      dropdown.classList.add('is-open');
    } else dropdown.classList.remove('is-open');
  });
  document.addEventListener('click', (e) => { if (!dropdown.contains(e.target)) dropdown.classList.remove('is-open'); });
}

// --- LÓGICA MODAL RÁPIDO CLIENTE ---
function setupQuickAddModal() {
  const modal = document.getElementById('quickAddModal');
  const openBtn = document.getElementById('openQuickAddCliente');
  const closeBtn = document.getElementById('closeQuickAddModal');
  const form = document.getElementById('quickAddForm');

  if (openBtn) openBtn.addEventListener('click', () => modal.classList.add('is-open'));
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('is-open'));

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const granjaId = getSelectedGranjaId();
      const nuevoCliente = {
        nombre: document.getElementById('quick_nombre').value,
        tipoIdentificacion: document.getElementById('quick_tipoIdentificacion').value,
        identificacion: document.getElementById('quick_identificacion').value,
        granjaId: granjaId
      };
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${window.API_URL}/clientes`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(nuevoCliente)
        });
        if (res.ok) {
          const creado = await res.json();
          modal.classList.remove('is-open');
          form.reset();
          await cargarClientes();
          document.getElementById('clienteSearch').value = creado.nombre;
          document.getElementById('clienteId').value = creado.id;
        } else alert('Error al crear cliente');
      } catch (e) { console.error(e); }
    };
  }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));
  if (granja) document.querySelector('header h1').textContent = `Ventas (${granja.nombre})`;

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('ventaForm');
  const formContainer = document.getElementById('formContainer');

  const loteSelect = document.getElementById('loteSelect');
  if (loteSelect) {
    loteSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      const cantidadInput = document.getElementById('cantidadVendida');
      if (selectedOption && selectedOption.dataset.cantidad) {
        cantidadInput.placeholder = `Máx: ${selectedOption.dataset.cantidad}`;
      }
    });
  }

  if (currentUser && currentUser.role !== 'viewer') {
    if (toggleBtn) {
      toggleBtn.style.display = 'block';
      toggleBtn.addEventListener('click', () => {
        const isOpen = formContainer.classList.contains('is-open');
        if (isOpen) cerrarFormulario();
        else {
          form.reset();
          document.getElementById('ventaId').value = '';
          document.getElementById('formTitle').textContent = 'Registrar Venta';
          abrirFormulario();
        }
      });
    }
    if (cancelBtn) cancelBtn.addEventListener('click', cerrarFormulario);
    if (form) form.onsubmit = guardarVenta;

    setupClienteSearch();
    setupQuickAddModal();

    // LISTENERS PARA CÁLCULO EN TIEMPO REAL
    document.querySelectorAll('.input-calculo').forEach(input => {
      input.addEventListener('input', calcularTotalVenta);
      input.addEventListener('change', calcularTotalVenta);
    });

  } else {
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  cargarLotesForSelect();
  cargarClientes();
  cargarVentas();
});