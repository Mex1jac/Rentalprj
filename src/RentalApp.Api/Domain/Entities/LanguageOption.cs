namespace RentalApp.Api.Domain.Entities;

/// <summary>Language of the film catalog (sakila.language).</summary>
public class LanguageOption
{
    public byte LanguageId { get; set; }
    public string Name { get; set; } = string.Empty;
}
