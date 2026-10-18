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
}
