using System.ComponentModel.DataAnnotations;

namespace RentalApp.Api.Application.Dtos;

/// <summary>Payload used by the UI to toggle the film's active flag (logical leave).</summary>
public class FilmSetActiveDto
{
    [Required]
    public bool Active { get; set; }
}
