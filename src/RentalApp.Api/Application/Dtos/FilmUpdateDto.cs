namespace RentalApp.Api.Application.Dtos;

/// <summary>
/// Payload with every editable film field (the full edit form); the create
/// payload only adds how many copies to stock per store on day one.
/// </summary>
public class FilmUpdateDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? ReleaseYear { get; set; }
    public byte LanguageId { get; set; }
    public byte? OriginalLanguageId { get; set; }
    public ushort RentalDurationDays { get; set; }
    public decimal RentalRate { get; set; }
    public ushort? LengthMinutes { get; set; }
    public decimal ReplacementCost { get; set; }
    public string Rating { get; set; } = "G";
    public IReadOnlyList<string>? SpecialFeatures { get; set; }
}
