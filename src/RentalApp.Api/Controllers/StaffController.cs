using Microsoft.AspNetCore.Mvc;
using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Application.Services;

namespace RentalApp.Api.Controllers;

/// <summary>
/// CRUD endpoints behind the staff maintenance page: list, get, create, edit,
/// change password and logical leave (deactivate/reactivate).
/// </summary>
[ApiController]
[Route("api/staff")]
public class StaffController : ControllerBase
{
    private readonly StaffService _staffService;

    public StaffController(StaffService staffService)
    {
        _staffService = staffService;
    }

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<StaffDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<StaffDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] bool? active,
        CancellationToken cancellationToken)
    {
        var staff = await _staffService.GetListAsync(search, active, cancellationToken);
        return Ok(staff);
    }

    [HttpGet("{staffId:int}")]
    [ProducesResponseType<StaffDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StaffDto>> GetById(ushort staffId, CancellationToken cancellationToken)
    {
        var staff = await _staffService.GetByIdAsync(staffId, cancellationToken);
        return Ok(staff);
    }

    [HttpPost]
    [ProducesResponseType<StaffDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<StaffDto>> Create(StaffCreateDto dto, CancellationToken cancellationToken)
    {
        var created = await _staffService.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { staffId = created.StaffId }, created);
    }

    [HttpPut("{staffId:int}")]
    [ProducesResponseType<StaffDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StaffDto>> Update(ushort staffId, StaffUpdateDto dto, CancellationToken cancellationToken)
    {
        var updated = await _staffService.UpdateAsync(staffId, dto, cancellationToken);
        return Ok(updated);
    }

    [HttpPut("{staffId:int}/password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ChangePassword(
        ushort staffId,
        StaffPasswordUpdateDto dto,
        CancellationToken cancellationToken)
    {
        await _staffService.ChangePasswordAsync(staffId, dto, cancellationToken);
        return NoContent();
    }

    [HttpPut("{staffId:int}/active")]
    [ProducesResponseType<StaffStatusDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StaffStatusDto>> SetActive(
        ushort staffId,
        StaffSetActiveDto dto,
        CancellationToken cancellationToken)
    {
        var status = await _staffService.SetActiveAsync(staffId, dto.Active, cancellationToken);
        return Ok(status);
    }
}
