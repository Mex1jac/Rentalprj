using Moq;
using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Application.Services;
using RentalApp.Api.Domain.Entities;
using RentalApp.Api.Domain.Exceptions;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Tests.Application;

public class FilmServiceTests
{
    private readonly Mock<IFilmRepository> _filmRepository = new();
    private readonly Mock<ILookupRepository> _lookupRepository = new();
    private readonly FilmService _service;

    public FilmServiceTests()
    {
        _service = new FilmService(_filmRepository.Object, _lookupRepository.Object);

        _lookupRepository.Setup(r => r.LanguageExistsAsync(It.IsAny<byte>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _lookupRepository.Setup(r => r.GetStoresAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([new StoreOption { StoreId = 1 }, new StoreOption { StoreId = 2 }]);
    }

    private static FilmCreateDto ValidCreateDto() => new()
    {
        Title = "ACADEMY DINOSAUR",
        Description = "A Epic Drama of a Feminist And a Scientist who must Crochet a Dinosaur.",
        ReleaseYear = 2006,
        LanguageId = 1,
        OriginalLanguageId = null,
        RentalDurationDays = 6,
        RentalRate = 0.99m,
        LengthMinutes = 86,
        ReplacementCost = 20.99m,
        Rating = "PG",
        SpecialFeatures = ["Trailers", "Commentaries"],
        CopiesPerStore = 2,
    };

    private static Film SampleFilm(ushort filmId = 1001) => new()
    {
        FilmId = filmId,
        Title = "ACADEMY DINOSAUR",
        Description = "A Epic Drama.",
        ReleaseYear = 2006,
        LanguageId = 1,
        OriginalLanguageId = null,
        RentalDurationDays = 6,
        RentalRate = 0.99m,
        LengthMinutes = 86,
        ReplacementCost = 20.99m,
        Rating = "PG",
        SpecialFeaturesCsv = "Trailers,Commentaries",
        TotalCopies = 4,
        LanguageDisplay = "English",
    };

    // --- List ------------------------------------------------------------------

    [Fact]
    public async Task GetList_Paged_ReturnsEnvelopeWithMappedDtos()
    {
        _filmRepository.Setup(r => r.CountAsync("dino", FilmListStatus.All, It.IsAny<CancellationToken>())).ReturnsAsync(30);
        _filmRepository.Setup(r => r.GetPageAsync("dino", FilmListStatus.All, 25, 0, It.IsAny<CancellationToken>()))
            .ReturnsAsync([SampleFilm()]);

        var result = await _service.GetListAsync("dino", page: 1, pageSize: 25);

        Assert.Equal(30, result.Total);
        Assert.Equal(25, result.PageSize);
        var dto = Assert.Single(result.Items);
        Assert.Equal("English", dto.Language);
        Assert.Equal("PG", dto.Rating);
        // The sakila SET string is exposed as a list.
        Assert.Equal(new[] { "Trailers", "Commentaries" }, dto.SpecialFeatures);
        // Films created before migration 004 default to active.
        Assert.True(dto.Active);
    }

    [Fact]
    public async Task GetList_NoPageSize_ReturnsFullList()
    {
        _filmRepository.Setup(r => r.GetAllAsync("dino", FilmListStatus.All, It.IsAny<CancellationToken>()))
            .ReturnsAsync([SampleFilm(1), SampleFilm(2)]);

        var result = await _service.GetListAsync("dino");

        Assert.Equal(2, result.Total);
        Assert.Equal(2, result.PageSize);
        Assert.Equal(1, result.TotalPages);
    }

    [Fact]
    public async Task GetList_PassesTheStatusFilterToTheRepository()
    {
        _filmRepository.Setup(r => r.CountAsync(null, FilmListStatus.Inactive, It.IsAny<CancellationToken>()))
            .ReturnsAsync(4);
        _filmRepository.Setup(r => r.GetPageAsync(null, FilmListStatus.Inactive, 25, 0, It.IsAny<CancellationToken>()))
            .ReturnsAsync([SampleFilm()]);

        var result = await _service.GetListAsync(null, FilmListStatus.Inactive, page: 1, pageSize: 25);

        Assert.Equal(4, result.Total);
        _filmRepository.Verify(r => r.CountAsync(null, FilmListStatus.Inactive, It.IsAny<CancellationToken>()), Times.Once);
        _filmRepository.Verify(
            r => r.GetPageAsync(null, FilmListStatus.Inactive, 25, 0, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetList_DefaultsToTheAllFilter()
    {
        _filmRepository.Setup(r => r.CountAsync(null, FilmListStatus.All, It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
        _filmRepository.Setup(r => r.GetPageAsync(null, FilmListStatus.All, 10, 0, It.IsAny<CancellationToken>()))
            .ReturnsAsync([SampleFilm()]);

        await _service.GetListAsync(null, page: 1, pageSize: 10);

        _filmRepository.Verify(r => r.CountAsync(null, FilmListStatus.All, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetById_InactiveFilm_ExposesTheFlag()
    {
        var inactive = SampleFilm();
        inactive.Active = false;
        _filmRepository.Setup(r => r.GetByIdAsync((ushort)1001, It.IsAny<CancellationToken>()))
            .ReturnsAsync(inactive);

        var dto = await _service.GetByIdAsync(1001);

        Assert.False(dto.Active);
    }

    [Fact]
    public async Task GetList_InvalidPageSize_ThrowsValidation()
    {
        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _service.GetListAsync(null, page: 1, pageSize: 7));
        Assert.Equal("Page size must be one of: 10, 25, 50, 100.", ex.Message);
    }

    [Fact]
    public async Task GetById_UnknownFilm_ThrowsNotFound()
    {
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _service.GetByIdAsync(55));
        Assert.Equal("Film with id 55 was not found.", ex.Message);
    }

    // --- Create ----------------------------------------------------------------

    [Fact]
    public async Task Create_SavesNormalizedFilmAndStocksCopiesOnEveryStore()
    {
        Film? savedFilm = null;
        (IReadOnlyList<byte>?, int)? stockRequest = null;
        _filmRepository
            .Setup(r => r.CreateAsync(It.IsAny<Film>(), It.IsAny<IReadOnlyList<byte>>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .Callback<Film, IReadOnlyList<byte>, int, CancellationToken>((film, storeIds, copies, _) =>
            {
                savedFilm = film;
                stockRequest = (storeIds.ToList(), copies);
            })
            .ReturnsAsync((ushort)1001);
        _filmRepository.Setup(r => r.GetByIdAsync((ushort)1001, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleFilm());

        var dto = ValidCreateDto();
        dto.Title = "  ACADEMY DINOSAUR ";
        dto.Description = "  A Epic Drama. ";
        await _service.CreateAsync(dto);

        Assert.NotNull(savedFilm);
        Assert.Equal("ACADEMY DINOSAUR", savedFilm.Title);
        Assert.Equal("A Epic Drama.", savedFilm.Description);
        // sakila stores the SET column as a comma-joined string.
        Assert.Equal("Trailers,Commentaries", savedFilm.SpecialFeaturesCsv);
        Assert.NotNull(stockRequest);
        Assert.Equal(new byte[] { 1, 2 }, stockRequest.Value.Item1);
        Assert.Equal(2, stockRequest.Value.Item2);
    }

    [Fact]
    public async Task Create_BlankRatingAndNoFeatures_DefaultsToGWithNullCsv()
    {
        Film? savedFilm = null;
        _filmRepository
            .Setup(r => r.CreateAsync(It.IsAny<Film>(), It.IsAny<IReadOnlyList<byte>>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .Callback<Film, IReadOnlyList<byte>, int, CancellationToken>((film, _, _, _) => savedFilm = film)
            .ReturnsAsync((ushort)1001);
        _filmRepository.Setup(r => r.GetByIdAsync((ushort)1001, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleFilm());

        var dto = ValidCreateDto();
        dto.Rating = "  ";
        dto.SpecialFeatures = [];
        await _service.CreateAsync(dto);

        Assert.NotNull(savedFilm);
        Assert.Equal("G", savedFilm.Rating);
        Assert.Null(savedFilm.SpecialFeaturesCsv);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public async Task Create_InvalidCopiesPerStore_ThrowsValidation(int copies)
    {
        var dto = ValidCreateDto();
        dto.CopiesPerStore = copies;

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Copies per store must be between 1 and 100.", ex.Message);
        _filmRepository.Verify(r => r.CreateAsync(It.IsAny<Film>(), It.IsAny<IReadOnlyList<byte>>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Create_EmptyTitle_ThrowsValidation(string title)
    {
        var dto = ValidCreateDto();
        dto.Title = title;

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Title is required and cannot exceed 128 characters.", ex.Message);
    }

    [Fact]
    public async Task Create_TitleLongerThan128_ThrowsValidation()
    {
        var dto = ValidCreateDto();
        dto.Title = new string('a', 129);

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Title is required and cannot exceed 128 characters.", ex.Message);
    }

    [Fact]
    public async Task Create_DescriptionLongerThan2000_ThrowsValidation()
    {
        var dto = ValidCreateDto();
        dto.Description = new string('a', 2001);

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Description cannot exceed 2000 characters.", ex.Message);
    }

    [Theory]
    [InlineData(1900)]
    [InlineData(3000)]
    public async Task Create_ReleaseYearOutOfRange_ThrowsValidation(int year)
    {
        var dto = ValidCreateDto();
        dto.ReleaseYear = year;

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal($"Release year must be between 1901 and {DateTime.Now.Year + 1}.", ex.Message);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(91)]
    public async Task Create_RentalDurationOutOfRange_ThrowsValidation(ushort days)
    {
        var dto = ValidCreateDto();
        dto.RentalDurationDays = days;

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Rental duration must be between 1 and 90 days.", ex.Message);
    }

    [Theory]
    [InlineData(-0.01)]
    [InlineData(100.00)]
    public async Task Create_RentalRateOutOfRange_ThrowsValidation(decimal rate)
    {
        var dto = ValidCreateDto();
        dto.RentalRate = rate;

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Rental rate must be between 0.00 and 99.99.", ex.Message);
    }

    [Fact]
    public async Task Create_RentalRateWithTooManyDecimals_ThrowsValidation()
    {
        var dto = ValidCreateDto();
        dto.RentalRate = 4.999m;

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Rental rate must have at most 2 decimals.", ex.Message);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1000)]
    public async Task Create_LengthOutOfRange_ThrowsValidation(ushort length)
    {
        var dto = ValidCreateDto();
        dto.LengthMinutes = length;

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Length must be between 1 and 999 minutes.", ex.Message);
    }

    [Fact]
    public async Task Create_ReplacementCostOutOfRange_ThrowsValidation()
    {
        var dto = ValidCreateDto();
        dto.ReplacementCost = 1000.00m;

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Replacement cost must be between 0.00 and 999.99.", ex.Message);
    }

    [Fact]
    public async Task Create_ReplacementCostWithTooManyDecimals_ThrowsValidation()
    {
        var dto = ValidCreateDto();
        dto.ReplacementCost = 19.999m;

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Replacement cost must have at most 2 decimals.", ex.Message);
    }

    [Fact]
    public async Task Create_UnknownRating_ThrowsValidation()
    {
        var dto = ValidCreateDto();
        dto.Rating = "R-18";

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Rating must be one of: G, PG, PG-13, R, NC-17.", ex.Message);
    }

    [Fact]
    public async Task Create_UnknownSpecialFeature_ThrowsValidation()
    {
        var dto = ValidCreateDto();
        dto.SpecialFeatures = ["Trailers", "Bloopers"];

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Special feature 'Bloopers' is not allowed.", ex.Message);
    }

    [Fact]
    public async Task Create_UnknownLanguage_ThrowsValidation()
    {
        _lookupRepository.Setup(r => r.LanguageExistsAsync(9, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        var dto = ValidCreateDto();
        dto.LanguageId = 9;

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Language with id 9 does not exist.", ex.Message);
    }

    [Fact]
    public async Task Create_UnknownOriginalLanguage_ThrowsValidation()
    {
        _lookupRepository.Setup(r => r.LanguageExistsAsync(8, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        var dto = ValidCreateDto();
        dto.OriginalLanguageId = 8;

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Original language with id 8 does not exist.", ex.Message);
    }

    // --- Update ----------------------------------------------------------------

    [Fact]
    public async Task Update_SavesEveryEditableFieldAndKeepsId()
    {
        Film? savedFilm = null;
        _filmRepository.Setup(r => r.GetByIdAsync((ushort)1001, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleFilm());
        _filmRepository
            .Setup(r => r.UpdateAsync(It.IsAny<Film>(), It.IsAny<CancellationToken>()))
            .Callback<Film, CancellationToken>((film, _) => savedFilm = film)
            .ReturnsAsync(true);

        var dto = new FilmUpdateDto
        {
            Title = "ACADEMY DINOSAUR",
            Description = "New description.",
            ReleaseYear = 2007,
            LanguageId = 2,
            OriginalLanguageId = 1,
            RentalDurationDays = 3,
            RentalRate = 4.99m,
            LengthMinutes = 90,
            ReplacementCost = 24.99m,
            Rating = "G",
            SpecialFeatures = ["Behind the Scenes"],
        };
        await _service.UpdateAsync(1001, dto);

        Assert.NotNull(savedFilm);
        Assert.Equal((ushort)1001, savedFilm.FilmId);
        Assert.Equal("New description.", savedFilm.Description);
        Assert.Equal(2007, savedFilm.ReleaseYear);
        Assert.Equal((byte)2, savedFilm.LanguageId);
        Assert.Equal((byte?)1, savedFilm.OriginalLanguageId);
        Assert.Equal((ushort)3, savedFilm.RentalDurationDays);
        Assert.Equal(4.99m, savedFilm.RentalRate);
        Assert.Equal((ushort)90, savedFilm.LengthMinutes);
        Assert.Equal(24.99m, savedFilm.ReplacementCost);
        Assert.Equal("G", savedFilm.Rating);
        Assert.Equal("Behind the Scenes", savedFilm.SpecialFeaturesCsv);
    }

    [Fact]
    public async Task Update_UnknownFilm_ThrowsNotFound()
    {
        var dto = new FilmUpdateDto
        {
            Title = "ACADEMY DINOSAUR",
            RentalDurationDays = 6,
            RentalRate = 0.99m,
            ReplacementCost = 20.99m,
            Rating = "PG",
        };

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _service.UpdateAsync(55, dto));
        Assert.Equal("Film with id 55 was not found.", ex.Message);
    }

    [Fact]
    public async Task Update_InvalidData_ThrowsValidationBeforeLoadingTheFilm()
    {
        var dto = new FilmUpdateDto();
        await Assert.ThrowsAsync<ValidationException>(() => _service.UpdateAsync(1001, dto));
        _filmRepository.Verify(r => r.GetByIdAsync(It.IsAny<ushort>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // --- Delete ----------------------------------------------------------------

    [Fact]
    public async Task Delete_WithoutCopies_RemovesTheFilm()
    {
        _filmRepository.Setup(r => r.CountInventoryAsync((ushort)1001, It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _filmRepository.Setup(r => r.DeleteAsync((ushort)1001, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        await _service.DeleteAsync(1001);

        _filmRepository.Verify(r => r.DeleteAsync((ushort)1001, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Delete_WithCopies_ThrowsConflictAndKeepsTheFilm()
    {
        _filmRepository.Setup(r => r.CountInventoryAsync((ushort)1001, It.IsAny<CancellationToken>())).ReturnsAsync(3);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.DeleteAsync(1001));
        Assert.Equal("Film with id 1001 has 3 copies in inventory and cannot be deleted.", ex.Message);
        _filmRepository.Verify(r => r.DeleteAsync(It.IsAny<ushort>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Delete_WithASingleCopy_UsesSingularWording()
    {
        _filmRepository.Setup(r => r.CountInventoryAsync((ushort)1001, It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.DeleteAsync(1001));
        Assert.Equal("Film with id 1001 has 1 copy in inventory and cannot be deleted.", ex.Message);
    }

    [Fact]
    public async Task Delete_UnknownFilm_ThrowsNotFound()
    {
        _filmRepository.Setup(r => r.CountInventoryAsync((ushort)55, It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _filmRepository.Setup(r => r.DeleteAsync((ushort)55, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _service.DeleteAsync(55));
        Assert.Equal("Film with id 55 was not found.", ex.Message);
    }

    // --- SetActive (logical leave, backlog #8) --------------------------------

    [Fact]
    public async Task SetActive_Deactivate_FlipsTheFlagAndReturnsTheStatus()
    {
        _filmRepository.Setup(r => r.SetActiveAsync((ushort)1001, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var status = await _service.SetActiveAsync(1001, active: false);

        Assert.Equal((ushort)1001, status.FilmId);
        Assert.False(status.Active);
    }

    [Fact]
    public async Task SetActive_Reactivate_FlipsTheFlagBack()
    {
        _filmRepository.Setup(r => r.SetActiveAsync((ushort)1001, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var status = await _service.SetActiveAsync(1001, active: true);

        Assert.True(status.Active);
    }

    [Fact]
    public async Task SetActive_DeactivateWithOpenRentals_IsAllowed()
    {
        // Decision (backlog #8): open rentals never block a film's deactivation.
        _filmRepository.Setup(r => r.SetActiveAsync((ushort)1001, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var status = await _service.SetActiveAsync(1001, active: false);

        Assert.False(status.Active);
        // The physical delete stays untouched: deactivation never deletes.
        _filmRepository.Verify(r => r.DeleteAsync(It.IsAny<ushort>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SetActive_UnknownFilm_ThrowsNotFound()
    {
        _filmRepository.Setup(r => r.SetActiveAsync((ushort)55, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _service.SetActiveAsync(55, active: false));
        Assert.Equal("Film with id 55 was not found.", ex.Message);
    }
}
