namespace RentalApp.Api.Domain.Entities;

/// <summary>
/// One film row of the cash-close summary: how many copies of this film were
/// rented inside the period, how many of those rentals are still open and the
/// money the period generated for them (charge-on-rental, backlog #7).
/// </summary>
public class CashCloseFilm
{
    public ushort FilmId { get; set; }
    public string Title { get; set; } = string.Empty;

    /// <summary>Rentals of this film started inside the period.</summary>
    public int Rentals { get; set; }

    /// <summary>Subset of <see cref="Rentals"/> with no return yet.</summary>
    public int OpenRentals { get; set; }

    /// <summary>Sum of the payment rows recorded for those rentals (USD).</summary>
    public decimal Amount { get; set; }
}
