using Moq;
using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Application.Services;
using RentalApp.Api.Domain.Entities;
using RentalApp.Api.Domain.Exceptions;
using RentalApp.Api.Domain.Ports;
using RentalApp.Api.Infrastructure.Security;

namespace RentalApp.Tests.Application;

public class StaffServiceTests
{
    private readonly Mock<IStaffRepository> _staffRepository = new();
    private readonly Mock<ILookupRepository> _lookupRepository = new();
    private readonly Sha1PasswordHasher _passwordHasher = new();
    private readonly StaffService _service;

    public StaffServiceTests()
    {
        _service = new StaffService(_staffRepository.Object, _lookupRepository.Object, _passwordHasher);

        _lookupRepository.Setup(r => r.AddressExistsAsync(It.IsAny<ushort>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _lookupRepository.Setup(r => r.StoreExistsAsync(It.IsAny<byte>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
    }

    private static StaffCreateDto ValidCreateDto() => new()
    {
        FirstName = "John",
        LastName = "Doe",
        Email = "john@example.com",
        AddressId = 1,
        StoreId = 1,
        Username = "jdoe",
        Password = "secret123",
    };

    private static Staff SampleStaff(ushort staffId = 7) => new()
    {
        StaffId = staffId,
        FirstName = "John",
        LastName = "Doe",
        Email = "john@example.com",
        AddressId = 1,
        AddressDisplay = "47 MySakila Drive, Albertville",
        StoreId = 1,
        StoreDisplay = "Store 1 - 47 MySakila Drive, Albertville",
        Active = true,
        Username = "jdoe",
    };

    // --- Create -----------------------------------------------------------------

    [Fact]
    public async Task Create_HashesPasswordBeforeSaving_NeverSendsClearPassword()
    {
        string? capturedHash = null;
        _staffRepository
            .Setup(r => r.CreateAsync(It.IsAny<Staff>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback<Staff, string, CancellationToken>((_, hash, _) => capturedHash = hash)
            .ReturnsAsync((ushort)7);
        _staffRepository.Setup(r => r.GetByIdAsync((ushort)7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleStaff());

        await _service.CreateAsync(ValidCreateDto());

        Assert.NotNull(capturedHash);
        Assert.Equal(_passwordHasher.Hash("secret123"), capturedHash);
        Assert.NotEqual("secret123", capturedHash);
    }

    [Fact]
    public async Task Create_ReturnedDtoHasNoPasswordField()
    {
        _staffRepository.Setup(r => r.CreateAsync(It.IsAny<Staff>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((ushort)7);
        _staffRepository.Setup(r => r.GetByIdAsync((ushort)7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleStaff());

        var dto = await _service.CreateAsync(ValidCreateDto());

        // StaffDto has no Password property by design (FR-1): the response
        // contains username and status only, never a secret.
        Assert.Equal("jdoe", dto.Username);
        Assert.DoesNotContain(dto.GetType().GetProperties(), p => p.Name.Contains("Password"));
    }

    [Fact]
    public async Task Create_DuplicatedUsername_ThrowsConflict()
    {
        _staffRepository.Setup(r => r.UsernameExistsAsync("jdoe", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _service.CreateAsync(ValidCreateDto()));

        Assert.Contains("jdoe", ex.Message);
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

    [Theory]
    [InlineData("", "Doe", "jdoe", "secret123")]
    [InlineData("John", "", "jdoe", "secret123")]
    [InlineData("John", "Doe", "", "secret123")]
    [InlineData("John", "Doe", "jdoe", "12345")]
    public async Task Create_InvalidData_ThrowsValidation(
        string firstName,
        string lastName,
        string username,
        string password)
    {
        var dto = new StaffCreateDto
        {
            FirstName = firstName,
            LastName = lastName,
            Email = null,
            AddressId = 1,
            StoreId = 1,
            Username = username,
            Password = password,
        };

        await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(dto));
        _staffRepository.Verify(
            r => r.CreateAsync(It.IsAny<Staff>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Create_MarksNewStaffAsActive()
    {
        Staff? savedStaff = null;
        _staffRepository
            .Setup(r => r.CreateAsync(It.IsAny<Staff>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback<Staff, string, CancellationToken>((staff, _, _) => savedStaff = staff)
            .ReturnsAsync((ushort)7);
        _staffRepository.Setup(r => r.GetByIdAsync((ushort)7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleStaff());

        await _service.CreateAsync(ValidCreateDto());

        Assert.NotNull(savedStaff);
        Assert.True(savedStaff.Active);
    }

    // --- Read -------------------------------------------------------------------

    [Fact]
    public async Task GetList_MapsEntitiesToDtos_WithDisplayFields()
    {
        _staffRepository.Setup(r => r.GetAllAsync("john", true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Staff> { SampleStaff() });

        var result = await _service.GetListAsync("john", true);

        var item = Assert.Single(result);
        Assert.Equal((ushort)7, item.StaffId);
        Assert.Equal("47 MySakila Drive, Albertville", item.Address);
        Assert.Equal("Store 1 - 47 MySakila Drive, Albertville", item.Store);
        Assert.True(item.Active);
    }

    [Fact]
    public async Task GetById_UnknownStaff_ThrowsNotFound()
    {
        _staffRepository.Setup(r => r.GetByIdAsync((ushort)404, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Staff?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetByIdAsync((ushort)404));
    }

    // --- Update -----------------------------------------------------------------

    [Fact]
    public async Task Update_UnknownStaff_ThrowsNotFound()
    {
        _staffRepository.Setup(r => r.GetByIdAsync((ushort)9, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Staff?)null);
        var dto = new StaffUpdateDto
        {
            FirstName = "John",
            LastName = "Doe",
            Email = null,
            AddressId = 1,
            StoreId = 1,
            Username = "jdoe",
        };

        await Assert.ThrowsAsync<NotFoundException>(() => _service.UpdateAsync((ushort)9, dto));
    }

    [Fact]
    public async Task Update_DuplicatedUsernameOnAnotherStaff_ThrowsConflict()
    {
        _staffRepository.Setup(r => r.GetByIdAsync((ushort)7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleStaff());
        _staffRepository.Setup(r => r.UsernameExistsAsync("otherUser", (ushort)7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var dto = new StaffUpdateDto
        {
            FirstName = "John",
            LastName = "Doe",
            Email = null,
            AddressId = 1,
            StoreId = 1,
            Username = "otherUser",
        };

        await Assert.ThrowsAsync<ConflictException>(() => _service.UpdateAsync((ushort)7, dto));
    }

    [Fact]
    public async Task Update_PersistsTrimmedData()
    {
        Staff? updatedStaff = null;
        _staffRepository.Setup(r => r.GetByIdAsync((ushort)7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleStaff());
        _staffRepository.Setup(r => r.UpdateAsync(It.IsAny<Staff>(), It.IsAny<CancellationToken>()))
            .Callback<Staff, CancellationToken>((staff, _) => updatedStaff = staff)
            .ReturnsAsync(true);
        _staffRepository.Setup(r => r.UsernameExistsAsync(It.IsAny<string>(), It.IsAny<ushort?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _staffRepository.Setup(r => r.GetByIdAsync((ushort)7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleStaff());
        var dto = new StaffUpdateDto
        {
            FirstName = "  Jane ",
            LastName = " Smith",
            Email = " jane@example.com ",
            AddressId = 2,
            StoreId = 1,
            Username = " jsmith ",
        };

        await _service.UpdateAsync((ushort)7, dto);

        Assert.NotNull(updatedStaff);
        Assert.Equal("Jane", updatedStaff.FirstName);
        Assert.Equal("Smith", updatedStaff.LastName);
        Assert.Equal("jane@example.com", updatedStaff.Email);
        Assert.Equal("jsmith", updatedStaff.Username);
    }

    // --- Password (FR-1 / FR-2) -------------------------------------------------

    [Fact]
    public async Task ChangePassword_StoresHash_NeverTheClearPassword()
    {
        string? capturedHash = null;
        _staffRepository.Setup(r => r.GetByIdAsync((ushort)7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleStaff());
        _staffRepository
            .Setup(r => r.UpdatePasswordAsync((ushort)7, It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback<ushort, string, CancellationToken>((_, hash, _) => capturedHash = hash)
            .ReturnsAsync(true);

        await _service.ChangePasswordAsync((ushort)7, new StaffPasswordUpdateDto { NewPassword = "newSecret9" });

        Assert.NotNull(capturedHash);
        Assert.Equal(_passwordHasher.Hash("newSecret9"), capturedHash);
        Assert.NotEqual("newSecret9", capturedHash);
    }

    [Fact]
    public async Task ChangePassword_UnknownStaff_ThrowsNotFound()
    {
        _staffRepository.Setup(r => r.GetByIdAsync((ushort)9, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Staff?)null);

        await Assert.ThrowsAsync<NotFoundException>(
            () => _service.ChangePasswordAsync((ushort)9, new StaffPasswordUpdateDto { NewPassword = "newSecret9" }));
    }

    [Theory]
    [InlineData("")]
    [InlineData("12345")]
    public async Task ChangePassword_TooShort_ThrowsValidation(string newPassword)
    {
        await Assert.ThrowsAsync<ValidationException>(
            () => _service.ChangePasswordAsync((ushort)7, new StaffPasswordUpdateDto { NewPassword = newPassword }));
        _staffRepository.Verify(
            r => r.UpdatePasswordAsync(It.IsAny<ushort>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    // --- Logical leave ----------------------------------------------------------

    [Fact]
    public async Task SetActive_False_DeactivatesStaff()
    {
        _staffRepository.Setup(r => r.SetActiveAsync((ushort)7, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var status = await _service.SetActiveAsync((ushort)7, false);

        Assert.Equal((ushort)7, status.StaffId);
        Assert.False(status.Active);
        _staffRepository.Verify(r => r.SetActiveAsync((ushort)7, false, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SetActive_UnknownStaff_ThrowsNotFound()
    {
        _staffRepository.Setup(r => r.SetActiveAsync((ushort)9, It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.SetActiveAsync((ushort)9, false));
    }
}
