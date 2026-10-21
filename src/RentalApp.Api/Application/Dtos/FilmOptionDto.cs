namespace RentalApp.Api.Application.Dtos;

/// <summary>Film stocked at a store with its available copies (rental form).</summary>
public class FilmOptionDto
{
    public ushort FilmId { get; set; }
    public string Title { get; set; } = string.Empty;
    public ushort RentalDurationDays { get; set; }
    public decimal RentalRate { get; set; }
    public int AvailableCopies { get; set; }
}
