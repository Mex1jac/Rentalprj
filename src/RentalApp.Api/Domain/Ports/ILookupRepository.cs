using RentalApp.Api.Domain.Entities;

namespace RentalApp.Api.Domain.Ports;

/// <summary>Read-only lookup port used to populate UI selects and to validate foreign keys.</summary>
public interface ILookupRepository
{
    Task<IReadOnlyList<AddressOption>> GetAddressesAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StoreOption>> GetStoresAsync(CancellationToken cancellationToken = default);

    Task<bool> AddressExistsAsync(ushort addressId, CancellationToken cancellationToken = default);

    Task<bool> StoreExistsAsync(byte storeId, CancellationToken cancellationToken = default);
}
