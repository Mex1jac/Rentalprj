using System.ComponentModel.DataAnnotations;

namespace RentalApp.Api.Application.Dtos;

/// <summary>Payload used by the UI to toggle the active flag (logical leave).</summary>
public class StaffSetActiveDto
{
    [Required]
    public bool Active { get; set; }
}
