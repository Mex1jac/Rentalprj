namespace RentalApp.Api.Application.Dtos;

/// <summary>Language option used by the film form select.</summary>
public class LanguageOptionDto
{
    public byte LanguageId { get; set; }
    public string Name { get; set; } = string.Empty;
}
