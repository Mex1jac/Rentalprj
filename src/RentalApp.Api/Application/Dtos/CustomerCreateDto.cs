using System.ComponentModel.DataAnnotations;

namespace RentalApp.Api.Application.Dtos;

/// <summary>Payload used to create a new member of the video club.</summary>
public class CustomerCreateDto
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
}
