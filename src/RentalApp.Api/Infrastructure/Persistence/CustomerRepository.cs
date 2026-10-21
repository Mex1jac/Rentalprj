using Dapper;
using RentalApp.Api.Domain.Entities;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Api.Infrastructure.Persistence;

/// <summary>Dapper adapter for the sakila.customer table.</summary>
public class CustomerRepository : ICustomerRepository
{
    private const string BaseSelect = """
        SELECT c.customer_id AS CustomerId,
               c.store_id AS StoreId,
               c.first_name AS FirstName,
               c.last_name AS LastName,
               c.email AS Email,
               c.address_id AS AddressId,
               c.active AS Active,
               CONCAT(a.address, ', ', ci.city) AS AddressDisplay,
               CONCAT('Store ', c.store_id) AS StoreDisplay
        FROM customer c
        JOIN address a ON a.address_id = c.address_id
        JOIN city ci ON ci.city_id = a.city_id
        """;

    private readonly MySqlConnectionFactory _connectionFactory;

    public CustomerRepository(MySqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<Customer>> GetAllAsync(
        string? search,
        bool? active,
        CancellationToken cancellationToken = default)
    {
        var sql = BaseSelect + "\n" + """
            WHERE (@Active IS NULL OR c.active = @Active)
              AND (@Search IS NULL
                   OR c.first_name LIKE @SearchPattern
                   OR c.last_name LIKE @SearchPattern
                   OR c.email LIKE @SearchPattern)
            ORDER BY c.last_name, c.first_name
            """;

        var normalizedSearch = string.IsNullOrWhiteSpace(search) ? null : search.Trim();
        var parameters = new
        {
            Active = active,
            Search = normalizedSearch,
            SearchPattern = normalizedSearch is null ? null : $"%{EscapeLikePattern(normalizedSearch)}%",
        };

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var customers = await connection.QueryAsync<Customer>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return customers.ToList();
    }

    public async Task<Customer?> GetByIdAsync(ushort customerId, CancellationToken cancellationToken = default)
    {
        var sql = BaseSelect + "\n WHERE c.customer_id = @CustomerId";

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<Customer>(
            new CommandDefinition(sql, new { CustomerId = customerId }, cancellationToken: cancellationToken));
    }

    public async Task<ushort> CreateAsync(Customer customer, CancellationToken cancellationToken = default)
    {
        // create_date is NOT NULL without a default in sakila, so it is always provided.
        var sql = """
            INSERT INTO customer (store_id, first_name, last_name, email, address_id, active, create_date)
            VALUES (@StoreId, @FirstName, @LastName, @Email, @AddressId, @Active, @CreateDate);
            SELECT LAST_INSERT_ID();
            """;

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var newId = await connection.ExecuteScalarAsync<ulong>(
            new CommandDefinition(sql, customer, cancellationToken: cancellationToken));
        return (ushort)newId;
    }

    public async Task<bool> UpdateAsync(Customer customer, CancellationToken cancellationToken = default)
    {
        var sql = """
            UPDATE customer
            SET first_name = @FirstName,
                last_name = @LastName,
                email = @Email,
                address_id = @AddressId,
                store_id = @StoreId
            WHERE customer_id = @CustomerId
            """;

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var affectedRows = await connection.ExecuteAsync(
            new CommandDefinition(sql, customer, cancellationToken: cancellationToken));
        return affectedRows > 0;
    }

    public async Task<bool> SetActiveAsync(ushort customerId, bool active, CancellationToken cancellationToken = default)
    {
        var sql = "UPDATE customer SET active = @Active WHERE customer_id = @CustomerId";

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var affectedRows = await connection.ExecuteAsync(
            new CommandDefinition(sql, new { CustomerId = customerId, Active = active }, cancellationToken: cancellationToken));
        return affectedRows > 0;
    }

    /// <summary>Escapes LIKE wildcards so user input is matched literally.</summary>
    private static string EscapeLikePattern(string value) =>
        value.Replace("%", "\\%").Replace("_", "\\_");
}
