namespace RentalApp.Api.Domain.Entities;

/// <summary>Lookup entry used by the UI to pick a staff store.</summary>
public class StoreOption
{
    public byte StoreId { get; set; }
    public string Display { get; set; } = string.Empty;
}
