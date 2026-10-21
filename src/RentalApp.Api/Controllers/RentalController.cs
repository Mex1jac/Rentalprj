using Microsoft.AspNetCore.Mvc;
using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Application.Services;
using RentalApp.Api.Domain.Entities;

namespace RentalApp.Api.Controllers;

/// <summary>
/// Endpoints behind the rentals page: tracking list, renting 1+ films for a
/// number of days (Task-02) and registering returns.
/// </summary>
[ApiController]
[Route("api/rentals")]
public class RentalController : ControllerBase
{
    private readonly RentalService _rentalService;

    public RentalController(RentalService rentalService)
    {
        _rentalService = rentalService;
    }

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<RentalDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<RentalDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] RentalListStatus status = RentalListStatus.Open,
        CancellationToken cancellationToken = default)
    {
        var rentals = await _rentalService.GetListAsync(search, status, cancellationToken);
        return Ok(rentals);
    }

    [HttpGet("{rentalId:int}")]
    [ProducesResponseType<RentalDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RentalDto>> GetById(int rentalId, CancellationToken cancellationToken)
    {
        var rental = await _rentalService.GetByIdAsync(rentalId, cancellationToken);
        return Ok(rental);
    }

    [HttpPost]
    [ProducesResponseType<IReadOnlyList<RentalDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<IReadOnlyList<RentalDto>>> Create(
        RentalCreateDto dto,
        CancellationToken cancellationToken)
    {
        var created = await _rentalService.CreateAsync(dto, cancellationToken);
        // The batch shares one customer/date, so the location points to its first row.
        return CreatedAtAction(nameof(GetById), new { rentalId = created[0].RentalId }, created);
    }

    [HttpPut("{rentalId:int}/return")]
    [ProducesResponseType<RentalDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RentalDto>> Return(int rentalId, CancellationToken cancellationToken)
    {
        var returned = await _rentalService.ReturnAsync(rentalId, cancellationToken);
        return Ok(returned);
    }
}
