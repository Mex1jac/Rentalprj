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

    /// <summary>Filters shared by the full list, the paged list and the count.</summary>
    private const string WhereClause = """
        WHERE (@Active IS NULL OR c.active = @Active)
          AND (@Search IS NULL
               OR c.first_name LIKE @SearchPattern
               OR c.last_name LIKE @SearchPattern
               OR c.email LIKE @SearchPattern)
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
        var sql = BaseSelect + "\n" + WhereClause + "\nORDER BY c.last_name, c.first_name";

        var (normalizedSearch, searchPattern) = NormalizeSearch(search);
        var parameters = new
        {
            Active = active,
            Search = normalizedSearch,
            SearchPattern = searchPattern,
        };

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var customers = await connection.QueryAsync<Customer>(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return customers.ToList();
    }

    public async Task<int> CountAsync(string? search, bool? active, CancellationToken cancellationToken = default)
    {
        // The filters only touch customer columns, so no address join is needed.
        var sql = "SELECT COUNT(*) FROM customer c" + "\n" + WhereClause;

        var (normalizedSearch, searchPattern) = NormalizeSearch(search);
        var parameters = new
        {
            Active = active,
            Search = normalizedSearch,
            SearchPattern = searchPattern,
        };

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<Customer>> GetPageAsync(
        string? search,
        bool? active,
        int limit,
        int offset,
        CancellationToken cancellationToken = default)
    {
        var sql = BaseSelect
            + "\n" + WhereClause
            + "\nORDER BY c.last_name, c.first_name"
            + "\nLIMIT @Limit OFFSET @Offset";

        var (normalizedSearch, searchPattern) = NormalizeSearch(search);
        var parameters = new
        {
            Active = active,
            Search = normalizedSearch,
            SearchPattern = searchPattern,
            Limit = limit,
            Offset = offset,
        };

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var customers = await connection.QueryAsync<Customer>(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
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

    /// <summary>Normalized search term plus its escaped LIKE pattern.</summary>
    private static (string? Search, string? Pattern) NormalizeSearch(string? search)
    {
        var normalized = string.IsNullOrWhiteSpace(search) ? null : search.Trim();
        return (normalized, normalized is null ? null : $"%{EscapeLikePattern(normalized)}%");
    }
}
