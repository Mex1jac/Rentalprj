# Contexto del proyecto: 

Desarrollar un sistema que permita la renta de peliculas 

## 1. Objetivo
- Qué es: es una aplicacion que permite la renta de peliculas a los socios de un video club
- Para qué sirve: permite a cada socio con menbresia activa rentar peliculas para ver en casa
- Estado actual: en desarrollo.

## 2. Rol
- Actúa como programador que escribe código de C# de manera fácil de entender.

## 3. Alcance e hitos
- Crear una página web que permita a un operador hacer el registro y seguimiento de las rentas de cada socio activo de un video club Funcionalidades iniciales:
  1. crear una pagina donde el operador pueda visualizar y administrar socios. 
  2. crear un api que se conecte con la pagina web para hacer los mvimientos solicitados por el operador en la pagina web.
  3. crear un proceso que envie correo al cliente cuando se acerque el vencimiento de entrega de cada pelicula.
  
- Deben ser 2 proyectos separados: uno para la página web y otro para la aplicación de control de las rentas.
- Estructurar el proyecto con el patrón Domain-Driven Design (DDD).
- Tests para probar todo de manera unitaria.

## 4. Stack y estructura
- Lenguaje(s): C#
- Framework(s): .NET 10 (`net10.0`), ASP.NET Core Web API (con controladores).
- La base de datos es MySQL (base `sakila`). La conexión se configura en `ConnectionStrings:Sakila` (ver sección 5); nunca se escribe en el código ni en archivos commiteables.
- las conexiones a la base de datos son mediante dapper.
- Frontend: React 19 + Vite + TypeScript con este nombre `src/rentalmovie`.
- Gestor de paquetes: dotnet (backend), npm (frontend).
- Solución: `Rentalwebapp.slnx` (formato nuevo de .NET 10).


- Capas DDD (carpetas dentro de cada proyecto):
  - `Domain/` — entidades y puertos (interfaces).
  - `Application/` — casos de uso (services) y DTOs.
  - `Infrastructure/` — adaptadores ().
  - `Controllers/` — capa de presentación HTTP.
  - Comunicación: **API HTTP** entre Web y backend.

## 5. Cómo ejecutar

- **Backend:** `dotnet run --project src\RentalApp.Api --launch-profile http` → `http://localhost:5174` (Swagger en `/swagger`).
- **Frontend (dev):** `cd src/rentalmovie && npm run dev` → `http://localhost:5173`.
- **Tests:** `dotnet test` (118 tests) · **Frontend tests:** `npm test` en `src/rentalmovie` (205 tests con Vitest) · **Frontend build:** `npm run build`.
- La cadena de conexión va en `src/RentalApp.Api/appsettings.Development.json` (sección `ConnectionStrings:Sakila`) o en la variable de entorno `ConnectionStrings__Sakila`.
## 6. Convenciones
- Estilo: camelCase.
- Idiomas: código en inglés, comentarios en inglés.
- Ramas/commits: se deben hacer commits en https://github.com/Mex1jac/Rentalprj
- No subir: archivos con datos de conexiones o credenciales.

## 7. Reglas para ti (el agente)
- Siempre: añade/actualiza tests al cambiar la lógica.
- Nunca: no modifiques credenciales ni archivos `.env`.
- Verificación antes de terminar: corre `dotnet build` (y `dotnet test`) y muéstrame la salida.
- Si algo es ambiguo: pregúntame antes de asumir.
- cada vez que haya un cambio actualizar con la informacion mas reciente tanto el backlog como specs.md 
- usar skill  vercel-react-best-practices para la parte web siempre
- usar el mcp chrome-devtools para probar con almenos 3 resoluciones diferentes 

## 8. Tareas / backlog
Lee el archivo spec.md para cada una de las funcionlidades que no esten completadas y actualiza spec.md y este archivo cuando se completen
| # | Tarea | Prioridad | Estado | Notas |
|---|-------|-----------|--------|-------|
| 1 | crear una pagina de mantenimiento para la tabla staff dentro de la base sakila, debe permitir altas bajas y cambios en ecampo password se debe tener alguntipo de ocultamiento  | Alta | Completada | Ver spec.md: endpoints, SHA-1 en `Infrastructure/Security/Sha1PasswordHasher`, baja lógica por `active`. Tests: 33 backend + 26 frontend (Vitest/SWR). Responsive verificado con chrome-devtools en 1920/768/375 px. |
| 2 | agregar mismo patron de diseño ddd al front end  | Alta | Completada | Ver spec.md sección "DDD en el frontend": capas `domain/application/infrastructure/presentation` en espejo de `RentalApp.Api`, puertos inyectados en `presentation/App.tsx` (composition root), validaciones espejo del backend en `staffService`, 126 tests frontend. |
| 3 | pagina de socios: CRUD de socios + renta de 1 o más películas por días, con devolución | Alta | Completada | Ver spec.md sección "Delivered (Members & rentals page — Task-02)": migraciones `001_add_rental_due_date.sql` y `002_drop_sakila_custom_triggers.sql` (fix de huso horario), lote con transacción + `FOR UPDATE`, devolución con guard. Tests: 84 backend + 151 frontend. E2E con chrome-devtools en 1920/768/375 px (375 requiere `emulate` viewport); datos de prueba E2E eliminados (BD: 599 socios / 16,044 rentas). |
| 4 | paginación server-side en las tablas de socios y rentas (tamaño de página seleccionable) | Alta | Completada | Ver spec.md sección "Delivered (Server-side pagination — backlog #4)": envelope único `{items,page,pageSize,total,totalPages}` con `LIMIT/OFFSET`+`COUNT`, allowlist 10/25/50/100 (default 25, `Application/Pagination.cs` espejo en `paginationService.ts`), sin `pageSize` → lista completa (dropdown de socios), validaciones → 400, SWR con clave por página + `keepPreviousData`, componente `Pagination.tsx` con resumen `aria-live`. Tests: 84 backend + 151 frontend (19 archivos). E2E chrome-devtools 1920/768/375 px sin overflow ni errores de consola. |
| 5 | rediseño visual de la UI estilo editorial cálido (mockup aprobado: crema, serif, píldoras) | Media | Completada | Ver spec.md sección "Delivered (Visual redesign)": tokens crema/serif/mono en `index.css`, header con marca (SVG + "FRONT DESK") y segmented control, hero por vista con badge de conteo, tarjeta continua toolbar+tabla+paginación, badges con dot, acciones como enlaces, modales redondeados. Textos en inglés (decisión del usuario); pautas `web-design-guidelines` aplicadas (contraste ≥4.5:1, focus-visible, `…`, overscroll/touch/reduced-motion). Tests: 151 frontend **intactos**; E2E 1920/768/375 px sin overflow ni errores de consola. |
| 6 | CRUD de películas del catálogo (`film`): alta con copias por tienda, edición de todos los campos (rate, cost, length, rating, features, idiomas) y borrado con guard 409 | Alta | Completada | Ver spec.md sección "Delivered (Film catalog CRUD — backlog #6)": endpoints `/api/films` (GET/POST/PUT/DELETE) + `GET /api/lookups/languages`; `FilmService` valida title≤128, year 1901..+1, duration 1–90, rate/cost ≤2 decimales, rating enum, features ⊆ SET; alta transaccional inserta copias en `inventory` por cada tienda; borrado físico bloqueado con 409 si tiene copias (404 si no existe). 4ta pestaña "Films" (búsqueda por título + paginación envelope + modal con checkboxes y "Copies per store" solo en alta + borrado en dos pasos en la fila). Tests: 118 backend (34 nuevos FilmServiceTests) + 203 frontend (52 nuevos). E2E chrome-devtools 1920/768/375 px. |
| 7 | cobro al rentar: un `payment` por renta al momento de rentar (días capturados × `rental_rate` de la BD) + total en USD al pie del modal (quitar el conteo de días del picker) | Alta | Completada | Ver spec.md (regla "Cobro al rentar (backlog #7)" en Task-02): `RentalRepository` inserta un `payment` por rental **en la misma transacción** (`amount = batch.RentalDays × copy.RentalRate` del SELECT `FOR UPDATE`, `payment_date = rental_date`); `RentalBatch.RentalDays` lo pasa `RentalService`. Migración `db/migrations/003_payment_amount_decimal72.sql` (aplicada): `payment.amount` a `DECIMAL(7,2)` (evita overflow con 90×99.99) + `DROP TRIGGER payment_date` (trigger custom UTC que desfasaba el cobro 6 h). Frontend: total preview `days × Σ(rates)` con `formatUsd` ("$X.XX USD") en bloque `.rental-total` al pie del modal; picker meta solo `{disp} avail. · $rate`. Tests: 118 backend (assert `RentalDays`) + 205 frontend (2 nuevos: total inicial/paso a paso y meta sin días). E2E chrome-devtools 1920/768/375 px: renta de 2 películas verificada en BD (monto = días × tarifa, 1 pago por renta, instante idéntico), limpieza restauró 16,047 rentas / 16,044 pagos dejando las 3 rentas del usuario (16053–16055) intactas. |


## 9. Notas y decisiones
- El frontend es una **SPA React** servida aparte por Vite en desarrollo; en producción se puede publicar en `wwwroot`.
- **Configuración por entorno:** CORS se controla con la sección `Cors:AllowedOrigins` en `appsettings.json` (vacío por defecto). El origen del frontend en dev (`http://localhost:5173`) se define en `appsettings.Development.json`.
- **Credenciales:** la cadena de conexión solo vive en `appsettings.Development.json` (ignorado por git) o en la variable de entorno `ConnectionStrings__Sakila`. Nunca en el código ni en `appsettings.json`.

