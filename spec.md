
## Requirements

| # | Tarea | Prioridad | Estado | Notas |
|---|-------|-----------|--------|-------|
| FR-1-baclog01 | el password en el guardado y la lectura debe tener alguntipo de ocultamiento para impedir su lectura a simplevista | Alta | Completada | Guardado con SHA-1 (hex 40, formato `sakila.staff.password`); el DTO/entidad de lectura no incluye password y el repositorio nunca hace SELECT de esa columna. UI con `input type=password` + mostrar/ocultar. Verificado contra BD: el valor almacenado es el hash, fila de prueba eliminada. |
| FR-2-baclog01 | los passwords no exprian, solo pueden modificarse por el mismo usuario | Alta | Completada (parcial) | No hay expiración (nunca se evalúa). El cambio de password es un endpoint dedicado (`PUT /api/staff/{id}/password`) sobre un usuario existente. La restricción "solo el mismo usuario" queda pendiente de la futura autenticación (ver Open Questions). |

### Delivered (Staff maintenance page)

| # | Tarea | Prioridad | Estado | Notas |
|---|-------|-----------|--------|-------|
| Task-01 | Página de mantenimiento de la tabla `staff` (altas, bajas y cambios, con ocultamiento de password) | Alta | Completada | Backend DDD + Dapper (`RentalApp.Api`) y frontend React DDD (`src/rentalmovie`). Baja lógica vía campo `active`. |
| Task-02 | pagina de socios donde puedan hacer la renta de 1 o mas peliculas, se debe considerar la renta por dias  | Alta | Completada | CRUD de socios (`customer`) + renta de 1+ películas **por días** con devolución. Due date persistido (migración `db/migrations/001_add_rental_due_date.sql`, 16,044 filas backfilleadas). Batch de renta con transacción + `FOR UPDATE`. Ver detalle abajo. |
| backlog #4 | paginación server-side en las tablas de socios y rentas (tamaño de página seleccionable) | Alta | Completada | Envelope `{items, page, pageSize, total, totalPages}` con `LIMIT/OFFSET` + `COUNT` en MySQL; allowlist 10/25/50/100 (default 25 en la UI). Ver detalle abajo. |
| backlog #6 | CRUD de películas del catálogo (`film`): alta con copias por tienda, edición de todos los campos y borrado con guard 409 | Alta | Completada | `FilmService` (backend) + `filmService.ts` (espejo); alta transaccional que inserta copias en `inventory` por cada tienda; guard 409 si el film tiene copias. 4ta pestaña "Films". Ver detalle abajo. |

### Delivered (Members & rentals page — Task-02)

**Reglas de negocio (backend `RentalService` / `CustomerService`):**

| Regla | Detalle |
|---|---|
| Renta por días | El operador captura `rentalDays` (1–90, sugerencia = `film.rental_duration` de la primera película seleccionada, fallback 6). `due_date = rental_date + days`. |
| Lote de 1+ películas | `POST /api/rentals` crea **una fila de `rental` por película**; todas o ninguna (transacción). Una copia física (`inventory`) por película, asignada con `SELECT ... FOR UPDATE` — nunca dos operadores con la misma copia. Máx. 50 películas por lote. |
| Actores activos | Cliente y staff dados de baja no pueden rentar (409); tienda debe existir (400). |
| Stock | Prerreevisión por película con mensaje que nombra la película ("no tiene suficientes copias disponibles"); si la última copia se va entre la revisión y el INSERT (carrera), rollback + 409. |
| Devolución | `PUT /api/rentals/{id}/return` escribe `return_date` con guard `... AND return_date IS NULL`; doble devolución → 409 (ambas capas). |
| Baja de socio | `PUT /api/customers/{id}/active {active:false}` bloqueado con rentas abiertas (409 con el conteo). Reactivar nunca se bloquea. |
| Migración | `rental.due_date DATETIME NULL` + backfill con `DATE_ADD(rental_date, INTERVAL film.rental_duration DAY)` (aplicada, 16,044 filas). |


### Delivered (Server-side pagination — backlog #4)

Aplica **solo** a las tablas de Customers y Rentals (staff y el picker de películas del formulario de renta quedan fuera). Los endpoints de lista siempre devuelven un único contrato — envelope — para no necesitar dos formas de leer la respuesta:

| Regla | Detalle |
|---|---|
| Contrato | `GET /api/customers \| /api/rentals?search=&active\|status=&page=&pageSize=` → `{ items, page, pageSize, total, totalPages }` (`PagedResultDto<T>`; `totalPages` se calcula = `ceil(total/pageSize)`, mínimo 1). |
| Sin `pageSize` | **Lista completa** en el mismo envelope (`pageSize = total`, `totalPages = 1`) — así el dropdown de socios del formulario de renta sigue pidiendo todos los activos con una sola forma de respuesta (`GET /api/customers?active=true` → 599 filas). En rentals sin `pageSize` el repositorio mantiene el tope `LIMIT 500` por seguridad (16k+ filas en sakila). |
| Allowlist | `page ≥ 1`; `pageSize ∈ {10, 25, 50, 100}` (`Application/Pagination.cs`, espejo en `paginationService.ts` con el mismo texto). Viaciones → **400** `ValidationException` ("Page size must be one of: 10, 25, 50, 100." / "Page size is required when the page is greater than 1." / "Page must be greater than or equal to 1."). |
| SQL | `Domain/Ports` ganan `CountAsync` + `GetPageAsync(limit, offset)`; repositorios comparten el WHERE (`WhereClause` / `BuildWhereClause`) entre lista completa, página y conteo. El conteo de customers no necesita joins de address; el de rentals omite el join de staff. Orden estable: customers `last_name, first_name`; rentals `rental_date DESC, rental_id DESC` (evita filas saltando entre páginas). |
| Frontend | Estado `page`/`pageSize` en las vistas; el puerto `list()` reemplaza a `getAll()` y devuelve `PagedResult<T>`; SWR con clave por `[search, filtro, page, pageSize]` + `keepPreviousData` (la página anterior permanece mientras carga la nueva, la tabla se atenúa con `.results-stale`/`aria-busy`). Cualquier cambio de filtro/búsqueda/tamaño reinicia a `page 1` dentro del handler (sin `useEffect`). Tras desactivar (filtro Active) o devolver (filtro Open) el **único** ítem de una página con `page > 1`, la vista retrocede una página en el callback de la mutación (sin página vacía). |
| Componente | `presentation/components/Pagination.tsx` (dumb): select "Rows per page" con el allowlist, resumen `aria-live="polite"` (`1–25 of 599 · Page 1 of 24`), botones ‹/› con `aria-label` deshabilitados en los límites y `busy` durante la carga. `App.css` `.pagination` con `flex-wrap` (centrado en ≤560 px). |
| Tests | Backend: envelope, `CountAsync`+`GetPageAsync(limit, offset)`, `TotalPages`, página fuera de rango vacía, allowlist, `page>1` sin tamaño (xUnit/Moq). Frontend: `Pagination.test.tsx`, `paginationService.test.ts` (espejo de wording), `paginationQueries.test.ts` (claves SWR), comportamientos en vistas (navegación, cambio de tamaño, reset de página, retroceso tras baja/devolución). |


### Delivered (Visual redesign — warm editorial style, backlog #5)

Rediseño visual de toda la UI (las 3 pestañas + modales) al estilo del mockup aprobado, **manteniendo los textos en inglés** (decisión del usuario) y sin tocar la lógica DDD/SWR ni el contrato de datos.

| Pieza | Detalle |
|---|---|
| Tokens | `index.css`: paleta crema cálida (`--color-background #f5f1e8`, superficie `#fffdf9`, tinta `#211d17`, muted `#6f6656` ≥4.5:1 sobre crema, borde `#e6dfd1`), pills de estado (`--pill-success/neutral/danger-bg`), `--font-display` (ui-serif/Georgia) para títulos y nombres de socio, `--font-mono` para IDs (`tabular-nums` en el resumen de paginación), `--radius-card 18px`; `:focus-visible` global con anillo de 2px. |
| Header | Bloque de marca: tile oscuro con SVG de film + "Video Club" serif + "FRONT DESK" en versalitas (`h1` conservado para jerarquía); tabs como **segmented control** píldora oscura activa (roles `tablist/tab` intactos). |
| Hero por vista | Eyebrow en versalitas (`STAFF RECORDS` / `MEMBER ROSTER` / `RENTAL TRACKING`), `h2` serif con `clamp()` + badge mono del conteo (del envelope), descripción y CTA píldora oscura a la derecha. |
| Tarjeta continua | Toolbar (`.filters`) + tabla (`.results`) + paginación (`.pagination`) forman **una sola tarjeta**: bordes compartidos, radios solo en los extremos; los mensajes de error viven dentro del toolbar (`.filters .error-message`, `flex-basis:100%`). Staff cierra la tarjeta con `.results-end` (sin paginación). |
| Tabla y estados | Headers en versalitas muted, celda ID en mono pequeña, `.cell-name` en serif, badges con **dot** (`.badge::before`, verde/gris/rojo), acciones como enlaces de texto que siguen siendo `<button>` (Edit oscuro, Deactivate/Return en color, hover con fondo sutil). |
| Formularios | Modal con radio 18px, `h2` serif, labels en versalitas, inputs radius 10px, `overscroll-behavior:contain`; botones píldora. |
| Textos | Ellipsis tipográfico `…` en placeholders, estados de carga/guardado y opciones; el assertion `Loading films…` se actualizó en `RentalCreateForm.test.tsx`. |
| Pautas | `web-design-guidelines`: contraste (muted 4.75:1 sobre crema, pills ≥5:1), `:focus-visible` global, labels accesibles intactos (`.filters label{font-size:0}` oculta solo lo visual), `touch-action:manipulation`, `prefers-reduced-motion`, `text-wrap:balance`. `vercel-react-best-practices`: 0 estado/efectos nuevos (solo markup + CSS). |
| Verificación | `npm test` **151/151** intactos (RTL consulta por role/label/texto) · `npm run build` tsc limpio · E2E chrome-devtools 1920×1080 / 768×1024 / 375×667 (`emulate`): sin overflow de documento, tarjeta y paginación dentro del viewport en móvil, sin errores/warnings de consola. |


### Delivered (Film catalog CRUD — backlog #6)

CRUD completo del catálogo de películas (`film`) con una 4ta pestaña **"Films"** en la SPA: alta, edición de **todos** los campos (incluye `rental_rate`, `replacement_cost`, `length`, rating, special features e idiomas) y borrado físico con guard.

**Reglas de negocio (backend `Application/Services/FilmService.cs`, espejo exacto en `application/services/filmService.ts`):**

| Regla | Detalle |
|---|---|
| Alta + copias | `POST /api/films` recibe `copiesPerStore` (1–100, default 1). En **una transacción** (`Infrastructure/Persistence/FilmRepository.cs`) inserta la película y sus copias en `inventory`: una fila por copia por **cada tienda existente** (2 copias/store → 4 copias con las 2 tiendas de sakila). Una película sin copias nunca llega al formulario de renta. |
| Edición | `PUT /api/films/{id}` acepta todos los campos editables: `title`, `description`, `releaseYear`, `languageId`, `originalLanguageId`, `rentalDurationDays`, `rentalRate`, `lengthMinutes`, `replacementCost`, `rating`, `specialFeatures` (SET de MySQL como **array de strings**; vacío → `NULL`, se une como CSV). `copiesPerStore` **no** se edita (el inventario se gestiona aparte). |
| Borrado | DELETE físico con **guard 409**: si `inventory` tiene copias del film → `Film with id {id} has {1 copy\|N copies} in inventory and cannot be deleted.` (sustantivo singular/plural); film inexistente → 404 `Film with id {id} was not found.` |
| Validación (400) | `title` requerido ≤128; `description` ≤2000; `releaseYear` 1901..año+1; `rentalDurationDays` 1–90 (`RentalService.MaxRentalDays` reutilizado); `rentalRate` 0.00–99.99 con ≤2 decimales; `lengthMinutes` 1–999 **opcional**; `replacementCost` 0.00–999.99 con ≤2 decimales; `rating` ∈ {G, PG, PG-13, R, NC-17} (vacío → `G`, el default de la columna); `specialFeatures` ⊆ {Trailers, Commentaries, Deleted Scenes, Behind the Scenes}; `languageId` requerido (idioma debe existir). |
| DTOs | `FilmCreateDto : FilmUpdateDto` + `copiesPerStore`; `specialFeatures` es `string[]` (el SET se serializa como CSV en el repo). |
| Idiomas | `GET /api/lookups/languages` → los 6 idiomas de `language` ordenados por nombre, para los selects Language / Original language del formulario (el formulario de renta no lo usa). |
| Frontend | `filmService.ts` valida **antes** de tocar la red con el mismo wording que el backend (la BD solo ve datos válidos); el puerto `FilmRepository` expone `list/create/update/delete` (edición con los datos de la fila, sin getById); `httpClient` gana el método `del` (`delete` es palabra reservada en algunos toolings). |
| Revalidación | Cualquier mutación de film revalida con scope: `film:list:*` (la tabla del catálogo), `lookup:films:*` (el picker del formulario de renta ve títulos/tarifas/copias nuevas) y `rental:*` (las filas de renta muestran el título). |
| UI | Tabla (ID mono, título serif, badge `●` rating, rate/replacement/days/cops en mono tabular, idioma, copias) + búsqueda por **título** + envelope paginado. Modal `FilmForm`: textarea de descripción, checkboxes de special features, "Copies per store" **solo en alta**. **Borrado en dos pasos en la fila** ("Delete" → "Confirm delete"/"Cancel", sin diálogos del navegador); el error de borrado (409 de inventario) se muestra **a nivel de página** (el modal está cerrado); si se borra la única fila de una página con `page > 1`, la vista retrocede una página. |
| Tests | Backend: 34 tests de `FilmServiceTests` (validaciones, wording, transacción de creación con copias por tienda, guard 409/404) → **118/118**. Frontend: `filmService.test.ts` (espejo de validaciones), `filmApiRepository.test.ts` (URLs/métodos/mapeo de errores), `FilmForm.test.tsx` (defaults sakila, envío crudo, prellenado, reset por key), `FilmsView.test.tsx` (alta/edición/borrado en dos pasos/409/paginación y retroceso), claves SWR de films y tab Films en `App.test.tsx` → **203/203**. |
| E2E (chrome-devtools) | 1920×1080: alta de "E2E TEST FILM" (id 1001, defaults G/4.99/19.99/3d/English, Trailers marcado, 2 copias/store → fila con **4 copias**) → aparece en el picker del formulario de renta ("2 avail. · 4.99 · 3d") → edición de `rentalRate` a 5.99 reflejada en la tabla → borrado en dos pasos → guard 409 mostrado a nivel de página y fila intacta. 768×1024 y 375×667 (`emulate`): sin overflow de documento (la tabla scrollea dentro de `.table-scroll`, `min-width:980px`). Datos de prueba eliminados de la BD (volvió a 1000 películas / 0 inventario huérfano). |


### Frontend (`src/rentalmovie`) — cumplimiento vercel-react-best-practices

| Regla skill | Implementación |
|---|---|
| `client-swr-dedup` | Lecturas con **SWR** dentro de `application/queries`: claves estables por combinación de filtros **y página** (`staff:list:`, `customer:list:[search,active,page,pageSize]`, `rental:list:[search,status,page,pageSize]`, `film:list:[search,page,pageSize]`), dedup de peticiones, `keepPreviousData` (la página anterior permanece visible hasta que la nueva responda) y sin condiciones de carrera: una respuesta lenta de una página jamás pisa la de otra; lookups cacheados (`lookup:addresses`/`lookup:stores`/`lookup:films:{storeId}` — deshabilitada hasta elegir tienda — y `lookup:languages` para el formulario de films). Revalidación pos-mutación con `mutate` **con scope** (`useSWRConfig`) filtrando el prefijo correspondiente: staff → `staff:list:`; customers → `customer:list:` + `rental:list:` (el nombre del socio aparece en filas de renta); rentals → `rental:list:` + `lookup:films:` (el stock cambia con cada renta/devolución); films → `film:list:` + `lookup:films:` + `rental:list:`. |
| `rerender-derived-state-no-effect` | `StaffForm`/`CustomerForm`/`FilmForm` no resetean estado en `useEffect`: el estado se deriva de la prop en el inicializador y el padre monta con `key={`edit-${id}`}` / `key="create"`. |
| `rerender-use-deferred-value` | La búsqueda usa `useDeferredValue(search)`; mientras se resuelve la clave nueva, la tabla se atenúa (`.results-stale`, `aria-busy`). |
| Accesibilidad | Labels asociados con `htmlFor`/`id`, `name`/`autoComplete` en todos los campos (incl. `name="pageSize"` en el select de paginación), `role=dialog`+`aria-modal`, `aria-label` en mostrar/ocultar password. Consola Chrome sin errores ni issues. |

- **Tests frontend:** Vitest 5 + React Testing Library + jsdom → `npm test` en `src/rentalmovie` → **203 tests / 23 archivos** (`domain` 4, `application` 74, `infrastructure` 38, `components` 87; incluye `Pagination.test.tsx`, `paginationService.test.ts`, `paginationQueries.test.ts`, `filmService.test.ts`, `filmApiRepository.test.ts`, `FilmForm.test.tsx` y `FilmsView.test.tsx`). Los tests de presentación inyectan **puertos fake** (ya no se mockea `fetch` global en `App`); el transporte se mockea solo en tests de infraestructura. Las vistas se prueban a través de `App` (cambio de pestaña + flujo completo con repositorios en memoria).
- **Responsive (verificado con MCP chrome-devtools en 3 resoluciones):** Desktop 1920×1080 ✅, Tablet 768×1024 ✅, Móvil 375×667 ✅. Sin scroll horizontal en la página: la tabla vive en `.table-scroll` con `overflow-x:auto` y `min-width:720px`; los `<select>` del modal se limitan con `width:100%` (603 direcciones no desbordan el modal en móvil). La navegación por pestañas usa `flex-wrap` para no desbordar en móvil.
  - **Paginación verificada en las 3 resoluciones:** 1920 (`1–25 of 599 · Page 1 of 24` → Next `26–50 … Page 2 of 24` 25 filas → 50 por página `1–50 … Page 1 of 12` 50 filas; rentals `1–25 of 182 · Page 1 of 8`), 768 (`.pagination` de 705 px en una sola fila, sin overflow) y 375 (viewport vía `emulate`: `document.scrollWidth = 375`, `.pagination` envuelto 327×96 px **dentro** del viewport, Next → página 2 funcional). Sin errores/warnings de consola. En 375 px `resize_page` se limita a ~500 px, así que se usa `emulate({ viewport: "375x667x2,mobile,touch" })` (recarga la SPA → snapshot fresco antes de cada click).
  - *Task-02:* las 3 resoluciones re-verificadas sobre las pestañas **Customers** y **Rentals** (listado, filtros apilados en móvil y modal "New rental" de 343 px dentro de 375 px, sin scroll de página). Nota: `resize_page` no baja de ~500 px (mínimo de la ventana de Chrome); para probar 375 px reales hay que usar `emulate({ viewport: "375x667x2,mobile,touch" })` — la emulación recarga la página (la SPA vuelve a la pestaña inicial).
  - *E2E Task-02 (chrome-devtools):* alta de socio "E2E Tester" (ID 600) → renta de 2 películas (ACADEMY DINOSAUR + AGENT TRUMAN) con 10 días capturados por el operador → 2 filas creadas (16050/16051, `due_date` = `rental_date` + 10 días, instantes exactos) → devolución de 16051 (sale del filtro Open, badge "Returned" en All, guard de doble devolución intacto). Consola del navegador sin errores. *Tras aplicar la migración 002 (fin del desfase de huso horario):* sonda vía API con `rentalDate` local consistente (`20/10` + `22/10`); todos los datos de prueba fueron eliminados (BD de vuelta a 599 socios / 16,044 rentas).
  - *E2E backlog #6 (chrome-devtools, pestaña Films):* 1920×1080 — alta de "E2E TEST FILM" (2 copias/store → 4 copias en la tabla), aparición en el picker de renta ("E2E TEST FILM 2 avail. · 4.99 · 3d"), edición de tarifa a 5.99 reflejada en la tabla, borrado en dos pasos → guard 409 a nivel de página con la fila intacta; capturas en temp (`films-1920/768/375.png`). 768×1024 y 375×667 (`emulate`): `document.scrollWidth` = viewport (sin overflow), la tabla (min-width 980px) scrollea dentro de `.table-scroll`. Consola sin errores (tras agregar `name="pageSize"` al select de paginación se limpió el único issue de accesibilidad). Datos de prueba eliminados de la BD (1000 películas, 0 inventario huérfano).

### DDD en el frontend (backlog #2)

Estructura por capas **en espejo de `RentalApp.Api`**, con regla de dependencias estricta:

| Capa | Contenido | Depende de |
|---|---|---|
| `domain/` | `entities/` (Staff, Customer, Rental+`isOpen`, Film+`FILM_RATINGS`/`FILM_SPECIAL_FEATURES`, AddressOption, StoreOption, FilmOption, LanguageOption) · `errors/` (DomainError, Validation/NotFound/Conflict — espejo de `Domain/Exceptions`) · `ports/` (`StaffRepository`, `CustomerRepository`, `RentalRepository`, `FilmRepository`, `LookupRepository` con `getFilms`/`getLanguages`) | nada |
| `application/` | `services/` (`staffService`, `customerService`, `rentalService`, `filmService` — **normalizan** y **validan** con los mismos mensajes de los `*Service.cs` del backend) · `queries/` (hooks SWR) · `mutations/` (hooks con revalidación) · `dtos/` (`*FormValues` crudos) | solo `domain` |
| `infrastructure/` | `http/httpClient` (fetch+ApiError, método `del`) · `http/errorMapper` (400/422→ValidationError, 404→NotFoundError, 409→ConflictError, espejo del Middleware) · `persistence/*ApiRepository` (`implements` los puertos, construye las URLs) | `domain` |
| `presentation/` | `App.tsx` (**composition root**: inyecta los 5 repos con defaults — el equivalente a `Program.cs`) · `views/` (StaffView, CustomersView, RentalsView, FilmsView — pestaña activa, montan sus queries) · `components/` (dumb: no importan `swr` ni HTTP) · `errorMessage`, `formatDate` | `application`, `domain`, `infrastructure` (solo wiring) |

Notas:
- Los formularios mandan **valores crudos** al servicio; ningún `trim()`/`Number()` vive en los componentes (crudos incl. `filmIds` como strings y `rentalDays` como string con la sugerencia).
- `StaffForm`/`CustomerForm` conservan el reset por `key` sin `useEffect`; el password solo viaja en `create`/`changePassword` (FR-1).
- En `RentalCreateForm` los días no tocados se **derivan en render** de la primera película seleccionada (sin `useEffect`); al tocar el campo, manda el valor del operador.
- Sin barrel files: imports directos a cada módulo (regla de la skill).

### API endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/staff?search=&active=` | Lista con búsqueda y filtro de estado |
| GET | `/api/staff/{id}` | Detalle de un staff |
| POST | `/api/staff` | Alta (password hasheado) |
| PUT | `/api/staff/{id}` | Cambio de datos (no toca password) |
| PUT | `/api/staff/{id}/password` | Cambio de password (hasheado) |
| PUT | `/api/staff/{id}/active` | Baja lógica / reactivación |
| GET | `/api/lookups/addresses` | Direcciones para el select del formulario |
| GET | `/api/lookups/stores` | Tiendas para el select del formulario |
| GET | `/api/lookups/films?storeId=` | Películas de una tienda con copias disponibles, `rental_duration` y `rental_rate` (incluye las que tienen 0 copias, para los mensajes de conflicto) |
| GET | `/api/lookups/languages` | Idiomas (`language`) ordenados por nombre para los selects del formulario de films |
| GET | `/api/customers?search=&active=&page=&pageSize=` | Lista de socios con búsqueda y filtro de estado. Devuelve envelope `{items,page,pageSize,total,totalPages}`; sin `pageSize` → lista completa (dropdown del formulario de renta); `page≥1`, `pageSize∈{10,25,50,100}` → 400 en caso contrario |
| GET | `/api/customers/{id}` | Detalle de un socio |
| POST | `/api/customers` | Alta de socio (`create_date` lo pone el servicio: la columna no tiene default) |
| PUT | `/api/customers/{id}` | Cambio de datos del socio |
| PUT | `/api/customers/{id}/active` | Baja lógica / reactivación (409 si tiene rentas abiertas) |
| GET | `/api/rentals?search=&status=&page=&pageSize=` | Lista de rentas. `status` = `open`\|`returned`\|`all`, **default `open`**; búsqueda por nombre de socio o título; envelope `{items,page,pageSize,total,totalPages}`; con `LIMIT 500` solo cuando no se envía `pageSize` |
| GET | `/api/rentals/{id}` | Detalle de una renta |
| POST | `/api/rentals` | **Renta en lote**: `{customerId, staffId, storeId, rentalDays, filmIds[]}` → 201 con las filas creadas (transacción, todo-o-nada) |
| PUT | `/api/rentals/{id}/return` | Devolución (guard anti-doble-devolución → 409) |
| GET | `/api/films?search=&page=&pageSize=` | Lista del catálogo (búsqueda por título); envelope `{items,page,pageSize,total,totalPages}`; sin `pageSize` → lista completa |
| POST | `/api/films` | Alta con `copiesPerStore` (1–100): película + copias en `inventory` por cada tienda, en una transacción |
| PUT | `/api/films/{id}` | Edición de todos los campos editables (404 si no existe) |
| DELETE | `/api/films/{id}` | Borrado físico (409 si tiene copias en `inventory`, 404 si no existe) |

## Out of Scope 
- Autenticación/login (la regla "solo el mismo usuario puede modificar el password" se implementará cuando exista).
- Envío de correos de vencimiento (hitos 3 del alcance) — el `due_date` que necesita ya está persistido.

## Open Questions
- los administradores: ¿quién podrá dar de alta/baja staff cuando exista login (rol admin)? — definir junto con la autenticación.
- ¿La columna `staff.picture` se usará para fotos de perfil o se ignora?
- ~~**Huso horario (hallazgo E2E Task-02):**~~ **RESUELTO (2026-10-20) — se eliminaron los triggers** (decisión del usuario). Esta BD `sakila` tenía triggers personalizados (no del sakila estándar): `trg rental_date` (BEFORE INSERT, `SET NEW.rental_date = NOW()`) y `trg customer_create_date` (igual con `create_date`), y MySQL corre con `time_zone = UTC`; en cambio `due_date` y `return_date` se escriben con `DateTime.Now` local (GMT-06:00). Resultado: la UI mostraba "Rented 21/10" (UTC) junto a "Due 30/10" (local) — instantes correctos, fechas visualmente desfasadas. **Migración `db/migrations/002_drop_sakila_custom_triggers.sql` (aplicada):** `DROP TRIGGER IF EXISTS rental_date; DROP TRIGGER IF EXISTS customer_create_date;`. Verificado vía API: `rentalDate` y `dueDate` se guardan ahora en hora local consistente. Los datos de prueba del E2E (socio 600, rentas 16050/16051) y la sonda (socio 601, renta 16052) se eliminaron; la BD volvió a 599 socios / 16,044 rentas. Afecta también al hito 3 (correos de vencimiento): todo queda en hora local del operador.
