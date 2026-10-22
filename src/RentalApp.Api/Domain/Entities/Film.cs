namespace RentalApp.Api.Domain.Entities;

/// <summary>Film in the club's catalog (sakila.film).</summary>
public class Film
{
    public ushort FilmId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? ReleaseYear { get; set; }
    public byte LanguageId { get; set; }
    public byte? OriginalLanguageId { get; set; }
    public ushort RentalDurationDays { get; set; }
    public decimal RentalRate { get; set; }
    public ushort? LengthMinutes { get; set; }
    public decimal ReplacementCost { get; set; }
    public string? Rating { get; set; }

    /// <summary>
    /// sakila stores the SET column as a comma-joined string (e.g.
    /// "Trailers,Deleted Scenes"); null/empty means "no features".
    /// </summary>
    public string? SpecialFeaturesCsv { get; set; }

    // Display-only fields populated by repository joins (never persisted by the domain).
    public int TotalCopies { get; set; }
    public string LanguageDisplay { get; set; } = string.Empty;
    public string? OriginalLanguageDisplay { get; set; }
}
