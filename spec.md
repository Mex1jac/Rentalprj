
## Requirements

| # | Tarea | Prioridad | Estado | Notas |
|---|-------|-----------|--------|-------|
| FR-1-baclog01 | el password en el guardado y la lectura debe tener alguntipo de ocultamiento para impedir su lectura a simplevista | Alta | Completada | Guardado con SHA-1 (hex 40, formato `sakila.staff.password`); el DTO/entidad de lectura no incluye password y el repositorio nunca hace SELECT de esa columna. UI con `input type=password` + mostrar/ocultar. Verificado contra BD: el valor almacenado es el hash, fila de prueba eliminada. |
| FR-2-baclog01 | los passwords no exprian, solo pueden modificarse por el mismo usuario | Alta | Completada (parcial) | No hay expiración (nunca se evalúa). El cambio de password es un endpoint dedicado (`PUT /api/staff/{id}/password`) sobre un usuario existente. La restricción "solo el mismo usuario" queda pendiente de la futura autenticación (ver Open Questions). |

### Delivered (Staff maintenance page)

| # | Tarea | Prioridad | Estado | Notas |
|---|-------|-----------|--------|-------|
| Task-01 | Página de mantenimiento de la tabla `staff` (altas, bajas y cambios, con ocultamiento de password) | Alta | Completada | Backend DDD + Dapper (`RentalApp.Api`) y frontend React (`src/rentalmovie`). Baja lógica vía campo `active`. Tests: **33 backend (xUnit) + 26 frontend (Vitest)**. |

### Frontend (`src/rentalmovie`) — cumplimiento vercel-react-best-practices

| Regla skill | Implementación |
|---|---|
| `client-swr-dedup` | Lecturas con **SWR** (`useSWR`): clave por combinación de filtros (`/api/staff?search=&active=`), dedup de peticiones y sin condiciones de carrera; lookups (addresses/stores) cacheados. Revalidación pos-mutación con `mutate` **con scope** (`useSWRConfig`) filtrando claves `startsWith('/api/staff')`. |
| `rerender-derived-state-no-effect` | `StaffForm` ya no resetea estado en `useEffect`: el estado se deriva de la prop en el inicializador y el padre monta con `key={`edit-${staffId}`}` / `key="create"`. |
| `rerender-use-deferred-value` | La búsqueda usa `useDeferredValue(search)`; mientras se resuelve la clave nueva, la tabla se atenúa (`.results-stale`, `aria-busy`). |
| Accesibilidad | Labels asociados con `htmlFor`/`id`, `name`/`autoComplete` en todos los campos, `role=dialog`+`aria-modal`, `aria-label` en mostrar/ocultar password. Consola Chrome sin errores ni issues. |

- **Tests frontend:** Vitest 5 + React Testing Library + jsdom → `npm test` en `src/rentalmovie` (26 tests: `api` 4, `StaffForm` 9, `PasswordForm` 5, `App` 8 con fetch mockeado y caché SWR aislada por test).
- **Responsive (verificado con MCP chrome-devtools en 3 resoluciones):** Desktop 1920×1080 ✅, Tablet 768×1024 ✅, Móvil 375×667 ✅. Sin scroll horizontal en la página: la tabla vive en `.table-scroll` con `overflow-x:auto` y `min-width:720px`; los `<select>` del modal se limitan con `width:100%` (603 direcciones no desbordan el modal en móvil).

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

## Out of Scope 
- Autenticación/login (la regla "solo el mismo usuario puede modificar el password" se implementará cuando exista).
- Envío de correos de vencimiento (hitos 3 del alcance).
- Mantenimiento de socios (hitos 1 del alcance).

## Open Questions
- los administradores: ¿quién podrá dar de alta/baja staff cuando exista login (rol admin)? — definir junto con la autenticación.
- ¿La columna `staff.picture` se usará para fotos de perfil o se ignora?
