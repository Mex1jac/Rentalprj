namespace RentalApp.Api.Application.Dtos;

/// <summary>
/// Public staff representation. It deliberately has no password field, so the
/// password can never be read through the API (requirement FR-1).
/// </summary>
public class StaffDto
{
    public ushort StaffId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public ushort AddressId { get; set; }
    public string Address { get; set; } = string.Empty;
    public byte StoreId { get; set; }
    public string Store { get; set; } = string.Empty;
    public bool Active { get; set; }
    public string Username { get; set; } = string.Empty;
}
