using Moq;
using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Application.Services;
using RentalApp.Api.Domain.Entities;
using RentalApp.Api.Domain.Exceptions;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Tests.Application;

public class CustomerServiceTests
{
    private readonly Mock<ICustomerRepository> _customerRepository = new();
    private readonly Mock<ILookupRepository> _lookupRepository = new();
    private readonly Mock<IRentalRepository> _rentalRepository = new();
    private readonly CustomerService _service;

    public CustomerServiceTests()
    {
        _service = new CustomerService(_customerRepository.Object, _lookupRepository.Object, _rentalRepository.Object);

        _lookupRepository.Setup(r => r.AddressExistsAsync(It.IsAny<ushort>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _lookupRepository.Setup(r => r.StoreExistsAsync(It.IsAny<byte>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _rentalRepository.Setup(r => r.CountOpenRentalsAsync(It.IsAny<ushort>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
    }

    private static CustomerCreateDto ValidCreateDto() => new()
    {
        FirstName = "Mary",
        LastName = "Smith",
        Email = "mary@example.com",
        AddressId = 1,
        StoreId = 1,
    };

    private static Customer SampleCustomer(ushort customerId = 10) => new()
    {
        CustomerId = customerId,
        FirstName = "Mary",
        LastName = "Smith",
        Email = "mary@example.com",
        AddressId = 1,
        AddressDisplay = "47 MySakila Drive, Albertville",
        StoreId = 1,
        StoreDisplay = "Store 1",
        Active = true,
        CreateDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Unspecified),
    };

    // --- Create -----------------------------------------------------------------

    [Fact]
    public async Task Create_MarksNewCustomerAsActiveWithCreateDate()
    {
        Customer? savedCustomer = null;
        _customerRepository
            .Setup(r => r.CreateAsync(It.IsAny<Customer>(), It.IsAny<CancellationToken>()))
            .Callback<Customer, CancellationToken>((customer, _) => savedCustomer = customer)
            .ReturnsAsync((ushort)10);
        _customerRepository.Setup(r => r.GetByIdAsync((ushort)10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleCustomer());

        await _service.CreateAsync(ValidCreateDto());

        Assert.NotNull(savedCustomer);
        Assert.True(savedCustomer.Active);
        // sakila customer.create_date is NOT NULL without a default.
        Assert.InRange(savedCustomer.CreateDate, DateTime.Now.AddMinutes(-1), DateTime.Now.AddMinutes(1));
    }

    [Fact]
    public async Task Create_TrimsDataAndNormalizesEmptyEmailToNull()
    {
        Customer? savedCustomer = null;
        _customerRepository
            .Setup(r => r.CreateAsync(It.IsAny<Customer>(), It.IsAny<CancellationToken>()))
            .Callback<Customer, CancellationToken>((customer, _) => savedCustomer = customer)
            .ReturnsAsync((ushort)10);
        _customerRepository.Setup(r => r.GetByIdAsync((ushort)10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleCustomer());

        var dto = ValidCreateDto();
        dto.FirstName = "  Mary ";
        dto.LastName = " Smith ";
        dto.Email = "   ";
        await _service.CreateAsync(dto);

        Assert.NotNull(savedCustomer);
        Assert.Equal("Mary", savedCustomer.FirstName);
        Assert.Equal("Smith", savedCustomer.LastName);
        Assert.Null(savedCustomer.Email);
    }

    [Theory]
    [InlineData("", "Smith")]
    [InlineData("Mary", "")]
    public async Task Create_InvalidNames_ThrowsValidation(string firstName, string lastName)
    {
        var dto = ValidCreateDto();
        dto.FirstName = firstName;
        dto.LastName = lastName;

        await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        _customerRepository.Verify(r => r.CreateAsync(It.IsAny<Customer>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Create_EmailLongerThan50_ThrowsValidation()
    {
        var dto = ValidCreateDto();
        dto.Email = $"{new string('a', 49)}@x.com";

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        Assert.Equal("Email cannot exceed 50 characters.", ex.Message);
    }

    [Fact]
    public async Task Create_UnknownAddress_ThrowsValidation()
    {
        _lookupRepository.Setup(r => r.AddressExistsAsync(99, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        var dto = ValidCreateDto();
        dto.AddressId = 99;

        await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
    }

    [Fact]
    public async Task Create_UnknownStore_ThrowsValidation()
    {
        _lookupRepository.Setup(r => r.StoreExistsAsync(9, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        var dto = ValidCreateDto();
        dto.StoreId = 9;

        await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
    }

    // --- Read -------------------------------------------------------------------

    [Fact]
    public async Task GetList_MapsEntitiesToDtos_WithDisplayFields()
    {
        _customerRepository.Setup(r => r.GetAllAsync("mary", true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Customer> { SampleCustomer() });

        // No pageSize: the repository returns the full list in one envelope.
        var result = await _service.GetListAsync("mary", true);

        var item = Assert.Single(result.Items);
        Assert.Equal((ushort)10, item.CustomerId);
        Assert.Equal("47 MySakila Drive, Albertville", item.Address);
        Assert.Equal("Store 1", item.Store);
        Assert.True(item.Active);
        Assert.Equal(1, result.Page);
        Assert.Equal(1, result.PageSize);
        Assert.Equal(1, result.Total);
        Assert.Equal(1, result.TotalPages);
    }

    [Fact]
    public async Task GetList_WithPageSize_UsesCountAndSlice_AndBuildsEnvelope()
    {
        var pageRows = Enumerable.Range(20, 25).Select(id => SampleCustomer((ushort)id)).ToList();
        _customerRepository.Setup(r => r.CountAsync("mary", true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(551);
        _customerRepository.Setup(r => r.GetPageAsync("mary", true, 25, 25, It.IsAny<CancellationToken>()))
            .ReturnsAsync(pageRows);

        var result = await _service.GetListAsync("mary", true, page: 2, pageSize: 25);

        Assert.Equal(25, result.Items.Count);
        Assert.Equal(2, result.Page);
        Assert.Equal(25, result.PageSize);
        Assert.Equal(551, result.Total);
        Assert.Equal(23, result.TotalPages); // ceil(551 / 25)
        _customerRepository.Verify(r => r.GetPageAsync("mary", true, 25, 25, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetList_PageOutsideTheResult_ReturnsEmptyPage()
    {
        _customerRepository.Setup(r => r.CountAsync(null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(30);
        _customerRepository.Setup(r => r.GetPageAsync(null, null, 10, 100, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Customer>());

        var result = await _service.GetListAsync(null, null, page: 11, pageSize: 10);

        Assert.Empty(result.Items);
        Assert.Equal(11, result.Page);
        Assert.Equal(3, result.TotalPages);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task GetList_PageBelowOne_ThrowsValidation(int page)
    {
        await Assert.ThrowsAsync<ValidationException>(
            () => _service.GetListAsync(null, null, page: page, pageSize: 10));
    }

    [Theory]
    [InlineData(5)]
    [InlineData(500)]
    public async Task GetList_PageSizeOutsideAllowlist_ThrowsValidation(int pageSize)
    {
        var exception = await Assert.ThrowsAsync<ValidationException>(
            () => _service.GetListAsync(null, null, page: 1, pageSize: pageSize));
        Assert.Contains("Page size must be one of", exception.Message);
    }

    [Fact]
    public async Task GetList_PageAboveOneWithoutPageSize_ThrowsValidation()
    {
        await Assert.ThrowsAsync<ValidationException>(
            () => _service.GetListAsync(null, null, page: 2, pageSize: null));
    }

    [Fact]
    public async Task GetById_UnknownCustomer_ThrowsNotFound()
    {
        _customerRepository.Setup(r => r.GetByIdAsync((ushort)404, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Customer?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetByIdAsync((ushort)404));
    }

    // --- Update -----------------------------------------------------------------

    [Fact]
    public async Task Update_UnknownCustomer_ThrowsNotFound()
    {
        _customerRepository.Setup(r => r.GetByIdAsync((ushort)9, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Customer?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.UpdateAsync((ushort)9, new CustomerUpdateDto
        {
            FirstName = "Mary",
            LastName = "Smith",
            Email = null,
            AddressId = 1,
            StoreId = 1,
        }));
    }

    [Fact]
    public async Task Update_PersistsTrimmedData()
    {
        Customer? updatedCustomer = null;
        _customerRepository.Setup(r => r.GetByIdAsync((ushort)10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleCustomer());
        _customerRepository.Setup(r => r.UpdateAsync(It.IsAny<Customer>(), It.IsAny<CancellationToken>()))
            .Callback<Customer, CancellationToken>((customer, _) => updatedCustomer = customer)
            .ReturnsAsync(true);

        var dto = new CustomerUpdateDto
        {
            FirstName = "  Maria ",
            LastName = " Smith",
            Email = " maria@example.com ",
            AddressId = 2,
            StoreId = 1,
        };

        await _service.UpdateAsync((ushort)10, dto);

        Assert.NotNull(updatedCustomer);
        Assert.Equal("Maria", updatedCustomer.FirstName);
        Assert.Equal("Smith", updatedCustomer.LastName);
        Assert.Equal("maria@example.com", updatedCustomer.Email);
        Assert.Equal((ushort)2, updatedCustomer.AddressId);
    }

    // --- Logical leave ----------------------------------------------------------

    [Fact]
    public async Task SetActive_False_DeactivatesCustomer()
    {
        _customerRepository.Setup(r => r.SetActiveAsync((ushort)10, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var status = await _service.SetActiveAsync((ushort)10, false);

        Assert.Equal((ushort)10, status.CustomerId);
        Assert.False(status.Active);
        _customerRepository.Verify(r => r.SetActiveAsync((ushort)10, false, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SetActive_UnknownCustomer_ThrowsNotFound()
    {
        _customerRepository.Setup(r => r.SetActiveAsync((ushort)9, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.SetActiveAsync((ushort)9, false));
    }

    [Fact]
    public async Task SetActive_FalseWithOpenRentals_ThrowsConflict()
    {
        _rentalRepository.Setup(r => r.CountOpenRentalsAsync((ushort)10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(3);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.SetActiveAsync((ushort)10, false));

        Assert.Contains("3 open rentals", ex.Message);
        _customerRepository.Verify(r => r.SetActiveAsync(It.IsAny<ushort>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SetActive_FalseWithSingleOpenRental_UsesSingularWording()
    {
        _rentalRepository.Setup(r => r.CountOpenRentalsAsync((ushort)10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.SetActiveAsync((ushort)10, false));

        Assert.Contains("1 open rental", ex.Message);
        Assert.DoesNotContain("open rentals", ex.Message);
    }

    [Fact]
    public async Task SetActive_True_ReactivatesEvenWithOpenRentals()
    {
        // The open-rental rule only blocks deactivation, never reactivation.
        _rentalRepository.Setup(r => r.CountOpenRentalsAsync((ushort)10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(2);
        _customerRepository.Setup(r => r.SetActiveAsync((ushort)10, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var status = await _service.SetActiveAsync((ushort)10, true);

        Assert.True(status.Active);
        _customerRepository.Verify(r => r.SetActiveAsync((ushort)10, true, It.IsAny<CancellationToken>()), Times.Once);
    }
}
