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
- **Tests:** `dotnet test` (33 tests) · **Frontend build:** `npm run build` en `src/rentalmovie`.
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

## 8. Tareas / backlog
Lee el archivo spec.md para cada una de las funcionlidades que no esten completadas y actualiza spec.md y este archivo cuando se completen
| # | Tarea | Prioridad | Estado | Notas |
|---|-------|-----------|--------|-------|
| 1 | crear una pagina de mantenimiento para la tabla staff dentro de la base sakila, debe permitir altas bajas y cambios en ecampo password se debe tener alguntipo de ocultamiento  | Alta | Completada | Ver spec.md: endpoints, SHA-1 en `Infrastructure/Security/Sha1PasswordHasher`, baja lógica por `active`, 33 tests. |


## 9. Notas y decisiones
- El frontend es una **SPA React** servida aparte por Vite en desarrollo; en producción se puede publicar en `wwwroot`.
- **Configuración por entorno:** CORS se controla con la sección `Cors:AllowedOrigins` en `appsettings.json` (vacío por defecto). El origen del frontend en dev (`http://localhost:5173`) se define en `appsettings.Development.json`.
- **Credenciales:** la cadena de conexión solo vive en `appsettings.Development.json` (ignorado por git) o en la variable de entorno `ConnectionStrings__Sakila`. Nunca en el código ni en `appsettings.json`.

