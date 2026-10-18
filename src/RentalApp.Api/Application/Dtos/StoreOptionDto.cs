namespace RentalApp.Api.Application.Dtos;

/// <summary>Lookup item for the store select of the staff form.</summary>
public class StoreOptionDto
{
    public byte StoreId { get; set; }
    public string Display { get; set; } = string.Empty;
}
