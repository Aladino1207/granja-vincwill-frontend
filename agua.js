// --- Variables Globales ---
let inventarioTratamiento = []; // Solo Medicinas y Vacunas

console.log("agua.js inicializado");

// ==========================================
// 1. CARGA DE DATOS E INVENTARIO
// ==========================================

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

    // Filtramos lotes activos (array check por seguridad)
    const lotesActivos = Array.isArray(lotes)
      ? lotes.filter(l => l.estado === 'disponible' || l.estado === 'ocupado')
      : [];

    if (lotesActivos.length === 0) {
      select.innerHTML = '<option value="">No hay lotes activos</option>';
      return;
    }

    lotesActivos.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar lotes:', error);
  }
}

// Carga productos para el tratamiento (Solo Medicina y Vacuna)
async function cargarInventarioTratamiento() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    const res = await fetch(`${window.API_URL}/inventario?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      const items = await res.json();

      // FILTRO ESTRICTO PERO ROBUSTO
      if (Array.isArray(items)) {
        inventarioTratamiento = items.filter(i => {
          if (!i.categoria) return false;
          const cat = i.categoria.toLowerCase().trim();
          // Aceptamos variantes comunes y aseguramos que haya stock
          return ['medicina', 'vacuna', 'medicamento', 'vacunación', 'tratamiento'].includes(cat) && i.cantidad > 0;
        });
      }
      console.log("Inventario Tratamiento (Cargado):", inventarioTratamiento.length, "items disponibles.");
    }
  } catch (e) { console.error("Error cargando inventario:", e); }
}

async function cargarAgua() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/agua?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const tbody = document.getElementById('aguaTableBody');
    if (!tbody) {
      console.error("CRÍTICO: No se encontró el elemento <tbody> con id='aguaTableBody'. Revisa el HTML.");
      return;
    }

    if (!res.ok) {
      tbody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Error de conexión con el servidor.</td></tr>';
      return;
    }

    const data = await res.json();
    tbody.innerHTML = '';

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay registros de consumo de agua.</td></tr>';
      return;
    }

    // Dibujar filas
    data.forEach(a => {
      try {
        const tr = document.createElement('tr');

        // Blindaje contra datos nulos o estructuras antiguas
        let loteNombre = 'Lote Eliminado';
        if (a.Lote && a.Lote.loteId) {
          loteNombre = a.Lote.loteId;
        } else if (a.loteId) {
          loteNombre = `ID: ${a.loteId}`;
        }

        // Formato Fecha Seguro
        let fechaStr = 'Fecha Inválida';
        if (a.fecha) {
          const d = new Date(a.fecha);
          if (!isNaN(d.getTime())) {
            fechaStr = d.toLocaleDateString();
          }
        }

        tr.innerHTML = `
            <td>${loteNombre}</td>
            <td>${a.cantidad || 0} L</td>
            <td>${fechaStr}</td>
            <td>
              <button onclick="eliminarAgua(${a.id})" class="btn btn-sm btn-peligro">Eliminar</button>
            </td>
          `;
        tbody.appendChild(tr);
      } catch (errRow) {
        console.error("Error pintando una fila de agua:", errRow, a);
      }
    });
  } catch (error) {
    console.error("Error FATAL cargando agua:", error);
    const tbody = document.getElementById('aguaTableBody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="color:red;">Error interno: ${error.message}</td></tr>`;
  }
}

// ==========================================
// 2. LÓGICA DE FILAS DINÁMICAS (TRATAMIENTO)
// ==========================================

function agregarFilaTratamiento() {
  const container = document.getElementById('treatmentContainer');
  if (!container) return;

  const rowId = Date.now(); // ID único temporal

  const div = document.createElement('div');
  div.className = 'treatment-row';
  div.id = `row-${rowId}`;

  // 1. Selector de Producto (Validar si hay items)
  let options = '<option value="">Seleccione...</option>';
  if (inventarioTratamiento.length > 0) {
    inventarioTratamiento.forEach(item => {
      const unidad = item.unidadMedida || 'Unidades';
      options += `<option value="${item.id}" 
                                data-unidad="${unidad}" 
                                data-stock="${item.cantidad}"
                                data-nombre="${item.producto}">
                            ${item.producto} (Stock: ${item.cantidad} ${unidad})
                        </option>`;
    });
  } else {
    options = '<option value="" disabled>Sin inventario disponible (Medicina/Vacuna)</option>';
  }

  div.innerHTML = `
        <!-- Producto -->
        <div>
            <select class="form-control prod-select" onchange="actualizarFila(${rowId})">
                ${options}
            </select>
            <small class="stock-info" style="color: #e67e22; font-size: 0.8em;"></small>
        </div>

        <!-- Dosis -->
        <div>
            <input type="number" class="form-control dosis-input" step="0.001" placeholder="Dosis/L" oninput="actualizarFila(${rowId})">
        </div>

        <!-- Unidad Dosis -->
        <div>
            <select class="form-control unit-select" onchange="actualizarFila(${rowId})">
                <option value="g">Gramos (g)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="lb">Libras (lb)</option>
                <option value="l">Litros (l)</option>
                <option value="kg">Kilos (kg)</option>
                <option value="cc">cc</option>
            </select>
        </div>

        <!-- Total Calculado (Read Only) -->
        <div>
            <input type="text" class="form-control total-display" readonly placeholder="Total" style="background: #e9ecef;">
        </div>

        <!-- Botón Borrar -->
        <div>
            <button type="button" class="btn btn-peligro btn-sm" onclick="eliminarFila(${rowId})" title="Quitar">×</button>
        </div>
    `;

  container.appendChild(div);
}

function eliminarFila(rowId) {
  const row = document.getElementById(`row-${rowId}`);
  if (row) row.remove();
}

function actualizarFila(rowId) {
  const row = document.getElementById(`row-${rowId}`);
  if (!row) return;

  const inputAgua = document.getElementById('cantidadAgua');
  const litrosAgua = parseFloat(inputAgua ? inputAgua.value : 0) || 0;

  const dosis = parseFloat(row.querySelector('.dosis-input').value) || 0;
  const unidadDosis = row.querySelector('.unit-select').value;
  const totalDisplay = row.querySelector('.total-display');
  const selectProd = row.querySelector('.prod-select');
  const stockInfo = row.querySelector('.stock-info');

  // 1. Mostrar Stock seleccionado
  if (selectProd.selectedIndex > 0) {
    const opt = selectProd.options[selectProd.selectedIndex];
    // Seguridad por si dataset falla
    if (opt.dataset.stock) {
      stockInfo.textContent = `Disp: ${opt.dataset.stock} ${opt.dataset.unidad}`;
    }
  } else {
    stockInfo.textContent = '';
  }

  // 2. Calcular Total
  // Formula: Litros Agua * Dosis
  const totalNecesario = litrosAgua * dosis;

  // Mostrar resultado preliminar
  if (totalNecesario > 0) {
    totalDisplay.value = `${totalNecesario.toFixed(4)} ${unidadDosis}`;
  } else {
    totalDisplay.value = '';
  }
}

// Recalcular TODAS las filas cuando cambian los litros de agua
function recalcularTodosTotales() {
  const rows = document.querySelectorAll('.treatment-row');
  rows.forEach(row => {
    const idPart = row.id.split('-')[1];
    actualizarFila(idPart);
  });
}

// ==========================================
// 3. CONVERSOR DE UNIDADES (Reutilizado)
// ==========================================
function calcularCantidadBase(cantidadInput, unidadInput, unidadBase) {
  if (!unidadBase || unidadInput === 'base') return cantidadInput;

  const uIn = unidadInput.toLowerCase().trim().replace(/s$/, '');
  const uBase = unidadBase.toLowerCase().trim().replace(/s$/, '');

  if (uIn === uBase) return cantidadInput;

  // --- PESO ---
  if (uBase === 'lb' || uBase === 'libra') {
    if (uIn === 'kg' || uIn === 'kilo') return cantidadInput * 2.20462;
    if (uIn === 'g' || uIn === 'gr' || uIn === 'gramo') return cantidadInput / 453.592;
    if (uIn === 'oz') return cantidadInput / 16;
  }
  if (uBase === 'kg' || uBase === 'kilo') {
    if (uIn === 'g' || uIn === 'gr') return cantidadInput / 1000;
    if (uIn === 'lb' || uIn === 'libra') return cantidadInput / 2.20462;
  }
  if (uBase === 'g' || uBase === 'gramo') {
    if (uIn === 'kg') return cantidadInput * 1000;
    if (uIn === 'lb' || uIn === 'libra') return cantidadInput * 453.592;
  }

  // --- VOLUMEN ---
  if (uBase === 'l' || uBase === 'litro' || uBase === 'lt') {
    if (uIn === 'ml' || uIn === 'cc' || uIn === 'mililitro') return cantidadInput / 1000;
    if (uIn === 'gal') return cantidadInput * 3.785;
  }
  if (uBase === 'ml' || uBase === 'cc') {
    if (uIn === 'l' || uIn === 'litro') return cantidadInput * 1000;
  }

  return cantidadInput;
}

// ==========================================
// 4. GUARDADO MAESTRO (AGUA + SALUD)
// ==========================================

async function guardarTodo(e) {
  e.preventDefault();

  // --- A. VALIDACIÓN PREVIA ---
  const granjaId = getSelectedGranjaId();
  const token = localStorage.getItem('token');
  const loteSelect = document.getElementById('loteSelect');
  const loteId = loteSelect ? loteSelect.value : null;
  const cantidadAgua = parseFloat(document.getElementById('cantidadAgua').value);
  const fecha = document.getElementById('fecha').value;

  if (!loteId || !cantidadAgua || !fecha) return alert("Completa los datos del agua");

  // Recolectar Tratamientos
  const filas = document.querySelectorAll('.treatment-row');
  const tratamientosAProcesar = [];

  for (let row of filas) {
    const select = row.querySelector('.prod-select');
    const dosisVal = parseFloat(row.querySelector('.dosis-input').value);
    const unidadDosis = row.querySelector('.unit-select').value;

    if (select && select.value && dosisVal > 0) {
      const opt = select.options[select.selectedIndex];
      const stock = parseFloat(opt.dataset.stock);
      const unidadBase = opt.dataset.unidad;
      const nombreProd = opt.dataset.nombre;

      // Calculamos el total real necesario
      const totalRequeridoInput = cantidadAgua * dosisVal;
      // Convertimos a unidad base
      const cantidadFinalBase = calcularCantidadBase(totalRequeridoInput, unidadDosis, unidadBase);

      if (cantidadFinalBase > (stock + 0.0001)) {
        return alert(`❌ Stock Insuficiente para ${nombreProd}.\nNecesitas: ${cantidadFinalBase.toFixed(4)} ${unidadBase}\nTienes: ${stock}`);
      }

      tratamientosAProcesar.push({
        inventarioId: parseInt(select.value),
        productoAplicado: nombreProd,
        cantidad: cantidadFinalBase,
        tipo: 'Tratamiento' // Categoría fija para esto
      });
    }
  }

  // --- B. ENVIAR DATOS ---
  try {
    const btn = document.querySelector('button[type="submit"]');
    if (btn) { btn.textContent = "Guardando..."; btn.disabled = true; }

    // 1. Guardar Agua
    const aguaPayload = { granjaId, loteId, cantidad: cantidadAgua, fecha };
    const resAgua = await fetch(`${window.API_URL}/agua`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(aguaPayload)
    });

    if (!resAgua.ok) {
      const err = await resAgua.json();
      throw new Error("Error guardando el agua: " + (err.error || resAgua.statusText));
    }

    // 2. Guardar Tratamientos (Iterativo)
    for (let trat of tratamientosAProcesar) {
      const saludPayload = {
        granjaId,
        loteId,
        tipo: 'Tratamiento',
        nombre: `Tratamiento Agua (${cantidadAgua}L)`,
        productoAplicado: trat.productoAplicado,
        cantidad: trat.cantidad,
        inventarioId: trat.inventarioId,
        fecha: fecha,
        descripcion: `Aplicado automáticamente desde módulo Agua`
      };

      await fetch(`${window.API_URL}/salud`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(saludPayload)
      });
    }

    alert("Registro de Agua y Tratamientos guardado exitosamente.");
    cerrarFormulario();
    cargarAgua();
    cargarInventarioTratamiento(); // Refrescar stocks en memoria

  } catch (error) {
    console.error(error);
    alert("Error en el proceso de guardado: " + error.message);
  } finally {
    const btn = document.querySelector('button[type="submit"]');
    if (btn) { btn.textContent = "Guardar Todo"; btn.disabled = false; }
  }
}

async function eliminarAgua(id) {
  if (confirm('¿Eliminar registro?')) {
    try {
      const token = localStorage.getItem('token');
      const granjaId = getSelectedGranjaId();
      await fetch(`${window.API_URL}/agua/${id}?granjaId=${granjaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarAgua();
    } catch (error) {
      alert('Error de conexión al eliminar');
    }
  }
}

// --- UI Helpers ---
function abrirFormulario() {
  const container = document.getElementById('formContainer');
  if (container) container.classList.add('is-open');

  const btn = document.getElementById('toggleFormBtn');
  if (btn) btn.textContent = 'Cancelar';

  const fechaInput = document.getElementById('fecha');
  if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];
}

function cerrarFormulario() {
  const container = document.getElementById('formContainer');
  if (container) container.classList.remove('is-open');

  const btn = document.getElementById('toggleFormBtn');
  if (btn) btn.textContent = 'Registrar Consumo';

  const form = document.getElementById('aguaForm');
  if (form) form.reset();

  const idField = document.getElementById('aguaId');
  if (idField) idField.value = '';

  // Limpiar filas dinámicas
  const tContainer = document.getElementById('treatmentContainer');
  if (tContainer) tContainer.innerHTML = '';
}

// --- Event Listener Principal ---
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const granja = JSON.parse(localStorage.getItem('selectedGranja'));

  if (granja) {
    const header = document.querySelector('header h1');
    if (header) header.textContent = `Consumo de Agua (${granja.nombre})`;
  }

  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('aguaForm');
  const btnAdd = document.getElementById('btnAddTreatment');
  const inputAgua = document.getElementById('cantidadAgua');

  if (currentUser && currentUser.role !== 'viewer') {
    if (toggleBtn) {
      toggleBtn.style.display = 'block';
      toggleBtn.addEventListener('click', () => {
        const container = document.getElementById('formContainer');
        const isOpen = container && container.classList.contains('is-open');
        if (isOpen) cerrarFormulario();
        else abrirFormulario();
      });
    }

    if (cancelBtn) cancelBtn.addEventListener('click', cerrarFormulario);
    if (form) form.onsubmit = guardarTodo;

    // Botón para agregar fila
    if (btnAdd) btnAdd.onclick = agregarFilaTratamiento;

    // Listener para recalcular todo si cambia el agua
    if (inputAgua) inputAgua.addEventListener('input', recalcularTodosTotales);

  } else {
    if (toggleBtn) toggleBtn.style.display = 'none';
  }

  cargarLotesForSelect();
  cargarAgua();
  cargarInventarioTratamiento();
});