# RentalWebApp

Sistema para la renta de películas de un video club: una página web donde el operador administra a los socios y da seguimiento a sus rentas.

> Estado actual: en desarrollo — entregados: mantenimiento de la tabla `staff` (altas, bajas y cambios), la página de socios con renta de 1+ películas por días y devoluciones, y la paginación server-side en las tablas de socios y rentas; ver `spec.md` para el detalle y el backlog.

## Requisitos previos

- [.NET SDK 10](https://dotnet.microsoft.com/download) (proyectos `net10.0`)
- [Node.js](https://nodejs.org/) 20 o superior (con npm)
- MySQL con la base de datos `sakila` accesible

## Estructura

```
rentalapp/
├── Rentalwebapp.slnx        # Solución (.NET 10)
├── src/
│   ├── RentalApp.Api/       # Backend: ASP.NET Core Web API (DDD + Dapper)
│   └── rentalmovie/         # Frontend: React 19 + Vite + TypeScript (DDD)
└── tests/
    └── RentalApp.Tests/     # Tests unitarios backend (xUnit)
```

## Configuración de la base de datos

La cadena de conexión se llama `Sakila` y **nunca** se escribe en el código ni en archivos commiteables. Se define en uno de estos dos lugares:

1. **Por entorno (recomendado en desarrollo):** variable de entorno

   ```powershell
   $env:ConnectionStrings__Sakila = "Server=localhost;Port=3306;Database=sakila;User ID=root;Password=****;AllowUserVariables=true;"
   ```

2. **Archivo local:** `src/RentalApp.Api/appsettings.Development.json` (ignorado por git), sección:

   ```json
   {
     "ConnectionStrings": {
       "Sakila": "Server=localhost;Port=3306;Database=sakila;User ID=root;Password=****;AllowUserVariables=true;"
     }
   }
   ```

## Ejecutar el proyecto

### 1. Backend (API)

```powershell
dotnet run --project src\RentalApp.Api --launch-profile http
```

- URL: <http://localhost:5174>
- Swagger UI: <http://localhost:5174/swagger>

### 2. Frontend (web)

En una segunda terminal:

```powershell
cd src\rentalmovie
npm install      # solo la primera vez
npm run dev
```

- URL: <http://localhost:5173> (en desarrollo se comunica con la API en `:5174` vía proxy/CORS)

## Tests

```powershell
# Backend (xUnit, 84 tests)
dotnet test

# Frontend (Vitest + React Testing Library, 151 tests)
cd src\rentalmovie
npm test
```

## Build de producción

```powershell
# Backend
dotnet build

# Frontend (tsc + vite build → src/rentalmovie/dist)
cd src\rentalmovie
npm run build
```

## Convenciones

- Estilo `camelCase`; código y comentarios en inglés.
- Backend estructurado con DDD: `Domain/` · `Application/` · `Infrastructure/` · `Controllers/`.
- Frontend con las mismas capas en espejo: `domain/` · `application/` · `infrastructure/` · `presentation/`.
- Cambios en la lógica: siempre actualizar o añadir tests.
- No subir credenciales ni archivos `.env`; el detalle completo de reglas está en `AGENTS.md`.
