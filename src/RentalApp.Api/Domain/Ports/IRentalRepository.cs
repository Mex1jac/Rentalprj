using RentalApp.Api.Domain.Entities;

namespace RentalApp.Api.Domain.Ports;

/// <summary>
/// Persistence port for the rental table. A batch create assigns one physical
/// copy (inventory) per requested film inside a single transaction, so the
/// same copy can never be handed to two operators.
/// </summary>
public interface IRentalRepository
{
    Task<IReadOnlyList<Rental>> GetAllAsync(string? search, RentalListStatus status, CancellationToken cancellationToken = default);

    /// <summary>Total rows matching the filters, for the paginated list endpoint.</summary>
    Task<int> CountAsync(string? search, RentalListStatus status, CancellationToken cancellationToken = default);

    /// <summary>One slice of the filtered list (server-side pagination).</summary>
    Task<IReadOnlyList<Rental>> GetPageAsync(
        string? search,
        RentalListStatus status,
        int limit,
        int offset,
        CancellationToken cancellationToken = default);

    Task<Rental?> GetByIdAsync(int rentalId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Rental>> GetByIdsAsync(IReadOnlyList<int> rentalIds, CancellationToken cancellationToken = default);

    Task<RentalBatchResult> CreateAsync(RentalBatch batch, CancellationToken cancellationToken = default);

    Task<bool> MarkReturnedAsync(int rentalId, DateTime returnDate, CancellationToken cancellationToken = default);

    Task<int> CountOpenRentalsAsync(ushort customerId, CancellationToken cancellationToken = default);
}
