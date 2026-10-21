namespace RentalApp.Api.Domain.Entities;

/// <summary>Server-side filter for the rental list (bound from the `status` query string).</summary>
public enum RentalListStatus
{
    All,
    Open,
    Returned,
}
