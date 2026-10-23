using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Domain.Exceptions;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Api.Application.Services;

/// <summary>
/// Use cases behind the cash-close page (corte de caja): summary of the films
/// rented inside a selectable period — one day or one month — and the money
/// those rentals generated. Every rule and message is mirrored by the
/// frontend cashCloseService so invalid input fails fast with exactly the
/// wording the API would return.
/// </summary>
public class CashCloseService
{
    /// <summary>
    /// Longest period a report can span. A whole month is 31 days; a year
    /// (366, leap included) keeps a safety cap against accidental ranges.
    /// </summary>
    public const int MaxPeriodDays = 366;

    private readonly ICashCloseRepository _cashCloseRepository;

    public CashCloseService(ICashCloseRepository cashCloseRepository)
    {
        _cashCloseRepository = cashCloseRepository;
    }

    /// <summary>
    /// Report for the inclusive day range [from, to]: the adapter returns the
    /// per-film rows and the service aggregates the totals.
    /// </summary>
    public async Task<CashCloseDto> GetReportAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default)
    {
        if (from > to)
        {
            throw new ValidationException("From must be on or before To.");
        }

        if (to.DayNumber - from.DayNumber > MaxPeriodDays)
        {
            throw new ValidationException(
                $"The selected period cannot span more than {MaxPeriodDays} days.");
        }

        var films = await _cashCloseRepository.GetReportAsync(from, to, cancellationToken);

        var report = new CashCloseDto
        {
            From = from,
            To = to,
            Films = films.Select(f => new CashCloseFilmDto
            {
                FilmId = f.FilmId,
                Title = f.Title,
                Rentals = f.Rentals,
                OpenRentals = f.OpenRentals,
                Amount = f.Amount,
            }).ToList(),
        };

        report.Rentals = report.Films.Sum(f => f.Rentals);
        report.OpenRentals = report.Films.Sum(f => f.OpenRentals);
        report.ReturnedRentals = report.Rentals - report.OpenRentals;
        report.DistinctFilms = report.Films.Count;
        report.Amount = report.Films.Sum(f => f.Amount);

        return report;
    }
}
