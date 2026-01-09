let listaProveedores = [];

console.log("inventario.js cargado");

// --- Lógica de Carga ---
async function cargarInventario() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/inventario?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const inventario = await res.json();
    const tbody = document.getElementById('tablaInventario');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (inventario.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay inventario registrado.</td></tr>';
      return;
    }

    inventario.forEach(item => {
      const tr = document.createElement('tr');
      const unidad = item.unidadMedida || 'Unidades';
      const totalEstimado = (item.cantidad * item.costo).toFixed(2);
      const fechaVisual = new Date(item.fecha).toLocaleDateString();

      // Botón "Agregar Stock" (+)
      const btnReabastecer = `
        <button onclick="abrirModalReabastecer(${item.id}, '${item.producto}', '${unidad}', ${item.proveedorId})" 
                class="btn btn-sm" 
                style="background-color: #27ae60; color: white; margin-right: 5px;" 
                title="Agregar Stock / Comprar Más">
            + Stock
        </button>
      `;

      // Botón Eliminar
      const btnEliminar = `
        <button onclick="eliminarInventario(${item.id})" class="btn btn-sm btn-peligro" title="Eliminar Producto">🗑️</button>
      `;

      tr.innerHTML = `
        <td><strong>${item.producto}</strong></td>
        <td>${item.Proveedor ? item.Proveedor.nombreCompania : '-'}</td>
        <td><span class="badge">${item.categoria}</span></td>
        <td style="font-weight: bold; color: #2c3e50;">${item.cantidad} ${unidad}</td>
        <td>$${parseFloat(item.costo).toFixed(2)}</td>
        <td>$${totalEstimado}</td>
        <td>${fechaVisual}</td>
        <td>
          <div style="display: flex;">
            ${btnReabastecer}
            ${btnEliminar}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) { console.error(error); }
}

async function cargarProveedores() {
  try {
    const token = localStorage.getItem('token');
    // Proveedores son globales o por granja, el backend lo maneja
    const res = await fetch(`${window.API_URL}/proveedores`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      listaProveedores = await res.json();
      llenarSelectProveedores('proveedorSelect');
      llenarSelectProveedores('reab_proveedor'); // Llenar también el select del modal
    }
  } catch (e) { console.error(e); }
}

function llenarSelectProveedores(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  // Mantener la primera opción
  const firstOption = select.options[0];
  select.innerHTML = '';
  select.appendChild(firstOption);

  listaProveedores.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.nombreCompania;
    select.appendChild(option);
  });
}

// --- CRUD BÁSICO (Crear Nuevo Producto) ---
async function guardarInventario(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const inventario = {
    granjaId,
    producto: document.getElementById('producto').value,
    categoria: document.getElementById('categoria').value,
    proveedorId: document.getElementById('proveedorSelect').value || null,
    cantidad: parseFloat(document.getElementById('cantidad').value),
    unidadMedida: document.getElementById('unidadMedida').value,
    costo: parseFloat(document.getElementById('costo').value),
    fecha: document.getElementById('fecha').value
  };

  try {
    const res = await fetch(`${window.API_URL}/inventario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(inventario)
    });

    if (res.ok) {
      alert('Producto registrado');
      cerrarFormulario();
      cargarInventario();
    } else {
      const err = await res.json();
      alert('Error: ' + err.error);
    }
  } catch (error) { console.error(error); }
}

async function eliminarInventario(id) {
  if (confirm('¿Eliminar este producto y todo su historial de stock?')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();
      await fetch(`${window.API_URL}/inventario/${id}?granjaId=${granjaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarInventario();
    } catch (error) { console.error(error); }
  }
}

// --- LÓGICA DE REABASTECIMIENTO (NUEVO) ---

function abrirModalReabastecer(id, nombreProducto, unidad, proveedorIdActual) {
  const modal = document.getElementById('reabastecerModal');
  if (!modal) return;

  document.getElementById('reabastecerId').value = id;
  document.getElementById('reabastecerInfo').textContent = `Producto: ${nombreProducto}`;
  document.getElementById('reabastecerUnidad').textContent = unidad;

  // Resetear form
  document.getElementById('reab_cantidad').value = '';
  document.getElementById('reab_costoTotal').value = '';
  document.getElementById('reab_factura').value = '';

  // Seleccionar proveedor actual por defecto si existe
  const selectProv = document.getElementById('reab_proveedor');
  if (selectProv && proveedorIdActual) selectProv.value = proveedorIdActual;

  modal.classList.add('is-open');
}

function cerrarModalReabastecer() {
  document.getElementById('reabastecerModal').classList.remove('is-open');
}

async function guardarReabastecimiento(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const granjaId = getSelectedGranjaId();
  const id = document.getElementById('reabastecerId').value;

  const payload = {
    cantidadNueva: parseFloat(document.getElementById('reab_cantidad').value),
    costoTotalCompra: parseFloat(document.getElementById('reab_costoTotal').value),
    proveedorId: document.getElementById('reab_proveedor').value || null,
    numeroFactura: document.getElementById('reab_factura').value,
    granjaId: granjaId
  };

  if (payload.cantidadNueva <= 0 || payload.costoTotalCompra < 0) {
    return alert("Por favor ingresa cantidades válidas.");
  }

  try {
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = "Procesando...";
    btn.disabled = true;

    const res = await fetch(`${window.API_URL}/inventario/${id}/reabastecer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      alert(`Stock actualizado.\nNuevo Stock: ${data.nuevoStock}\nNuevo Costo Promedio: $${parseFloat(data.nuevoCosto).toFixed(2)}`);
      cerrarModalReabastecer();
      cargarInventario();
    } else {
      const err = await res.json();
      alert("Error: " + (err.error || "No se pudo actualizar"));
    }
  } catch (err) {
    console.error(err);
    alert("Error de conexión");
  } finally {
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = "Confirmar Compra e Ingreso";
    btn.disabled = false;
  }
}

// --- UI Helpers ---
function abrirFormulario() {
  document.getElementById('formContainer').classList.add('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Cancelar';
}
function cerrarFormulario() {
  document.getElementById('formContainer').classList.remove('is-open');
  document.getElementById('toggleFormBtn').textContent = 'Nuevo Producto';
  document.getElementById('inventarioForm').reset();
}

// --- Proveedor Rápido ---
function setupQuickAddModal() {
  const modal = document.getElementById('quickAddModal');
  const btnOpen = document.getElementById('btnQuickAddProveedor');
  const btnClose = document.getElementById('closeQuickAddModal');
  const form = document.getElementById('quickAddForm');

  if (btnOpen) btnOpen.onclick = () => modal.classList.add('is-open');
  if (btnClose) btnClose.onclick = () => modal.classList.remove('is-open');

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      // ... (Lógica existente de quick add - simplificada aquí)
      // Asumimos que esta parte ya la tenías implementada o es similar a Lotes
      alert("Función Proveedor Rápido pendiente de integrar con backend global");
      modal.classList.remove('is-open');
    };
  }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  if (granja) document.querySelector('header h1').textContent = `Inventario (${granja.nombre})`;

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('inventarioForm');

  // Modal Reabastecer listeners
  const closeReab = document.getElementById('closeReabastecerModal');
  const formReab = document.getElementById('reabastecerForm');
  if (closeReab) closeReab.onclick = cerrarModalReabastecer;
  if (formReab) formReab.onsubmit = guardarReabastecimiento;

  if (currentUser && currentUser.role !== 'viewer') {
    if (toggleBtn) {
      toggleBtn.style.display = 'block';
      toggleBtn.onclick = () => {
        const isOpen = document.getElementById('formContainer').classList.contains('is-open');
        if (isOpen) cerrarFormulario();
        else abrirFormulario();
      };
    }
    if (cancelBtn) cancelBtn.onclick = cerrarFormulario;
    if (form) form.onsubmit = guardarInventario;

    setupQuickAddModal();
  } else {
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  cargarProveedores();
  cargarInventario();
});