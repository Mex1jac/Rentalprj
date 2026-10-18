namespace RentalApp.Api.Domain.Entities;

/// <summary>Lookup entry used by the UI to pick a staff address.</summary>
public class AddressOption
{
    public ushort AddressId { get; set; }
    public string Display { get; set; } = string.Empty;
}
