using RentalApp.Api.Domain.Entities;

namespace RentalApp.Api.Domain.Ports;

/// <summary>Persistence port for the film (catalog) table.</summary>
public interface IFilmRepository
{
    Task<IReadOnlyList<Film>> GetAllAsync(string? search, CancellationToken cancellationToken = default);

    /// <summary>Total rows matching the filters, for the paginated list endpoint.</summary>
    Task<int> CountAsync(string? search, CancellationToken cancellationToken = default);

    /// <summary>One slice of the filtered list (server-side pagination).</summary>
    Task<IReadOnlyList<Film>> GetPageAsync(
        string? search,
        int limit,
        int offset,
        CancellationToken cancellationToken = default);

    Task<Film?> GetByIdAsync(ushort filmId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Inserts the film and one inventory copy per store in a single
    /// transaction, then returns the new film id (a film without copies is not
    /// visible to the rental form).
    /// </summary>
    Task<ushort> CreateAsync(
        Film film,
        IReadOnlyList<byte> storeIds,
        int copiesPerStore,
        CancellationToken cancellationToken = default);

    Task<bool> UpdateAsync(Film film, CancellationToken cancellationToken = default);

    /// <summary>Inventory rows referencing the film (0 = safe to delete).</summary>
    Task<int> CountInventoryAsync(ushort filmId, CancellationToken cancellationToken = default);

    /// <summary>Physical delete; false when the film does not exist.</summary>
    Task<bool> DeleteAsync(ushort filmId, CancellationToken cancellationToken = default);
}
