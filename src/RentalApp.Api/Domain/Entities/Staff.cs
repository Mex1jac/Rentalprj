namespace RentalApp.Api.Domain.Entities;

/// <summary>
/// Staff member of the video club. The password is intentionally not part of
/// this entity: it is handled only as a write-only value through the repository
/// so it can never be read back (requirement FR-1).
/// </summary>
public class Staff
{
    public ushort StaffId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public ushort AddressId { get; set; }
    public string? Email { get; set; }
    public byte StoreId { get; set; }
    public bool Active { get; set; }
    public string Username { get; set; } = string.Empty;

    // Display-only fields populated by repository joins (never persisted by the domain).
    public string AddressDisplay { get; set; } = string.Empty;
    public string StoreDisplay { get; set; } = string.Empty;
}
