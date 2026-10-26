namespace RentalApp.Api.Application.Dtos;

/// <summary>Result of a film deactivate/reactivate operation (backlog #8).</summary>
public class FilmStatusDto
{
    public ushort FilmId { get; set; }
    public bool Active { get; set; }
}
