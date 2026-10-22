namespace RentalApp.Api.Application.Dtos;

/// <summary>
/// Payload used to register a new film: every editable field plus the number
/// of physical copies to stock at each store on day one.
/// </summary>
public class FilmCreateDto : FilmUpdateDto
{
    public int CopiesPerStore { get; set; } = 1;
}
