using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Domain.Entities;
using RentalApp.Api.Domain.Exceptions;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Api.Application.Services;

/// <summary>
/// Use cases for the film catalog page: list, create, edit, logical
/// deactivate/reactivate and physical delete. Every rule and message is
/// mirrored by the frontend filmService so invalid input fails fast with
/// exactly the wording the API would return.
/// </summary>
public class FilmService
{
    // sakila film column limits (SHOW CREATE TABLE film).
    public const int MaxTitleLength = 128;
    public const int MaxDescriptionLength = 2000;
    public const int MinReleaseYear = 1901;
    public const decimal MinRentalRate = 0m;
    public const decimal MaxRentalRate = 99.99m;
    public const int MaxLengthMinutes = 999;
    public const decimal MinReplacementCost = 0m;
    public const decimal MaxReplacementCost = 999.99m;

    // Business rules: the film's default duration can never exceed the
    // maximum window an operator can grant at the counter.
    public const int MinRentalDurationDays = 1;
    public const int MaxRentalDurationDays = RentalService.MaxRentalDays;
    public const int MinCopiesPerStore = 1;
    public const int MaxCopiesPerStore = 100;

    /// <summary>sakila film.rating enum values.</summary>
    public static readonly IReadOnlyList<string> AllowedRatings = ["G", "PG", "PG-13", "R", "NC-17"];

    /// <summary>sakila film.special_features SET values.</summary>
    public static readonly IReadOnlyList<string> AllowedSpecialFeatures =
        ["Trailers", "Commentaries", "Deleted Scenes", "Behind the Scenes"];

    private readonly IFilmRepository _filmRepository;
    private readonly ILookupRepository _lookupRepository;

    public FilmService(IFilmRepository filmRepository, ILookupRepository lookupRepository)
    {
        _filmRepository = filmRepository;
        _lookupRepository = lookupRepository;
    }

    public async Task<PagedResultDto<FilmDto>> GetListAsync(
        string? search,
        FilmListStatus status = FilmListStatus.All,
        int page = Pagination.DefaultPage,
        int? pageSize = null,
        CancellationToken cancellationToken = default)
    {
        Pagination.Validate(page, pageSize);

        if (pageSize is null)
        {
            // Unbounded list, kept for callers that need every row.
            var all = await _filmRepository.GetAllAsync(search, status, cancellationToken);
            return new PagedResultDto<FilmDto>
            {
                Items = all.Select(MapToDto).ToList(),
                Page = 1,
                PageSize = all.Count,
                Total = all.Count,
            };
        }

        var total = await _filmRepository.CountAsync(search, status, cancellationToken);
        var rows = await _filmRepository.GetPageAsync(
            search, status, pageSize.Value, (page - 1) * pageSize.Value, cancellationToken);

        return new PagedResultDto<FilmDto>
        {
            Items = rows.Select(MapToDto).ToList(),
            Page = page,
            PageSize = pageSize.Value,
            Total = total,
        };
    }

    public async Task<FilmDto> GetByIdAsync(ushort filmId, CancellationToken cancellationToken = default)
    {
        var film = await _filmRepository.GetByIdAsync(filmId, cancellationToken);
        if (film is null)
        {
            throw new NotFoundException($"Film with id {filmId} was not found.");
        }

        return MapToDto(film);
    }

    public async Task<FilmDto> CreateAsync(FilmCreateDto dto, CancellationToken cancellationToken = default)
    {
        ValidateFilmData(dto);

        if (dto.CopiesPerStore is < MinCopiesPerStore or > MaxCopiesPerStore)
        {
            throw new ValidationException(
                $"Copies per store must be between {MinCopiesPerStore} and {MaxCopiesPerStore}.");
        }

        await EnsureLanguagesExistAsync(dto.LanguageId, dto.OriginalLanguageId, cancellationToken);

        var film = BuildFilmFromDto(dto);

        // A film without inventory copies never reaches the rental form (the
        // lookup joins inventory), so every store gets its copies on day one.
        var storeIds = (await _lookupRepository.GetStoresAsync(cancellationToken))
            .Select(s => s.StoreId)
            .ToList();

        var filmId = await _filmRepository.CreateAsync(film, storeIds, dto.CopiesPerStore, cancellationToken);
        return await GetByIdAsync(filmId, cancellationToken);
    }

    public async Task<FilmDto> UpdateAsync(
        ushort filmId,
        FilmUpdateDto dto,
        CancellationToken cancellationToken = default)
    {
        ValidateFilmData(dto);

        var existing = await _filmRepository.GetByIdAsync(filmId, cancellationToken)
            ?? throw new NotFoundException($"Film with id {filmId} was not found.");

        await EnsureLanguagesExistAsync(dto.LanguageId, dto.OriginalLanguageId, cancellationToken);

        var updated = BuildFilmFromDto(dto);
        updated.FilmId = existing.FilmId;

        await _filmRepository.UpdateAsync(updated, cancellationToken);

        return await GetByIdAsync(filmId, cancellationToken);
    }

    public async Task<FilmStatusDto> SetActiveAsync(
        ushort filmId,
        bool active,
        CancellationToken cancellationToken = default)
    {
        // Deactivation is always allowed (backlog #8 decision): open rentals
        // finish normally and the copies simply stop being offered.
        var exists = await _filmRepository.SetActiveAsync(filmId, active, cancellationToken);
        if (!exists)
        {
            throw new NotFoundException($"Film with id {filmId} was not found.");
        }

        return new FilmStatusDto { FilmId = filmId, Active = active };
    }

    public async Task DeleteAsync(ushort filmId, CancellationToken cancellationToken = default)
    {
        // Copies in inventory carry rental history (FK RESTRICT): films with
        // history stay in the catalog; only unused ones can be removed. Films
        // WITH copies get logically deactivated instead (SetActiveAsync).
        var copies = await _filmRepository.CountInventoryAsync(filmId, cancellationToken);
        if (copies > 0)
        {
            var copiesText = copies == 1 ? "1 copy" : $"{copies} copies";
            throw new ConflictException(
                $"Film with id {filmId} has {copiesText} in inventory and cannot be deleted.");
        }

        var deleted = await _filmRepository.DeleteAsync(filmId, cancellationToken);
        if (!deleted)
        {
            throw new NotFoundException($"Film with id {filmId} was not found.");
        }
    }

    /// <summary>Maximum accepted release year (a one-year horizon for pre-releases).</summary>
    private static int MaxReleaseYear => DateTime.Now.Year + 1;

    private static void ValidateFilmData(FilmUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Trim().Length > MaxTitleLength)
        {
            throw new ValidationException(
                $"Title is required and cannot exceed {MaxTitleLength} characters.");
        }

        if (!string.IsNullOrWhiteSpace(dto.Description) && dto.Description.Trim().Length > MaxDescriptionLength)
        {
            throw new ValidationException($"Description cannot exceed {MaxDescriptionLength} characters.");
        }

        if (dto.ReleaseYear is not null && (dto.ReleaseYear < MinReleaseYear || dto.ReleaseYear > MaxReleaseYear))
        {
            throw new ValidationException(
                $"Release year must be between {MinReleaseYear} and {MaxReleaseYear}.");
        }

        if (dto.RentalDurationDays is < MinRentalDurationDays or > MaxRentalDurationDays)
        {
            throw new ValidationException(
                $"Rental duration must be between {MinRentalDurationDays} and {MaxRentalDurationDays} days.");
        }

        if (dto.RentalRate is < MinRentalRate or > MaxRentalRate)
        {
            throw new ValidationException(
                $"Rental rate must be between {MinRentalRate:0.00} and {MaxRentalRate:0.00}.");
        }

        if (decimal.Round(dto.RentalRate, 2) != dto.RentalRate)
        {
            throw new ValidationException("Rental rate must have at most 2 decimals.");
        }

        if (dto.LengthMinutes is < 1 or > MaxLengthMinutes)
        {
            throw new ValidationException($"Length must be between 1 and {MaxLengthMinutes} minutes.");
        }

        if (dto.ReplacementCost is < MinReplacementCost or > MaxReplacementCost)
        {
            throw new ValidationException(
                $"Replacement cost must be between {MinReplacementCost:0.00} and {MaxReplacementCost:0.00}.");
        }

        if (decimal.Round(dto.ReplacementCost, 2) != dto.ReplacementCost)
        {
            throw new ValidationException("Replacement cost must have at most 2 decimals.");
        }

        var rating = string.IsNullOrWhiteSpace(dto.Rating) ? "G" : dto.Rating.Trim();
        if (!AllowedRatings.Contains(rating))
        {
            throw new ValidationException($"Rating must be one of: {string.Join(", ", AllowedRatings)}.");
        }

        foreach (var feature in dto.SpecialFeatures ?? [])
        {
            if (!AllowedSpecialFeatures.Contains(feature.Trim()))
            {
                throw new ValidationException($"Special feature '{feature.Trim()}' is not allowed.");
            }
        }
    }

    private async Task EnsureLanguagesExistAsync(
        byte languageId,
        byte? originalLanguageId,
        CancellationToken cancellationToken)
    {
        if (!await _lookupRepository.LanguageExistsAsync(languageId, cancellationToken))
        {
            throw new ValidationException($"Language with id {languageId} does not exist.");
        }

        if (originalLanguageId is not null &&
            !await _lookupRepository.LanguageExistsAsync(originalLanguageId.Value, cancellationToken))
        {
            throw new ValidationException($"Original language with id {originalLanguageId} does not exist.");
        }
    }

    private static Film BuildFilmFromDto(FilmUpdateDto dto)
    {
        var specialFeatures = (dto.SpecialFeatures ?? [])
            .Select(feature => feature.Trim())
            .Where(feature => feature.Length > 0)
            .Distinct()
            .ToList();

        return new Film
        {
            Title = dto.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            ReleaseYear = dto.ReleaseYear,
            LanguageId = dto.LanguageId,
            OriginalLanguageId = dto.OriginalLanguageId,
            RentalDurationDays = dto.RentalDurationDays,
            RentalRate = dto.RentalRate,
            LengthMinutes = dto.LengthMinutes,
            ReplacementCost = dto.ReplacementCost,
            Rating = string.IsNullOrWhiteSpace(dto.Rating) ? "G" : dto.Rating.Trim(),
            // sakila stores the SET as a comma-joined string; none means NULL.
            SpecialFeaturesCsv = specialFeatures.Count == 0 ? null : string.Join(",", specialFeatures),
        };
    }

    private static FilmDto MapToDto(Film film) => new()
    {
        FilmId = film.FilmId,
        Title = film.Title,
        Description = film.Description,
        ReleaseYear = film.ReleaseYear,
        LanguageId = film.LanguageId,
        Language = film.LanguageDisplay,
        OriginalLanguageId = film.OriginalLanguageId,
        OriginalLanguage = film.OriginalLanguageDisplay,
        RentalDurationDays = film.RentalDurationDays,
        RentalRate = film.RentalRate,
        LengthMinutes = film.LengthMinutes,
        ReplacementCost = film.ReplacementCost,
        Rating = film.Rating ?? "G",
        SpecialFeatures = string.IsNullOrEmpty(film.SpecialFeaturesCsv)
            ? []
            : film.SpecialFeaturesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries),
        TotalCopies = film.TotalCopies,
        Active = film.Active,
    };
}
