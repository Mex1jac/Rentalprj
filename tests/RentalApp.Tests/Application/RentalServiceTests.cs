using Moq;
using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Application.Services;
using RentalApp.Api.Domain.Entities;
using RentalApp.Api.Domain.Exceptions;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Tests.Application;

public class RentalServiceTests
{
    private readonly Mock<IRentalRepository> _rentalRepository = new();
    private readonly Mock<ICustomerRepository> _customerRepository = new();
    private readonly Mock<IStaffRepository> _staffRepository = new();
    private readonly Mock<ILookupRepository> _lookupRepository = new();
    private readonly RentalService _service;

    public RentalServiceTests()
    {
        _service = new RentalService(
            _rentalRepository.Object,
            _customerRepository.Object,
            _staffRepository.Object,
            _lookupRepository.Object);

        _customerRepository.Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleCustomer());
        _staffRepository.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleStaff());
        _lookupRepository.Setup(r => r.StoreExistsAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _lookupRepository.Setup(r => r.GetFilmsAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleFilmsAtStore());
    }

    private static RentalCreateDto ValidCreateDto() => new()
    {
        CustomerId = 10,
        StaffId = 1,
        StoreId = 1,
        RentalDays = 5,
        FilmIds = [1, 2],
    };

    private static Customer SampleCustomer() => new()
    {
        CustomerId = 10,
        FirstName = "Mary",
        LastName = "Smith",
        Active = true,
    };

    private static Staff SampleStaff() => new()
    {
        StaffId = 1,
        FirstName = "Mike",
        LastName = "Hillyer",
        Active = true,
    };

    private static List<FilmOption> SampleFilmsAtStore() =>
    [
        new FilmOption { FilmId = 1, Title = "ACADEMY DINOSAUR", RentalDurationDays = 6, RentalRate = 4.99m, AvailableCopies = 3 },
        new FilmOption { FilmId = 2, Title = "ACE GOLDFINGER", RentalDurationDays = 3, RentalRate = 2.99m, AvailableCopies = 2 },
    ];

    private static Rental SampleRental(int rentalId = 101) => new()
    {
        RentalId = rentalId,
        RentalDate = DateTime.Now,
        DueDate = DateTime.Now.AddDays(5),
        ReturnDate = null,
        CustomerId = 10,
        CustomerName = "Mary Smith",
        StoreId = 1,
        StoreDisplay = "Store 1",
        StaffName = "Mike Hillyer",
        FilmId = 1,
        FilmTitle = "ACADEMY DINOSAUR",
        InventoryId = 1,
    };

    private void SetupSuccessfulCreate(RentalBatchResult? result = null, IReadOnlyList<Rental>? created = null)
    {
        _rentalRepository.Setup(r => r.CreateAsync(It.IsAny<RentalBatch>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(result ?? new RentalBatchResult { RentalIds = [101], UnavailableFilmIds = [] });
        _rentalRepository.Setup(r => r.GetByIdsAsync(It.IsAny<IReadOnlyList<int>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(created ?? new List<Rental> { SampleRental() });
    }

    // --- Create: input validation -----------------------------------------------

    [Fact]
    public async Task Create_NoFilms_ThrowsValidation()
    {
        var dto = ValidCreateDto();
        dto.FilmIds = [];

        await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        _rentalRepository.Verify(r => r.CreateAsync(It.IsAny<RentalBatch>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(91)]
    public async Task Create_DaysOutOfRange_ThrowsValidation(int days)
    {
        var dto = ValidCreateDto();
        dto.RentalDays = days;

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Rental days must be between 1 and 90.", ex.Message);
        _rentalRepository.Verify(r => r.CreateAsync(It.IsAny<RentalBatch>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Create_TooManyFilms_ThrowsValidation()
    {
        var dto = ValidCreateDto();
        dto.FilmIds = Enumerable.Range(1, 51).Select(id => (ushort)id).ToList();

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("A rental can include at most 50 films.", ex.Message);
    }

    // --- Create: parties ---------------------------------------------------------

    [Fact]
    public async Task Create_UnknownCustomer_ThrowsNotFound()
    {
        _customerRepository.Setup(r => r.GetByIdAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Customer?)null);
        var dto = ValidCreateDto();
        dto.CustomerId = 999;

        await Assert.ThrowsAsync<NotFoundException>(() => _service.CreateAsync(dto));
    }

    [Fact]
    public async Task Create_InactiveCustomer_ThrowsConflict()
    {
        var inactive = SampleCustomer();
        inactive.Active = false;
        _customerRepository.Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(inactive);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.CreateAsync(ValidCreateDto()));
        Assert.Contains("inactive", ex.Message);
    }

    [Fact]
    public async Task Create_UnknownStaff_ThrowsNotFound()
    {
        _staffRepository.Setup(r => r.GetByIdAsync(99, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Staff?)null);
        var dto = ValidCreateDto();
        dto.StaffId = 99;

        await Assert.ThrowsAsync<NotFoundException>(() => _service.CreateAsync(dto));
    }

    [Fact]
    public async Task Create_InactiveStaff_ThrowsConflict()
    {
        var inactive = SampleStaff();
        inactive.Active = false;
        _staffRepository.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(inactive);

        await Assert.ThrowsAsync<ConflictException>(() => _service.CreateAsync(ValidCreateDto()));
    }

    [Fact]
    public async Task Create_UnknownStore_ThrowsValidation()
    {
        _lookupRepository.Setup(r => r.StoreExistsAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        var dto = ValidCreateDto();
        dto.StoreId = 7;

        await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
    }

    // --- Create: stock -----------------------------------------------------------

    [Fact]
    public async Task Create_FilmNotStockedAtStore_ThrowsConflict()
    {
        var dto = ValidCreateDto();
        dto.FilmIds = [999];

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.CreateAsync(dto));
        Assert.Contains("999", ex.Message);
        _rentalRepository.Verify(r => r.CreateAsync(It.IsAny<RentalBatch>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Create_NoAvailableCopies_ThrowsConflictNamingTheFilm()
    {
        _lookupRepository.Setup(r => r.GetFilmsAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new FilmOption { FilmId = 1, Title = "ACADEMY DINOSAUR", AvailableCopies = 0 },
            ]);
        var dto = ValidCreateDto();
        dto.FilmIds = [1];

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.CreateAsync(dto));
        Assert.Contains("ACADEMY DINOSAUR", ex.Message);
    }

    [Fact]
    public async Task Create_TwoCopiesRequestedButOneAvailable_ThrowsConflict()
    {
        // Duplicate film ids mean "two copies of the same film".
        var dto = ValidCreateDto();
        dto.FilmIds = [2, 2];

        _lookupRepository.Setup(r => r.GetFilmsAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
            [
                new FilmOption { FilmId = 2, Title = "ACE GOLDFINGER", AvailableCopies = 1 },
            ]);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.CreateAsync(dto));
        Assert.Contains("ACE GOLDFINGER", ex.Message);
    }

    [Fact]
    public async Task Create_RaceLostForLastCopy_ThrowsConflictWithoutPersisting()
    {
        SetupSuccessfulCreate(new RentalBatchResult { RentalIds = [], UnavailableFilmIds = [2] });

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.CreateAsync(ValidCreateDto()));

        Assert.Contains("no longer have enough available copies", ex.Message);
        _rentalRepository.Verify(r => r.GetByIdsAsync(It.IsAny<IReadOnlyList<int>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // --- Create: happy path ------------------------------------------------------

    [Fact]
    public async Task Create_DueDateIsRentalDatePlusCapturedDays()
    {
        RentalBatch? capturedBatch = null;
        _rentalRepository.Setup(r => r.CreateAsync(It.IsAny<RentalBatch>(), It.IsAny<CancellationToken>()))
            .Callback<RentalBatch, CancellationToken>((batch, _) => capturedBatch = batch)
            .ReturnsAsync(new RentalBatchResult { RentalIds = [101], UnavailableFilmIds = [] });
        _rentalRepository.Setup(r => r.GetByIdsAsync(It.IsAny<IReadOnlyList<int>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Rental> { SampleRental() });

        var dto = ValidCreateDto();
        dto.RentalDays = 7;
        var result = await _service.CreateAsync(dto);

        Assert.NotNull(capturedBatch);
        Assert.Equal(capturedBatch.RentalDate.AddDays(7), capturedBatch.DueDate);
        Assert.Equal((ushort)10, capturedBatch.CustomerId);
        Assert.Equal((ushort)1, capturedBatch.StaffId);
        Assert.Equal((byte)1, capturedBatch.StoreId);
        Assert.Equal(new ushort[] { 1, 2 }, capturedBatch.FilmIds);

        var created = Assert.Single(result);
        Assert.Equal((ushort)10, created.CustomerId);
        Assert.Equal("ACADEMY DINOSAUR", created.FilmTitle);
        Assert.False(created.Overdue);
    }

    [Fact]
    public async Task Create_ReturnsAllRowsOfTheBatch()
    {
        SetupSuccessfulCreate(
            new RentalBatchResult { RentalIds = [101, 102], UnavailableFilmIds = [] },
            new List<Rental>
            {
                SampleRental(101),
                new() { FilmId = 2, FilmTitle = "ACE GOLDFINGER" },
            });

        var result = await _service.CreateAsync(ValidCreateDto());

        Assert.Equal(2, result.Count);
        _rentalRepository.Verify(
            r => r.GetByIdsAsync(It.Is<IReadOnlyList<int>>(ids => ids.SequenceEqual(new[] { 101, 102 })), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    // --- Read --------------------------------------------------------------------

    [Fact]
    public async Task GetList_FlagsOpenRentalPastDueDateAsOverdue()
    {
        var overdue = SampleRental(1);
        overdue.DueDate = DateTime.Now.AddDays(-2);
        var returnedLate = SampleRental(2);
        returnedLate.DueDate = DateTime.Now.AddDays(-2);
        returnedLate.ReturnDate = DateTime.Now;

        _rentalRepository.Setup(r => r.GetAllAsync("mary", RentalListStatus.Open, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Rental> { overdue, returnedLate });

        var result = await _service.GetListAsync("mary", RentalListStatus.Open);

        Assert.Equal(2, result.Count);
        Assert.True(result[0].Overdue);
        Assert.False(result[1].Overdue);
        Assert.NotNull(result[1].ReturnDate);
    }

    [Fact]
    public async Task GetById_UnknownRental_ThrowsNotFound()
    {
        _rentalRepository.Setup(r => r.GetByIdAsync(404, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Rental?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetByIdAsync(404));
    }

    // --- Return ------------------------------------------------------------------

    [Fact]
    public async Task Return_UnknownRental_ThrowsNotFound()
    {
        _rentalRepository.Setup(r => r.GetByIdAsync(404, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Rental?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.ReturnAsync(404));
    }

    [Fact]
    public async Task Return_AlreadyReturned_ThrowsConflict()
    {
        var returned = SampleRental(101);
        returned.ReturnDate = DateTime.Now.AddHours(-1);
        _rentalRepository.Setup(r => r.GetByIdAsync(101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(returned);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.ReturnAsync(101));
        Assert.Contains("already returned", ex.Message);
        _rentalRepository.Verify(
            r => r.MarkReturnedAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Return_SetsReturnDateAndReturnsUpdatedDto()
    {
        _rentalRepository.Setup(r => r.GetByIdAsync(101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleRental(101));
        _rentalRepository.Setup(r => r.MarkReturnedAsync(101, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var dto = await _service.ReturnAsync(101);

        Assert.NotNull(dto.ReturnDate);
        Assert.False(dto.Overdue);
        _rentalRepository.Verify(
            r => r.MarkReturnedAsync(101, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Return_LostRaceAgainstAnotherOperator_ThrowsConflict()
    {
        _rentalRepository.Setup(r => r.GetByIdAsync(101, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleRental(101));
        // The row was open on read, but another operator returned it first.
        _rentalRepository.Setup(r => r.MarkReturnedAsync(101, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.ReturnAsync(101));
        Assert.Contains("already returned", ex.Message);
    }
}
