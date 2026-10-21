namespace RentalApp.Api.Domain.Entities;

/// <summary>Member of the video club (sakila.customer).</summary>
public class Customer
{
    public ushort CustomerId { get; set; }
    public byte StoreId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public ushort AddressId { get; set; }
    public bool Active { get; set; }
    public DateTime CreateDate { get; set; }

    // Display-only fields populated by repository joins (never persisted by the domain).
    public string AddressDisplay { get; set; } = string.Empty;
    public string StoreDisplay { get; set; } = string.Empty;
}
