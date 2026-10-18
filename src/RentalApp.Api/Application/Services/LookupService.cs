using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Api.Application.Services;

/// <summary>Use case that feeds the selects of the staff maintenance form.</summary>
public class LookupService
{
    private readonly ILookupRepository _lookupRepository;

    public LookupService(ILookupRepository lookupRepository)
    {
        _lookupRepository = lookupRepository;
    }

    public async Task<IReadOnlyList<AddressOptionDto>> GetAddressesAsync(CancellationToken cancellationToken = default)
    {
        var addresses = await _lookupRepository.GetAddressesAsync(cancellationToken);
        return addresses
            .Select(a => new AddressOptionDto { AddressId = a.AddressId, Display = a.Display })
            .ToList();
    }

    public async Task<IReadOnlyList<StoreOptionDto>> GetStoresAsync(CancellationToken cancellationToken = default)
    {
        var stores = await _lookupRepository.GetStoresAsync(cancellationToken);
        return stores
            .Select(s => new StoreOptionDto { StoreId = s.StoreId, Display = s.Display })
            .ToList();
    }
}
