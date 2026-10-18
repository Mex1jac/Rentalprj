using System.ComponentModel.DataAnnotations;

namespace RentalApp.Api.Application.Dtos;

/// <summary>
/// Payload used to replace a staff password. The value is hashed before
/// persistence and the current password is never returned or stored in clear.
/// Passwords do not expire (requirement FR-2).
/// </summary>
public class StaffPasswordUpdateDto
{
    [Required]
    [MinLength(6)]
    [MaxLength(128)]
    public string NewPassword { get; set; } = string.Empty;
}
