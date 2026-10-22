using RentalApp.Api.Domain.Exceptions;

namespace RentalApp.Api.Application;

/// <summary>
/// Shared server-side pagination rules for the list endpoints (customers and
/// rentals): the page size comes from a small allowlist so every cache entry
/// on the client stays bounded, and page > 1 always carries an explicit page
/// size. Omitting pageSize means "return the full list".
/// </summary>
public static class Pagination
{
    public const int DefaultPage = 1;

    public static readonly IReadOnlyList<int> AllowedPageSizes = [10, 25, 50, 100];

    public static void Validate(int page, int? pageSize)
    {
        if (page < 1)
        {
            throw new ValidationException("Page must be greater than or equal to 1.");
        }

        if (pageSize is null)
        {
            if (page > 1)
            {
                throw new ValidationException("Page size is required when the page is greater than 1.");
            }

            return;
        }

        if (!AllowedPageSizes.Contains(pageSize.Value))
        {
            throw new ValidationException(
                $"Page size must be one of: {string.Join(", ", AllowedPageSizes)}.");
        }
    }
}
