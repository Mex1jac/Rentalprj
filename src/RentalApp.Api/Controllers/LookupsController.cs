using Microsoft.AspNetCore.Mvc;
using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Application.Services;

namespace RentalApp.Api.Controllers;

/// <summary>Feeds the selects of the staff maintenance form (addresses and stores).</summary>
[ApiController]
[Route("api/lookups")]
public class LookupsController : ControllerBase
{
    private readonly LookupService _lookupService;

    public LookupsController(LookupService lookupService)
    {
        _lookupService = lookupService;
    }

    [HttpGet("addresses")]
    [ProducesResponseType<IReadOnlyList<AddressOptionDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AddressOptionDto>>> GetAddresses(CancellationToken cancellationToken)
    {
        var addresses = await _lookupService.GetAddressesAsync(cancellationToken);
        return Ok(addresses);
    }

    [HttpGet("stores")]
    [ProducesResponseType<IReadOnlyList<StoreOptionDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<StoreOptionDto>>> GetStores(CancellationToken cancellationToken)
    {
        var stores = await _lookupService.GetStoresAsync(cancellationToken);
        return Ok(stores);
    }

    /// <summary>Films stocked at a store with their available copies (rental form).</summary>
    [HttpGet("films")]
    [ProducesResponseType<IReadOnlyList<FilmOptionDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<FilmOptionDto>>> GetFilms(
        [FromQuery] byte storeId,
        CancellationToken cancellationToken)
    {
        var films = await _lookupService.GetFilmsAsync(storeId, cancellationToken);
        return Ok(films);
    }

    /// <summary>Languages of the film catalog (film form selects).</summary>
    [HttpGet("languages")]
    [ProducesResponseType<IReadOnlyList<LanguageOptionDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<LanguageOptionDto>>> GetLanguages(CancellationToken cancellationToken)
    {
        var languages = await _lookupService.GetLanguagesAsync(cancellationToken);
        return Ok(languages);
    }
}
