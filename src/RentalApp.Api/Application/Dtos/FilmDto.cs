namespace RentalApp.Api.Application.Dtos;

/// <summary>Film row returned by the catalog endpoints.</summary>
public class FilmDto
{
    public ushort FilmId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? ReleaseYear { get; set; }
    public byte LanguageId { get; set; }
    public string Language { get; set; } = string.Empty;
    public byte? OriginalLanguageId { get; set; }
    public string? OriginalLanguage { get; set; }
    public ushort RentalDurationDays { get; set; }
    public decimal RentalRate { get; set; }
    public ushort? LengthMinutes { get; set; }
    public decimal ReplacementCost { get; set; }
    public string Rating { get; set; } = "G";
    public IReadOnlyList<string> SpecialFeatures { get; set; } = [];
    public int TotalCopies { get; set; }

    /// <summary>False once the film has been logically deactivated (backlog #8).</summary>
    public bool Active { get; set; } = true;
}
