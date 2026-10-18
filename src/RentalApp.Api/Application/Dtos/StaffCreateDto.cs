using System.ComponentModel.DataAnnotations;

namespace RentalApp.Api.Application.Dtos;

/// <summary>Payload used to create a new staff member.</summary>
public class StaffCreateDto
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

    // Only required on creation; the value is hashed before touching persistence.
    [Required]
    [MinLength(6)]
    [MaxLength(128)]
    public string Password { get; set; } = string.Empty;
}
