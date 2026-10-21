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

    /// <summary>Films stocked at a store with their available copies (rental form).</summary>
    public async Task<IReadOnlyList<FilmOptionDto>> GetFilmsAsync(byte storeId, CancellationToken cancellationToken = default)
    {
        var films = await _lookupRepository.GetFilmsAsync(storeId, cancellationToken);
        return films
            .Select(f => new FilmOptionDto
            {
                FilmId = f.FilmId,
                Title = f.Title,
                RentalDurationDays = f.RentalDurationDays,
                RentalRate = f.RentalRate,
                AvailableCopies = f.AvailableCopies,
            })
            .ToList();
    }
}
