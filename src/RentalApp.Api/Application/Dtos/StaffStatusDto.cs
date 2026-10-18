namespace RentalApp.Api.Application.Dtos;

/// <summary>Result of a staff deactivate/reactivate operation.</summary>
public class StaffStatusDto
{
    public ushort StaffId { get; set; }
    public bool Active { get; set; }
}
