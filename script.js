
// ==========================================
// 1. ELEMENTOS DEL HTML
// ==========================================

const contenedorCarriles = document.getElementById("contenedorCarriles");

const btnAgregar = document.getElementById("btnAgregar");
const btnCerrar = document.getElementById("btnCerrar");

const modalAgregar = document.getElementById("modalAgregar");
const formAgregar = document.getElementById("formAgregar");

const nombreTipo = document.getElementById("nombreTipo");
const mensajeModal = document.getElementById("mensajeModal");


// ==========================================
// 2. VARIABLES Y CONFIGURACION
// ==========================================

const API = "https://pokeapi.co/api/v2/type/";

const CLAVE_STORAGE = "carrilesPokemon";

// Guardamos los carriles en un array de objetos.
let carriles = [];

let siguienteId = 1;


// ==========================================
// 3. CARGAR CARRILES GUARDADOS
// ==========================================

function recuperarCarriles() {

    const guardados = localStorage.getItem(CLAVE_STORAGE);

    if (guardados) {

        try {

            const tiposGuardados = JSON.parse(guardados);

            if (!Array.isArray(tiposGuardados)) {
                throw new Error("Formato de almacenamiento inválido");
            }

            carriles = tiposGuardados
                .filter(tipo => typeof tipo === "string")
                .map(tipo => ({
                    id: siguienteId++,
                    tipo: tipo,
                    pokemon: [],
                    estado: "cargando",
                    error: ""
                }));

        } catch (error) {

            console.error("Error recuperando carriles:", error);

            localStorage.removeItem(CLAVE_STORAGE);

        }
    }

    // Si no existen carriles guardados, creamos unos iniciales.

    if (carriles.length === 0) {

        carriles = [
            crearCarril("fire"),
            crearCarril("water")
        ];
    }

    // Dibujamos los carriles en pantalla.

    mostrarCarriles();

    // Consultamos nuevamente los datos de cada carril.

    carriles.forEach(carril => {
        cargarPokemon(carril.id);
    });
}


// ==========================================
// 4. CREAR UN NUEVO CARRIL
// ==========================================

function crearCarril(tipo) {

    return {
        id: siguienteId++,
        tipo: tipo,
        pokemon: [],
        estado: "cargando",
        error: ""
    };
}


// ==========================================
// 5. GUARDAR EN LOCALSTORAGE
// ==========================================

function guardarCarriles() {

    // Solo guardamos los nombres de los tipos.

    const tipos = carriles.map(carril => carril.tipo);

    localStorage.setItem(
        CLAVE_STORAGE,
        JSON.stringify(tipos)
    );
}


// ==========================================
// 6. CONSULTAR POKEMON EN LA API
// ==========================================

async function cargarPokemon(id) {

    const carril = carriles.find(c => c.id === id);

    if (!carril) return;

    // Activamos el estado de carga.

    carril.estado = "cargando";
    carril.error = "";

    mostrarCarriles();

    try {

        // Consultamos el tipo de Pokémon.

        const respuesta = await fetch(
            API + encodeURIComponent(carril.tipo)
        );

        // Verificamos si el tipo existe.

        if (respuesta.status === 404) {

            throw new Error("El tipo de Pokémon no existe.");
        }

        if (!respuesta.ok) {

            throw new Error("No se pudo consultar la PokéAPI.");
        }

        const datos = await respuesta.json();

        // Obtenemos los primeros 12 Pokémon del tipo.

        const listaPokemon = datos.pokemon.slice(0, 12);

        // Consultamos los detalles de cada Pokémon.

        const resultados = await Promise.all(

            listaPokemon.map(async elemento => {

                const respuestaPokemon = await fetch(
                    elemento.pokemon.url
                );

                if (!respuestaPokemon.ok) {
                    throw new Error("Error obteniendo un Pokémon.");
                }

                return await respuestaPokemon.json();
            })

        );

        // Buscamos nuevamente el carril.

        const carrilActual = carriles.find(c => c.id === id);

        if (!carrilActual) return;

        // Guardamos los datos recibidos.

        carrilActual.pokemon = resultados;

        carrilActual.estado = "exito";

        carrilActual.error = "";

    } catch (error) {

        console.error("Error:", error);

        const carrilActual = carriles.find(c => c.id === id);

        if (!carrilActual) return;

        carrilActual.estado = "error";

        carrilActual.error = error.message;

    }

    // Actualizamos la interfaz.

    mostrarCarriles();
}


// ==========================================
// 7. MOSTRAR TODOS LOS CARRILES
// ==========================================

function mostrarCarriles() {

    contenedorCarriles.innerHTML = "";

    carriles.forEach(carril => {

        const elementoCarril = document.createElement("article");

        elementoCarril.className = "carril";

        elementoCarril.innerHTML = `

            <div class="carril-encabezado">

                <h2>${carril.tipo}</h2>

                <div class="menu-contenedor">

                    <button
                        class="btn-menu"
                        data-accion="menu"
                        data-id="${carril.id}"
                        aria-label="Opciones del carril ${carril.tipo}"
                    >
                        ⋮
                    </button>

                    <div class="menu-opciones oculto">

                        <button
                            data-accion="actualizar"
                            data-id="${carril.id}"
                        >
                            Actualizar
                        </button>

                        <button
                            data-accion="eliminar"
                            data-id="${carril.id}"
                        >
                            Eliminar
                        </button>

                    </div>

                </div>

            </div>

            <div class="lista-pokemon">

                ${mostrarContenido(carril)}

            </div>

        `;

        contenedorCarriles.appendChild(elementoCarril);

    });

}


// ==========================================
// 8. MOSTRAR CONTENIDO DE CADA CARRIL
// ==========================================

function mostrarContenido(carril) {

    // Estado de carga.

    if (carril.estado === "cargando") {

        return `
            <div class="estado cargando">
                Cargando Pokémon...
            </div>
        `;
    }

    // Estado de error.

    if (carril.estado === "error") {

        return `
            <div class="estado error">
                <p>${carril.error}</p>

                <br>

                <button
                    data-accion="actualizar"
                    data-id="${carril.id}"
                >
                    Intentar nuevamente
                </button>
            </div>
        `;
    }

    // Si no hay Pokémon.

    if (carril.pokemon.length === 0) {

        return `
            <div class="estado">
                No hay Pokémon disponibles.
            </div>
        `;
    }

    // Creamos las tarjetas.

    return carril.pokemon.map(pokemon => {

        const imagen =
            pokemon.sprites.other?.["official-artwork"]?.front_default
            || pokemon.sprites.front_default
            || "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png";

        const numero = String(pokemon.id).padStart(3, "0");

        return `

            <div class="tarjeta-pokemon">

                <img
                    src="${imagen}"
                    alt="${pokemon.name}"
                    loading="lazy"
                >

                <div class="info-pokemon">

                    <h3>${pokemon.name}</h3>

                    <p>
                        Pokédex: #${numero}
                    </p>

                    <p>
                        EXP base: ${pokemon.base_experience ?? "N/D"}
                    </p>

                </div>

            </div>

        `;

    }).join("");

}


// ==========================================
// 9. AGREGAR UN NUEVO TIPO DE POKEMON
// ==========================================

async function agregarCarril(tipo) {

    // Eliminamos espacios y convertimos a minúsculas.

    tipo = tipo.trim().toLowerCase();

    if (!tipo) {

        mostrarMensaje("Escribe un tipo de Pokémon.", "error");

        return;
    }

    // Evitamos agregar tipos repetidos.

    const existe = carriles.some(
        carril => carril.tipo === tipo
    );

    if (existe) {

        mostrarMensaje("Este carril ya existe.", "error");

        return;
    }

    // Creamos el carril.

    const nuevoCarril = crearCarril(tipo);

    carriles.push(nuevoCarril);

    guardarCarriles();

    mostrarCarriles();

    // Cerramos el modal y limpiamos el campo.

    modalAgregar.classList.add("oculto");

    nombreTipo.value = "";

    mensajeModal.textContent = "";

    // Consultamos los Pokémon.

    await cargarPokemon(nuevoCarril.id);

    // Comprobamos si hubo un error.

    if (nuevoCarril.estado === "error") {

        modalAgregar.classList.remove("oculto");

        mostrarMensaje(
            "No se pudo agregar: " + nuevoCarril.error,
            "error"
        );
    }
}


// ==========================================
// 10. ELIMINAR UN CARRIL
// ==========================================

function eliminarCarril(id) {

    carriles = carriles.filter(
        carril => carril.id !== id
    );

    guardarCarriles();

    mostrarCarriles();

}


// ==========================================
// 11. ACTUALIZAR UN CARRIL
// ==========================================

function actualizarCarril(id) {

    cargarPokemon(id);

}


// ==========================================
// 12. MANEJAR LOS MENUS
// ==========================================

contenedorCarriles.addEventListener("click", function (evento) {

    const boton = evento.target.closest("button[data-accion]");

    if (!boton) return;

    const accion = boton.dataset.accion;

    const id = Number(boton.dataset.id);

    if (accion === "menu") {

        const menu = boton.nextElementSibling;

        // Cerramos los demás menús.

        document.querySelectorAll(".menu-opciones").forEach(elemento => {

            if (elemento !== menu) {

                elemento.classList.add("oculto");
            }

        });

        menu.classList.toggle("oculto");

    }

    if (accion === "actualizar") {

        actualizarCarril(id);
    }

    if (accion === "eliminar") {

        eliminarCarril(id);
    }

});


// ==========================================
// 13. ABRIR Y CERRAR EL MODAL
// ==========================================

btnAgregar.addEventListener("click", function () {

    modalAgregar.classList.remove("oculto");

    nombreTipo.focus();

});

btnCerrar.addEventListener("click", function () {

    modalAgregar.classList.add("oculto");

    mensajeModal.textContent = "";

});


// Cerrar haciendo clic fuera de la ventana.

modalAgregar.addEventListener("click", function (evento) {

    if (evento.target === modalAgregar) {

        modalAgregar.classList.add("oculto");
    }

});


// ==========================================
// 14. MENSAJES DEL MODAL
// ==========================================

function mostrarMensaje(texto, tipo) {

    mensajeModal.textContent = texto;

    mensajeModal.className = "mensaje-modal " + tipo;

}


// ==========================================
// 15. FORMULARIO PARA AGREGAR TIPOS
// ==========================================

formAgregar.addEventListener("submit", async function (evento) {

    evento.preventDefault();

    const tipo = nombreTipo.value;

    const boton = formAgregar.querySelector("button");

    boton.disabled = true;

    boton.textContent = "Consultando...";

    await agregarCarril(tipo);

    boton.disabled = false;

    boton.textContent = "Agregar carril";

});


// ==========================================
// 16. INICIAR APLICACION
// ==========================================

recuperarCarriles();
