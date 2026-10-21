namespace RentalApp.Api.Application.Dtos;

/// <summary>Public member representation.</summary>
public class CustomerDto
{
    public ushort CustomerId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public ushort AddressId { get; set; }
    public string Address { get; set; } = string.Empty;
    public byte StoreId { get; set; }
    public string Store { get; set; } = string.Empty;
    public bool Active { get; set; }
}
