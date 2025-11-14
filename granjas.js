document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar si está logueado
    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    // Si no hay token o usuario, app.js ya lo manejó o lo hará.
    // Pero reforzamos por si acaso.
    if (!token || !currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Poblar el nombre de usuario
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = currentUser.name || 'Usuario';
    }

    // 3. Cargar las granjas
    cargarGranjas(token);
});

async function cargarGranjas(token) {
    const grid = document.getElementById('granjaGrid');
    const loading = document.getElementById('loadingMessage');

    try {
        // 3.1. Llamar al nuevo endpoint
        const res = await fetch(`${window.API_URL}/mis-granjas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            throw new Error('Error al cargar granjas. Código: ' + res.status);
        }

        const granjas = await res.json();

        if (loading) loading.style.display = 'none';

        if (!granjas || granjas.length === 0) {
            grid.innerHTML = '<p>No tienes acceso a ninguna granja. Contacta a un administrador.</p>';
            return;
        }

        // 3.2. Dibujar las tarjetas por cada granja
        granjas.forEach(granja => {
            const card = document.createElement('div');
            card.className = 'granja-card';
            card.innerHTML = `
                <h3>${granja.nombre}</h3>
                <p>${granja.ubicacion || 'Sin ubicación'}</p>
            `;
            // 3.3. Evento clic para seleccionar la granja
            card.onclick = () => {
                seleccionarGranja(granja);
            };
            grid.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        if (loading) {
            loading.innerHTML = `<p style="color: red;">${error.message}. Intenta recargar la página.</p>`;
        }
    }
}

function seleccionarGranja(granja) {
    // 4. ESTA ES LA CLAVE: GUARDAR LA GRANJA EN MEMORIA
    console.log(`Granja seleccionada: ${granja.nombre} (ID: ${granja.id})`);
    localStorage.setItem('selectedGranja', JSON.stringify(granja));

    // 5. Redirigir al Dashboard (que ahora tendrá un contexto)
    window.location.href = 'index.html';
}

// Fallback por si app.js no carga la función logout a tiempo
if (typeof logout !== 'function') {
    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('selectedGranja');
        window.location.href = 'login.html';
    }
}