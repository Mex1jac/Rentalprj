using Microsoft.AspNetCore.Mvc;
using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Application.Services;

namespace RentalApp.Api.Controllers;

/// <summary>
/// Endpoints behind the cash-close page (corte de caja): summary of the films
/// rented inside a selectable period (one day or one month) and the money
/// those rentals generated.
/// </summary>
[ApiController]
[Route("api/cashclose")]
public class CashCloseController : ControllerBase
{
    private readonly CashCloseService _cashCloseService;

    public CashCloseController(CashCloseService cashCloseService)
    {
        _cashCloseService = cashCloseService;
    }

    /// <summary>
    /// Report for the inclusive day range [from, to] — the frontend resolves
    /// the picked calendar value (a day or a month) into that range.
    /// </summary>
    [HttpGet]
    [ProducesResponseType<CashCloseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CashCloseDto>> GetReport(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        CancellationToken cancellationToken)
    {
        var report = await _cashCloseService.GetReportAsync(from, to, cancellationToken);
        return Ok(report);
    }
}
