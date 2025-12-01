let listaClientes = [];

// --- Lógica de Carga ---

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
    if (!select) return;

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

async function cargarClientes() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/clientes?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      listaClientes = await res.json();
    }
  } catch (error) {
    console.error('Error al cargar clientes:', error);
  }
}

async function cargarVentas() {
  console.log("Iniciando carga de ventas..."); // Depuración
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/ventas?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      console.error("Error HTTP al cargar ventas:", res.status);
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const ventas = await res.json();
    console.log("Ventas recibidas:", ventas); // Depuración: Ver qué llega del servidor

    const tbody = document.getElementById('ventaTableBody');
    if (!tbody) {
      console.error("No se encontró el elemento 'ventaTableBody'");
      return;
    }
    tbody.innerHTML = '';

    if (Array.isArray(ventas) && ventas.length > 0) {
      ventas.forEach(venta => {
        const tr = document.createElement('tr');

        // Protección contra nulos
        const nombreLote = (venta.Lote && venta.Lote.loteId) ? venta.Lote.loteId : 'N/A';
        const nombreCliente = (venta.Cliente && venta.Cliente.nombre) ? venta.Cliente.nombre : 'N/A';
        const total = (venta.peso * venta.precio).toFixed(2);

        tr.innerHTML = `
          <td>${nombreLote}</td>
          <td>${nombreCliente}</td>
          <td>${venta.cantidadVendida}</td>
          <td>${venta.peso.toFixed(2)}</td>
          <td>$${venta.precio.toFixed(2)}</td>
          <td><strong>$${total}</strong></td>
          <td>${new Date(venta.fecha).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</td>
          <td>
            <button onclick="eliminarVenta(${venta.id})" class="btn btn-sm btn-peligro">Revertir</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay ventas registradas para esta granja.</td></tr>';
    }
  } catch (error) {
    console.error('Error CRÍTICO al cargar ventas:', error);
  }
}

// --- CALCULADORA EN TIEMPO REAL ---
function calcularTotalVenta() {
  const peso = parseFloat(document.getElementById('peso').value) || 0;
  const precio = parseFloat(document.getElementById('precio').value) || 0;
  const unidad = document.getElementById('unidadPeso').value;

  const lbl = document.getElementById('lblPrecioUnidad');
  if (lbl) lbl.textContent = `/${unidad}`;

  const total = peso * precio;
  const display = document.getElementById('displayTotalVenta');
  if (display) display.textContent = `$${total.toFixed(2)}`;
}

// --- UI Logic ---
function abrirFormulario() {
  const container = document.getElementById('formContainer');
  if (container) container.classList.add('is-open');
  const btn = document.getElementById('toggleFormBtn');
  if (btn) btn.textContent = 'Cancelar';
}
function cerrarFormulario() {
  const container = document.getElementById('formContainer');
  if (container) container.classList.remove('is-open');
  const btn = document.getElementById('toggleFormBtn');
  if (btn) btn.textContent = 'Registrar Nueva Venta';

  document.getElementById('ventaForm').reset();
  document.getElementById('ventaId').value = '';
  document.getElementById('clienteId').value = '';
  const searchInput = document.getElementById('clienteSearch');
  if (searchInput) searchInput.value = '';

  const display = document.getElementById('displayTotalVenta');
  if (display) display.textContent = '$0.00';

  document.getElementById('formTitle').textContent = 'Registrar Venta';
}

// --- CRUD ---
async function guardarVenta(e) {
  e.preventDefault();

  const ventaId = document.getElementById('ventaId').value;
  if (ventaId) { alert('Edición no soportada.'); return; }

  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const loteId = document.getElementById('loteSelect').value;
  const clienteId = document.getElementById('clienteId').value;

  if (!loteId || !clienteId) { alert('Selecciona Lote y Cliente.'); return; }

  let peso = parseFloat(document.getElementById('peso').value);
  let precio = parseFloat(document.getElementById('precio').value);
  const unidad = document.getElementById('unidadPeso').value;

  // Conversión a KG si es Libras
  if (unidad === 'lb') {
    peso = peso / 2.20462; // Peso a kg
    precio = precio * 2.20462; // Precio a $/kg (para mantener el total $)
  }

  const venta = {
    loteId: parseInt(loteId),
    clienteId: parseInt(clienteId),
    cantidadVendida: parseInt(document.getElementById('cantidadVendida').value),
    peso: peso,
    precio: precio,
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
      alert('Error al guardar: ' + (errorText.error || 'Desconocido'));
      return;
    }

    cerrarFormulario();
    await cargarVentas();
    await cargarLotesForSelect();

  } catch (error) { alert('Error de conexión'); }
}

async function eliminarVenta(id) {
  if (confirm('¿Seguro que quieres REVERTIR esta venta?')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();

      const res = await fetch(`${window.API_URL}/ventas/${id}?granjaId=${granjaId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await cargarVentas();
        await cargarLotesForSelect();
      } else {
        const err = await res.json();
        alert('Error: ' + (err.error || 'Desconocido'));
      }
    } catch (error) { console.error(error); }
  }
}

// --- Buscadores y Modales (Clientes) ---
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
  document.addEventListener('click', (e) => { if (dropdown && !dropdown.contains(e.target)) dropdown.classList.remove('is-open'); });
}

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

  if (granja) {
    const header = document.querySelector('header h1');
    if (header) header.textContent = `Ventas (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('ventaForm');

  // Calculadora en tiempo real
  const inputsCalculo = document.querySelectorAll('.input-calculo');
  inputsCalculo.forEach(input => {
    input.addEventListener('input', calcularTotalVenta);
    input.addEventListener('change', calcularTotalVenta);
  });

  // Lógica de cantidad máxima (Stock)
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
        const isOpen = document.getElementById('formContainer').classList.contains('is-open');
        if (isOpen) cerrarFormulario();
        else {
          form.reset();
          document.getElementById('ventaId').value = '';
          document.getElementById('clienteId').value = '';
          document.getElementById('formTitle').textContent = 'Registrar Venta';
          abrirFormulario();
        }
      });
    }
    if (cancelBtn) cancelBtn.addEventListener('click', cerrarFormulario);
    if (form) form.onsubmit = guardarVenta;

    setupClienteSearch();
    setupQuickAddModal();

  } else {
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  cargarLotesForSelect();
  cargarClientes();
  cargarVentas(); 
});