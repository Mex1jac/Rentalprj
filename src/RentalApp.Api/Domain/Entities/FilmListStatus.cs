namespace RentalApp.Api.Domain.Entities;

/// <summary>Server-side filter for the film list (bound from the `status` query string).</summary>
public enum FilmListStatus
{
    All,
    Active,
    Inactive,
}
