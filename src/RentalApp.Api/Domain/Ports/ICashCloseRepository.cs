using RentalApp.Api.Domain.Entities;

namespace RentalApp.Api.Domain.Ports;

/// <summary>
/// Persistence port for the cash-close report (corte de caja): the films
/// rented inside a period with their money. Totals are aggregated by the
/// application service, not by the adapter.
/// </summary>
public interface ICashCloseRepository
{
    /// <summary>
    /// Per-film summary of the rentals whose <c>rental_date</c> falls inside
    /// the inclusive day range [from, to], ordered by generated money.
    /// </summary>
    Task<IReadOnlyList<CashCloseFilm>> GetReportAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default);
}
