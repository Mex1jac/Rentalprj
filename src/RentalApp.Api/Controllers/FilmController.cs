using Microsoft.AspNetCore.Mvc;
using RentalApp.Api.Application;
using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Application.Services;
using RentalApp.Api.Domain.Entities;

namespace RentalApp.Api.Controllers;

/// <summary>CRUD endpoints behind the film catalog page.</summary>
[ApiController]
[Route("api/films")]
public class FilmController : ControllerBase
{
    private readonly FilmService _filmService;

    public FilmController(FilmService filmService)
    {
        _filmService = filmService;
    }

    [HttpGet]
    [ProducesResponseType<PagedResultDto<FilmDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResultDto<FilmDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] FilmListStatus status = FilmListStatus.All,
        [FromQuery] int page = Pagination.DefaultPage,
        [FromQuery] int? pageSize = null,
        CancellationToken cancellationToken = default)
    {
        var films = await _filmService.GetListAsync(search, status, page, pageSize, cancellationToken);
        return Ok(films);
    }

    [HttpGet("{filmId:int}")]
    [ProducesResponseType<FilmDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FilmDto>> GetById(ushort filmId, CancellationToken cancellationToken)
    {
        var film = await _filmService.GetByIdAsync(filmId, cancellationToken);
        return Ok(film);
    }

    [HttpPost]
    [ProducesResponseType<FilmDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<FilmDto>> Create(FilmCreateDto dto, CancellationToken cancellationToken)
    {
        var created = await _filmService.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { filmId = created.FilmId }, created);
    }

    [HttpPut("{filmId:int}")]
    [ProducesResponseType<FilmDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FilmDto>> Update(ushort filmId, FilmUpdateDto dto, CancellationToken cancellationToken)
    {
        var updated = await _filmService.UpdateAsync(filmId, dto, cancellationToken);
        return Ok(updated);
    }

    [HttpPut("{filmId:int}/active")]
    [ProducesResponseType<FilmStatusDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FilmStatusDto>> SetActive(
        ushort filmId,
        FilmSetActiveDto dto,
        CancellationToken cancellationToken)
    {
        var status = await _filmService.SetActiveAsync(filmId, dto.Active, cancellationToken);
        return Ok(status);
    }

    [HttpDelete("{filmId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(ushort filmId, CancellationToken cancellationToken)
    {
        await _filmService.DeleteAsync(filmId, cancellationToken);
        return NoContent();
    }
}
