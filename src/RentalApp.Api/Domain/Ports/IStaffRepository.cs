using RentalApp.Api.Domain.Entities;

namespace RentalApp.Api.Domain.Ports;

/// <summary>
/// Persistence port for the staff table. Passwords are write-only values:
/// they are received as an already-hashed string on create/change and are
/// never selected back (requirement FR-1).
/// </summary>
public interface IStaffRepository
{
    Task<IReadOnlyList<Staff>> GetAllAsync(string? search, bool? active, CancellationToken cancellationToken = default);

    Task<Staff?> GetByIdAsync(ushort staffId, CancellationToken cancellationToken = default);

    Task<ushort> CreateAsync(Staff staff, string passwordHash, CancellationToken cancellationToken = default);

    Task<bool> UpdateAsync(Staff staff, CancellationToken cancellationToken = default);

    Task<bool> UpdatePasswordAsync(ushort staffId, string passwordHash, CancellationToken cancellationToken = default);

    Task<bool> SetActiveAsync(ushort staffId, bool active, CancellationToken cancellationToken = default);

    Task<bool> UsernameExistsAsync(string username, ushort? excludeStaffId = null, CancellationToken cancellationToken = default);
}
