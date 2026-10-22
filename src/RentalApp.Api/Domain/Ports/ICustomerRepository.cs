using RentalApp.Api.Domain.Entities;

namespace RentalApp.Api.Domain.Ports;

/// <summary>Persistence port for the customer (member) table.</summary>
public interface ICustomerRepository
{
    Task<IReadOnlyList<Customer>> GetAllAsync(string? search, bool? active, CancellationToken cancellationToken = default);

    /// <summary>Total rows matching the filters, for the paginated list endpoint.</summary>
    Task<int> CountAsync(string? search, bool? active, CancellationToken cancellationToken = default);

    /// <summary>One slice of the filtered list (server-side pagination).</summary>
    Task<IReadOnlyList<Customer>> GetPageAsync(
        string? search,
        bool? active,
        int limit,
        int offset,
        CancellationToken cancellationToken = default);

    Task<Customer?> GetByIdAsync(ushort customerId, CancellationToken cancellationToken = default);

    Task<ushort> CreateAsync(Customer customer, CancellationToken cancellationToken = default);

    Task<bool> UpdateAsync(Customer customer, CancellationToken cancellationToken = default);

    Task<bool> SetActiveAsync(ushort customerId, bool active, CancellationToken cancellationToken = default);
}
