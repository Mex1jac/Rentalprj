using System.ComponentModel.DataAnnotations;

namespace RentalApp.Api.Application.Dtos;

/// <summary>
/// Payload used to rent 1+ films to a member for a number of days: one entry
/// per requested film; the server assigns one available physical copy of each.
/// </summary>
public class RentalCreateDto
{
    [Range(1, ushort.MaxValue)]
    public ushort CustomerId { get; set; }

    [Range(1, ushort.MaxValue)]
    public ushort StaffId { get; set; }

    [Range(1, byte.MaxValue)]
    public byte StoreId { get; set; }

    [Range(1, 90)]
    public int RentalDays { get; set; }

    [MinLength(1)]
    [MaxLength(50)]
    public List<ushort> FilmIds { get; set; } = [];
}
