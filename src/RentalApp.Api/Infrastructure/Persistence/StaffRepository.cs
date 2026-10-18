using Dapper;
using RentalApp.Api.Domain.Entities;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Api.Infrastructure.Persistence;

/// <summary>
/// Dapper adapter for the sakila.staff table.
/// The password column is never selected: reads cannot expose it (FR-1).
/// It is only written on create and on password change, always hashed.
/// </summary>
public class StaffRepository : IStaffRepository
{
    private const string BaseSelect = """
        SELECT s.staff_id AS StaffId,
               s.first_name AS FirstName,
               s.last_name AS LastName,
               s.address_id AS AddressId,
               s.email AS Email,
               s.store_id AS StoreId,
               s.active AS Active,
               s.username AS Username,
               CONCAT(a.address, ', ', ci.city) AS AddressDisplay,
               CONCAT('Store ', s.store_id) AS StoreDisplay
        FROM staff s
        JOIN address a ON a.address_id = s.address_id
        JOIN city ci ON ci.city_id = a.city_id
        """;

    private readonly MySqlConnectionFactory _connectionFactory;

    public StaffRepository(MySqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<Staff>> GetAllAsync(
        string? search,
        bool? active,
        CancellationToken cancellationToken = default)
    {
        var sql = BaseSelect + "\n" + """
            WHERE (@Active IS NULL OR s.active = @Active)
              AND (@Search IS NULL
                   OR s.username LIKE @SearchPattern
                   OR s.first_name LIKE @SearchPattern
                   OR s.last_name LIKE @SearchPattern
                   OR s.email LIKE @SearchPattern)
            ORDER BY s.last_name, s.first_name
            """;

        var normalizedSearch = string.IsNullOrWhiteSpace(search) ? null : search.Trim();
        var parameters = new
        {
            Active = active,
            Search = normalizedSearch,
            SearchPattern = normalizedSearch is null ? null : $"%{EscapeLikePattern(normalizedSearch)}%",
        };

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var staff = await connection.QueryAsync<Staff>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return staff.ToList();
    }

    public async Task<Staff?> GetByIdAsync(ushort staffId, CancellationToken cancellationToken = default)
    {
        var sql = BaseSelect + "\n WHERE s.staff_id = @StaffId";

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<Staff>(
            new CommandDefinition(sql, new { StaffId = staffId }, cancellationToken: cancellationToken));
    }

    public async Task<ushort> CreateAsync(Staff staff, string passwordHash, CancellationToken cancellationToken = default)
    {
        var sql = """
            INSERT INTO staff (first_name, last_name, address_id, email, store_id, active, username, password)
            VALUES (@FirstName, @LastName, @AddressId, @Email, @StoreId, @Active, @Username, @PasswordHash);
            SELECT LAST_INSERT_ID();
            """;

        var parameters = new
        {
            staff.FirstName,
            staff.LastName,
            staff.AddressId,
            staff.Email,
            staff.StoreId,
            staff.Active,
            staff.Username,
            PasswordHash = passwordHash,
        };

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var newId = await connection.ExecuteScalarAsync<ulong>(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return (ushort)newId;
    }

    public async Task<bool> UpdateAsync(Staff staff, CancellationToken cancellationToken = default)
    {
        // The password column is not part of this update: it has its own endpoint.
        var sql = """
            UPDATE staff
            SET first_name = @FirstName,
                last_name = @LastName,
                address_id = @AddressId,
                email = @Email,
                store_id = @StoreId,
                username = @Username
            WHERE staff_id = @StaffId
            """;

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var affectedRows = await connection.ExecuteAsync(
            new CommandDefinition(sql, staff, cancellationToken: cancellationToken));
        return affectedRows > 0;
    }

    public async Task<bool> UpdatePasswordAsync(ushort staffId, string passwordHash, CancellationToken cancellationToken = default)
    {
        var sql = "UPDATE staff SET password = @PasswordHash WHERE staff_id = @StaffId";

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var affectedRows = await connection.ExecuteAsync(
            new CommandDefinition(sql, new { StaffId = staffId, PasswordHash = passwordHash }, cancellationToken: cancellationToken));
        return affectedRows > 0;
    }

    public async Task<bool> SetActiveAsync(ushort staffId, bool active, CancellationToken cancellationToken = default)
    {
        var sql = "UPDATE staff SET active = @Active WHERE staff_id = @StaffId";

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var affectedRows = await connection.ExecuteAsync(
            new CommandDefinition(sql, new { StaffId = staffId, Active = active }, cancellationToken: cancellationToken));
        return affectedRows > 0;
    }

    public async Task<bool> UsernameExistsAsync(
        string username,
        ushort? excludeStaffId = null,
        CancellationToken cancellationToken = default)
    {
        var sql = """
            SELECT COUNT(*)
            FROM staff
            WHERE username = @Username
              AND (@ExcludeStaffId IS NULL OR staff_id <> @ExcludeStaffId)
            """;

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var count = await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { Username = username, ExcludeStaffId = excludeStaffId }, cancellationToken: cancellationToken));
        return count > 0;
    }

    /// <summary>Escapes LIKE wildcards so user input is matched literally.</summary>
    private static string EscapeLikePattern(string value) =>
        value.Replace("%", "\\%").Replace("_", "\\_");
}
