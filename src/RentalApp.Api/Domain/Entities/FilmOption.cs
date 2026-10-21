namespace RentalApp.Api.Domain.Entities;

/// <summary>
/// Lookup entry used by the rental form: a film stocked at a store, with the
/// number of copies that are not currently on rental.
/// </summary>
public class FilmOption
{
    public ushort FilmId { get; set; }
    public string Title { get; set; } = string.Empty;
    public ushort RentalDurationDays { get; set; }
    public decimal RentalRate { get; set; }
    public int AvailableCopies { get; set; }
}
