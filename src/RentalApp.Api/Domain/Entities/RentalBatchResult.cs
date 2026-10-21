namespace RentalApp.Api.Domain.Entities;

/// <summary>
/// Outcome of a batch create. When a film loses its last available copy while
/// the batch is being processed (a concurrent operator rented it first), no
/// row is committed and the film ids are reported so the use case can raise a
/// conflict and the operator can refresh.
/// </summary>
public class RentalBatchResult
{
    public IReadOnlyList<int> RentalIds { get; set; } = [];
    public IReadOnlyList<ushort> UnavailableFilmIds { get; set; } = [];
}
