// --- Variables Globales ---
let inventarioSanitario = [];

// --- Lógica de Carga (BLINDADA) ---
async function cargarLotesForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/lotes?granjaId=${granjaId}`, { headers: { Authorization: `Bearer ${token}` } });
    const lotes = await res.json();
    const select = document.getElementById('loteId');
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona un Lote</option>';

    // FILTRO: Solo disponibles (o ocupados si lo prefieres)
    // Mostramos estado para claridad
    const lotesActivos = lotes.filter(l => l.estado !== 'vendido' && l.estado !== 'archivado');

    lotesActivos.forEach(lote => {
      const option = document.createElement('option');
      option.value = lote.id;
      option.textContent = `${lote.loteId} (${lote.estado}) - Aves: ${lote.cantidadActual || lote.cantidad}`;
      select.appendChild(option);
    });
  } catch (error) { console.error(error); }
}

async function cargarVacunasForSelect() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/inventario?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const inventario = await res.json();
    inventarioSanitario = inventario; // Guardamos en global para conversiones

    const vacunaSelect = document.getElementById('vacunaSelect'); // Para Vacunación
    const insumoSelect = document.getElementById('insumoSelect'); // Para Tratamiento

    if (vacunaSelect) {
      vacunaSelect.innerHTML = '<option value="">Selecciona Vacuna</option>';
      const vacunas = inventario.filter(i => i.categoria === 'Vacuna' && i.cantidad > 0);
      vacunas.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = `${v.producto} (Stock: ${v.cantidad} ${v.unidadMedida})`;
        // Datos para la conversión automática
        opt.dataset.nombre = v.producto;
        opt.dataset.stock = v.cantidad;
        opt.dataset.unidad = v.unidadMedida;
        vacunaSelect.appendChild(opt);
      });
    }

    if (insumoSelect) {
      insumoSelect.innerHTML = '<option value="">Selecciona Insumo</option>';
      // Filtramos Medicina, Otro, etc.
      const insumos = inventario.filter(i => (i.categoria === 'Medicina' || i.categoria === 'Otro') && i.cantidad > 0);
      insumos.forEach(i => {
        const opt = document.createElement('option');
        opt.value = i.id;
        opt.textContent = `${i.producto} (Stock: ${i.cantidad} ${i.unidadMedida})`;
        opt.dataset.nombre = i.producto;
        opt.dataset.stock = i.cantidad;
        opt.dataset.unidad = i.unidadMedida;
        insumoSelect.appendChild(opt);
      });
    }

  } catch (error) { console.error('Error cargando inventario:', error); }
}

async function cargarSalud() {
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    if (!granjaId) return;

    const res = await fetch(`${window.API_URL}/salud?granjaId=${granjaId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const registros = await res.json();
    const tbody = document.getElementById('saludTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    registros.forEach(reg => {
      const tr = document.createElement('tr');
      // Intentamos mostrar la unidad original si el backend la devolviera, 
      // pero por ahora mostramos lo que se guardó (cantidadBase)
      const nombreLote = reg.Lote ? reg.Lote.loteId : 'General';

      tr.innerHTML = `
        <td>${nombreLote}</td>
        <td><span class="badge" style="background:${getColorTipo(reg.tipo)}">${reg.tipo}</span></td>
        <td>${reg.productoAplicado}</td>
        <td>${reg.cantidad}</td> <!-- Mostramos la cantidad base -->
        <td>${new Date(reg.fecha).toLocaleDateString()}</td>
        <td>
          <button onclick="eliminarSalud(${reg.id})" class="btn btn-sm btn-peligro">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) { console.error(error); }
}

function getColorTipo(tipo) {
  if (tipo === 'Vacunacion') return '#3498db';
  if (tipo === 'Tratamiento') return '#e67e22';
  if (tipo === 'Mortalidad') return '#e74c3c';
  return '#95a5a6';
}

// --- CORE: Lógica de Conversión Robusta ---
function calcularCantidadBase(cantidad, unidadUso, unidadBase) {
  if (!unidadUso || !unidadBase) return cantidad;

  // Normalizar texto (minusculas, sin espacios, quitar 's' final para plurales)
  const uUso = unidadUso.toLowerCase().trim().replace(/s$/, ''); // gramos -> gramo
  const uBase = unidadBase.toLowerCase().trim().replace(/s$/, ''); // libras -> libra

  // 1. Si son iguales, no tocar
  if (uUso === uBase || uUso === 'unidad' || uBase === 'unidad') return parseFloat(cantidad);

  // Mapeo de alias comunes a estándar
  const mapUnit = (u) => {
    if (['g', 'gr', 'gramo'].includes(u)) return 'g';
    if (['kg', 'kilo', 'kilogramo'].includes(u)) return 'kg';
    if (['lb', 'libra'].includes(u)) return 'lb';
    if (['oz', 'onza'].includes(u)) return 'oz';
    if (['l', 'lt', 'litro'].includes(u)) return 'l';
    if (['ml', 'mililitro', 'cc'].includes(u)) return 'ml';
    if (['gl', 'gal', 'galon'].includes(u)) return 'gal';
    return u;
  };

  const from = mapUnit(uUso);
  const to = mapUnit(uBase);
  const val = parseFloat(cantidad);

  console.log(`Convirtiendo ${val} ${from} -> ${to}`);

  // --- PESO ---
  // Base Libra (lb)
  if (to === 'lb') {
    if (from === 'g') return val / 453.592;
    if (from === 'kg') return val * 2.20462;
    if (from === 'oz') return val / 16;
  }
  // Base Kilogramo (kg)
  if (to === 'kg') {
    if (from === 'g') return val / 1000;
    if (from === 'lb') return val / 2.20462;
    if (from === 'oz') return val / 35.274;
  }
  // Base Gramo (g)
  if (to === 'g') {
    if (from === 'kg') return val * 1000;
    if (from === 'lb') return val * 453.592;
  }

  // --- VOLUMEN ---
  // Base Litro (l)
  if (to === 'l') {
    if (from === 'ml') return val / 1000;
    if (from === 'gal') return val * 3.78541;
  }
  // Base Mililitro (ml)
  if (to === 'ml') {
    if (from === 'l') return val * 1000;
    if (from === 'gal') return val * 3785.41;
  }
  // Base Galón (gal)
  if (to === 'gal') {
    if (from === 'l') return val / 3.78541;
    if (from === 'ml') return val / 3785.41;
  }

  // Si llegamos aquí, no se encontró conversión válida
  console.warn(`⚠️ No existe conversión definida de ${from} a ${to}. Se enviará el valor original.`);
  return val;
}

// --- Guardar Registro ---
async function guardarSalud(e) {
  e.preventDefault();
  const token = localStorage.getItem('token');
  const granjaId = getSelectedGranjaId();
  if (!granjaId) return;

  const tipo = document.getElementById('tipoEvento').value;
  const loteId = document.getElementById('loteId').value;
  const fecha = document.getElementById('fecha').value;
  const diasRetiro = parseInt(document.getElementById('diasRetiro').value) || 0;

  // Calcular fecha de retiro
  let fechaRetiro = null;
  if (diasRetiro > 0 && fecha) {
    const f = new Date(fecha);
    f.setDate(f.getDate() + diasRetiro);
    fechaRetiro = f.toISOString().split('T')[0];
  }

  // Preparar payload
  const payload = {
    granjaId,
    tipo,
    loteId,
    fecha,
    diasRetiro,
    fechaRetiro,
    descripcion: document.getElementById('descripcion').value
  };

  // Logica por tipo
  if (tipo === 'Mortalidad') {
    const cantidad = parseInt(document.getElementById('cantidad').value);
    if (!cantidad || cantidad <= 0) return alert('Ingresa una cantidad válida');
    payload.productoAplicado = 'N/A';
    payload.cantidad = cantidad; // Cantidad de aves muertas
    payload.costoTotal = 0; // La mortalidad es pérdida, no costo directo de bolsillo aquí
  }
  else {
    // Vacunación o Tratamiento (Requiere Inventario)
    let inventarioId, cantidadUso, unidadUso;

    if (tipo === 'Vacunacion') {
      inventarioId = document.getElementById('vacunaSelect').value;
      cantidadUso = parseFloat(document.getElementById('dosis').value);
      unidadUso = document.getElementById('unidadDosis').value;
    } else {
      inventarioId = document.getElementById('insumoSelect').value;
      cantidadUso = parseFloat(document.getElementById('cantidadTratamiento').value);
      unidadUso = document.getElementById('unidadTratamiento').value;
    }

    if (!inventarioId) return alert("Selecciona un producto del inventario");

    // Buscar el item en memoria para saber su unidad base y stock
    const item = inventarioSanitario.find(i => i.id == inventarioId);
    if (!item) return alert("Error identificando el producto");

    // --- AQUÍ OCURRE LA MAGIA MATEMÁTICA ---
    const cantidadBase = calcularCantidadBase(cantidadUso, unidadUso, item.unidadMedida);

    console.log(`Stock: ${item.cantidad} ${item.unidadMedida} | Uso: ${cantidadUso} ${unidadUso} => Base: ${cantidadBase.toFixed(4)} ${item.unidadMedida}`);

    if (cantidadBase > item.cantidad) {
      return alert(`Error: Stock insuficiente de ${item.producto}. Tienes ${item.cantidad} ${item.unidadMedida}, necesitas ${cantidadBase.toFixed(4)} ${item.unidadMedida}.`);
    }

    payload.productoAplicado = item.producto;
    payload.inventarioId = parseInt(inventarioId);
    payload.cantidad = cantidadBase; // Enviamos lo convertido al backend
  }

  try {
    const res = await fetch(`${window.API_URL}/salud`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert('Registro guardado correctamente');
      cerrarFormularioSalud();
      cargarSalud();
      // Recargar inventario para actualizar stocks en los selects
      cargarVacunasForSelect();
    } else {
      const errData = await res.json();
      alert('Error: ' + (errData.error || 'No se pudo guardar'));
    }
  } catch (error) {
    console.error(error);
    alert('Error de conexión');
  }
}

async function eliminarSalud(id) {
  if (!confirm("¿Eliminar este registro? (Nota: El stock no se devuelve automáticamente)")) return;
  try {
    const token = localStorage.getItem('token');
    const granjaId = getSelectedGranjaId();
    await fetch(`${window.API_URL}/salud/${id}?granjaId=${granjaId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    cargarSalud();
  } catch (e) { console.error(e); }
}

// --- UI Helpers ---
function abrirFormularioSalud() {
  document.getElementById('formContainer').classList.add('is-open');
}
function cerrarFormularioSalud() {
  document.getElementById('formContainer').classList.remove('is-open');
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleFormBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const form = document.getElementById('saludForm');
  const tipoEvento = document.getElementById('tipoEvento');

  // Control dinámico del formulario
  if (tipoEvento) {
    tipoEvento.addEventListener('change', () => {
      const val = tipoEvento.value;
      document.getElementById('vacunaGroup').style.display = 'none';
      document.getElementById('tratamientoGroup').style.display = 'none';
      document.getElementById('mortalidadGroup').style.display = 'none';
      document.getElementById('diasRetiroGroup').style.display = 'block'; // Default visible

      if (val === 'Vacunacion') document.getElementById('vacunaGroup').style.display = 'block';
      else if (val === 'Tratamiento') document.getElementById('tratamientoGroup').style.display = 'block';
      else if (val === 'Mortalidad') {
        document.getElementById('mortalidadGroup').style.display = 'block';
        document.getElementById('diasRetiroGroup').style.display = 'none';
      }
    });
  }

  if (toggleBtn) toggleBtn.onclick = () => {
    document.getElementById('saludForm').reset();
    // Reset visual groups
    tipoEvento.dispatchEvent(new Event('change'));
    abrirFormularioSalud();
  };

  if (cancelBtn) cancelBtn.onclick = cerrarFormularioSalud;
  if (form) form.onsubmit = guardarSalud;

  cargarLotesForSelect();
  cargarVacunasForSelect();
  cargarSalud();
});