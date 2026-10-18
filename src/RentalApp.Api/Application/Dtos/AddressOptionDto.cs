namespace RentalApp.Api.Application.Dtos;

/// <summary>Lookup item for the address select of the staff form.</summary>
public class AddressOptionDto
{
    public ushort AddressId { get; set; }
    public string Display { get; set; } = string.Empty;
}
