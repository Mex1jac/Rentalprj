using Dapper;
using RentalApp.Api.Domain.Entities;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Api.Infrastructure.Persistence;

/// <summary>
/// Dapper adapter for the cash-close report: rentals started in the period,
/// grouped by film and joined with the payment recorded at rental time
/// (charge-on-rental, backlog #7). Returns the per-film rows only —
/// CashCloseService aggregates the totals.
/// </summary>
public class CashCloseRepository : ICashCloseRepository
{
    /// <summary>Shared by the list and the count: rentals of the period per film.</summary>
    private const string ReportQuery = """
        SELECT f.film_id AS FilmId,
               f.title AS Title,
               COUNT(DISTINCT r.rental_id) AS Rentals,
               COUNT(DISTINCT CASE WHEN r.return_date IS NULL THEN r.rental_id END) AS OpenRentals,
               COALESCE(SUM(p.amount), 0) AS Amount
        FROM rental r
        JOIN inventory i ON i.inventory_id = r.inventory_id
        JOIN film f ON f.film_id = i.film_id
        LEFT JOIN payment p ON p.rental_id = r.rental_id
        WHERE r.rental_date >= @From
          AND r.rental_date < @ToExclusive
        GROUP BY f.film_id, f.title
        ORDER BY Amount DESC, f.title
        """;

    private readonly MySqlConnectionFactory _connectionFactory;

    public CashCloseRepository(MySqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<CashCloseFilm>> GetReportAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default)
    {
        // Half-open range [from 00:00, to+1day 00:00): the whole 'to' day is
        // included without touching rental_date times.
        var parameters = new
        {
            From = from.ToDateTime(TimeOnly.MinValue),
            ToExclusive = to.AddDays(1).ToDateTime(TimeOnly.MinValue),
        };

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var films = await connection.QueryAsync<CashCloseFilm>(
            new CommandDefinition(ReportQuery, parameters, cancellationToken: cancellationToken));

        return films.ToList();
    }
}
