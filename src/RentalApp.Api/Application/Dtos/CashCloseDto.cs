namespace RentalApp.Api.Application.Dtos;

/// <summary>
/// Cash close of one period (corte de caja): totals plus the per-film
/// breakdown of the rentals started between <see cref="From"/> and
/// <see cref="To"/> (inclusive).
/// </summary>
public class CashCloseDto
{
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }

    /// <summary>Rentals started inside the period.</summary>
    public int Rentals { get; set; }

    /// <summary>Subset of <see cref="Rentals"/> still on rent (no return yet).</summary>
    public int OpenRentals { get; set; }

    /// <summary>Subset of <see cref="Rentals"/> already returned.</summary>
    public int ReturnedRentals { get; set; }

    /// <summary>Distinct films rented inside the period (= Films.Count).</summary>
    public int DistinctFilms { get; set; }

    /// <summary>Sum of the payments of those rentals, in USD.</summary>
    public decimal Amount { get; set; }

    public IReadOnlyList<CashCloseFilmDto> Films { get; set; } = [];
}

/// <summary>Per-film row of the cash-close summary.</summary>
public class CashCloseFilmDto
{
    public ushort FilmId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Rentals { get; set; }
    public int OpenRentals { get; set; }
    public decimal Amount { get; set; }
}
