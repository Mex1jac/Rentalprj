using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Domain.Entities;
using RentalApp.Api.Domain.Exceptions;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Api.Application.Services;

/// <summary>
/// Use cases for the staff maintenance page: list, create, edit, change
/// password and logical leave (activate/deactivate).
/// </summary>
public class StaffService
{
    private readonly IStaffRepository _staffRepository;
    private readonly ILookupRepository _lookupRepository;
    private readonly IPasswordHasher _passwordHasher;

    public StaffService(
        IStaffRepository staffRepository,
        ILookupRepository lookupRepository,
        IPasswordHasher passwordHasher)
    {
        _staffRepository = staffRepository;
        _lookupRepository = lookupRepository;
        _passwordHasher = passwordHasher;
    }

    public async Task<IReadOnlyList<StaffDto>> GetListAsync(
        string? search,
        bool? active,
        CancellationToken cancellationToken = default)
    {
        var staff = await _staffRepository.GetAllAsync(search, active, cancellationToken);
        return staff.Select(MapToDto).ToList();
    }

    public async Task<StaffDto> GetByIdAsync(ushort staffId, CancellationToken cancellationToken = default)
    {
        var staff = await _staffRepository.GetByIdAsync(staffId, cancellationToken);
        if (staff is null)
        {
            throw new NotFoundException($"Staff with id {staffId} was not found.");
        }

        return MapToDto(staff);
    }

    public async Task<StaffDto> CreateAsync(StaffCreateDto dto, CancellationToken cancellationToken = default)
    {
        ValidateBasicData(dto.FirstName, dto.LastName, dto.Username, dto.Email);

        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
        {
            throw new ValidationException("Password must be at least 6 characters long.");
        }

        if (await _staffRepository.UsernameExistsAsync(dto.Username, cancellationToken: cancellationToken))
        {
            throw new ConflictException($"Username '{dto.Username}' is already in use.");
        }

        await EnsureForeignKeysExistAsync(dto.AddressId, dto.StoreId, cancellationToken);

        var staff = new Staff
        {
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            Email = NormalizeEmail(dto.Email),
            AddressId = dto.AddressId,
            StoreId = dto.StoreId,
            Username = dto.Username.Trim(),
            Active = true,
        };

        // The clear password never reaches persistence: only its hash does.
        var passwordHash = _passwordHasher.Hash(dto.Password);
        var staffId = await _staffRepository.CreateAsync(staff, passwordHash, cancellationToken);

        return await GetByIdAsync(staffId, cancellationToken);
    }

    public async Task<StaffDto> UpdateAsync(ushort staffId, StaffUpdateDto dto, CancellationToken cancellationToken = default)
    {
        ValidateBasicData(dto.FirstName, dto.LastName, dto.Username, dto.Email);

        var existing = await _staffRepository.GetByIdAsync(staffId, cancellationToken)
            ?? throw new NotFoundException($"Staff with id {staffId} was not found.");

        if (await _staffRepository.UsernameExistsAsync(dto.Username, staffId, cancellationToken))
        {
            throw new ConflictException($"Username '{dto.Username}' is already in use.");
        }

        await EnsureForeignKeysExistAsync(dto.AddressId, dto.StoreId, cancellationToken);

        existing.FirstName = dto.FirstName.Trim();
        existing.LastName = dto.LastName.Trim();
        existing.Email = NormalizeEmail(dto.Email);
        existing.AddressId = dto.AddressId;
        existing.StoreId = dto.StoreId;
        existing.Username = dto.Username.Trim();

        await _staffRepository.UpdateAsync(existing, cancellationToken);

        return await GetByIdAsync(staffId, cancellationToken);
    }

    public async Task ChangePasswordAsync(
        ushort staffId,
        StaffPasswordUpdateDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
        {
            throw new ValidationException("Password must be at least 6 characters long.");
        }

        _ = await _staffRepository.GetByIdAsync(staffId, cancellationToken)
            ?? throw new NotFoundException($"Staff with id {staffId} was not found.");

        // Hashed before persistence; the API never returns the stored value (FR-1).
        // Passwords do not expire and can only be changed for an existing user (FR-2).
        var passwordHash = _passwordHasher.Hash(dto.NewPassword);
        await _staffRepository.UpdatePasswordAsync(staffId, passwordHash, cancellationToken);
    }

    public async Task<StaffStatusDto> SetActiveAsync(
        ushort staffId,
        bool active,
        CancellationToken cancellationToken = default)
    {
        var exists = await _staffRepository.SetActiveAsync(staffId, active, cancellationToken);
        if (!exists)
        {
            throw new NotFoundException($"Staff with id {staffId} was not found.");
        }

        return new StaffStatusDto { StaffId = staffId, Active = active };
    }

    private static void ValidateBasicData(
        string firstName,
        string lastName,
        string username,
        string? email)
    {
        if (string.IsNullOrWhiteSpace(firstName) || firstName.Trim().Length > 45)
        {
            throw new ValidationException("First name is required and cannot exceed 45 characters.");
        }

        if (string.IsNullOrWhiteSpace(lastName) || lastName.Trim().Length > 45)
        {
            throw new ValidationException("Last name is required and cannot exceed 45 characters.");
        }

        if (string.IsNullOrWhiteSpace(username) || username.Trim().Length > 16)
        {
            throw new ValidationException("Username is required and cannot exceed 16 characters.");
        }

        if (!string.IsNullOrWhiteSpace(email) && email.Trim().Length > 50)
        {
            throw new ValidationException("Email cannot exceed 50 characters.");
        }
    }

    private async Task EnsureForeignKeysExistAsync(
        ushort addressId,
        byte storeId,
        CancellationToken cancellationToken)
    {
        if (!await _lookupRepository.AddressExistsAsync(addressId, cancellationToken))
        {
            throw new ValidationException($"Address with id {addressId} does not exist.");
        }

        if (!await _lookupRepository.StoreExistsAsync(storeId, cancellationToken))
        {
            throw new ValidationException($"Store with id {storeId} does not exist.");
        }
    }

    private static string? NormalizeEmail(string? email) =>
        string.IsNullOrWhiteSpace(email) ? null : email.Trim();

    private static StaffDto MapToDto(Staff staff) => new()
    {
        StaffId = staff.StaffId,
        FirstName = staff.FirstName,
        LastName = staff.LastName,
        Email = staff.Email,
        AddressId = staff.AddressId,
        Address = staff.AddressDisplay,
        StoreId = staff.StoreId,
        Store = staff.StoreDisplay,
        Active = staff.Active,
        Username = staff.Username,
    };
}
