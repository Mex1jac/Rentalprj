namespace RentalApp.Api.Application.Dtos;

/// <summary>
/// Envelope returned by the paginated list endpoints (customers, rentals):
/// one slice of items plus the totals needed to render the pagination
/// controls. When the caller omits pageSize the list comes unbounded
/// (pageSize = total, totalPages = 1) so consumers that need every row
/// (e.g. the rental-form member dropdown) keep working with one contract.
/// </summary>
public class PagedResultDto<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];

    public int Page { get; init; }

    public int PageSize { get; init; }

    public int Total { get; init; }

    /// <summary>Number of pages for the given page size (at least 1).</summary>
    public int TotalPages =>
        PageSize <= 0 ? 1 : Math.Max(1, (int)Math.Ceiling(Total / (double)PageSize));
}
