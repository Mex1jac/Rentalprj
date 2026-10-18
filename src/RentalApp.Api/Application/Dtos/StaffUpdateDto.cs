using System.ComponentModel.DataAnnotations;

namespace RentalApp.Api.Application.Dtos;

/// <summary>Payload used to edit staff data. The password is changed through its own endpoint.</summary>
public class StaffUpdateDto
{
    [Required]
    [MaxLength(45)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(45)]
    public string LastName { get; set; } = string.Empty;

    [EmailAddress]
    [MaxLength(50)]
    public string? Email { get; set; }

    [Range(1, ushort.MaxValue)]
    public ushort AddressId { get; set; }

    [Range(1, byte.MaxValue)]
    public byte StoreId { get; set; }

    [Required]
    [MaxLength(16)]
    public string Username { get; set; } = string.Empty;
}
