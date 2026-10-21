using Dapper;
using RentalApp.Api.Domain.Entities;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Api.Infrastructure.Persistence;

/// <summary>
/// Dapper adapter for the sakila.rental table. Batch creation assigns one
/// physical copy (inventory row) per film inside a single transaction: the
/// candidate copy is locked with FOR UPDATE so two operators can never rent
/// the same copy.
/// </summary>
public class RentalRepository : IRentalRepository
{
    private const string BaseSelect = """
        SELECT r.rental_id AS RentalId,
               r.rental_date AS RentalDate,
               r.due_date AS DueDate,
               r.return_date AS ReturnDate,
               r.customer_id AS CustomerId,
               CONCAT(c.first_name, ' ', c.last_name) AS CustomerName,
               i.store_id AS StoreId,
               CONCAT('Store ', i.store_id) AS StoreDisplay,
               CONCAT(s.first_name, ' ', s.last_name) AS StaffName,
               f.film_id AS FilmId,
               f.title AS FilmTitle,
               r.inventory_id AS InventoryId
        FROM rental r
        JOIN customer c ON c.customer_id = r.customer_id
        JOIN inventory i ON i.inventory_id = r.inventory_id
        JOIN film f ON f.film_id = i.film_id
        JOIN staff s ON s.staff_id = r.staff_id
        """;

    /// <summary>Copies of a film at a store that have no open rental.</summary>
    private const string AvailableCopyQuery = """
        SELECT i.inventory_id
        FROM inventory i
        LEFT JOIN rental r ON r.inventory_id = i.inventory_id AND r.return_date IS NULL
        WHERE i.film_id = @FilmId
          AND i.store_id = @StoreId
          AND r.rental_id IS NULL
        """;

    private readonly MySqlConnectionFactory _connectionFactory;

    public RentalRepository(MySqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<Rental>> GetAllAsync(
        string? search,
        RentalListStatus status,
        CancellationToken cancellationToken = default)
    {
        var conditions = new List<string>
        {
            @"(@Search IS NULL
               OR c.first_name LIKE @SearchPattern
               OR c.last_name LIKE @SearchPattern
               OR f.title LIKE @SearchPattern)",
        };

        // The status comes from our own enum (never raw user input), so these
        // clauses are safe to inline.
        switch (status)
        {
            case RentalListStatus.Open:
                conditions.Add("r.return_date IS NULL");
                break;
            case RentalListStatus.Returned:
                conditions.Add("r.return_date IS NOT NULL");
                break;
        }

        // Bounded response: sakila ships 16k+ rentals, the list is for tracking.
        var sql = BaseSelect
            + "\nWHERE " + string.Join("\n  AND ", conditions)
            + "\nORDER BY r.rental_date DESC, r.rental_id DESC"
            + "\nLIMIT 500";

        var normalizedSearch = string.IsNullOrWhiteSpace(search) ? null : search.Trim();
        var parameters = new
        {
            Search = normalizedSearch,
            SearchPattern = normalizedSearch is null ? null : $"%{EscapeLikePattern(normalizedSearch)}%",
        };

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var rentals = await connection.QueryAsync<Rental>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rentals.ToList();
    }

    public async Task<Rental?> GetByIdAsync(int rentalId, CancellationToken cancellationToken = default)
    {
        var sql = BaseSelect + "\n WHERE r.rental_id = @RentalId";

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<Rental>(
            new CommandDefinition(sql, new { RentalId = rentalId }, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<Rental>> GetByIdsAsync(IReadOnlyList<int> rentalIds, CancellationToken cancellationToken = default)
    {
        if (rentalIds.Count == 0)
        {
            return [];
        }

        var sql = BaseSelect + "\n WHERE r.rental_id IN @RentalIds ORDER BY r.rental_id";

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var rentals = await connection.QueryAsync<Rental>(
            new CommandDefinition(sql, new { RentalIds = rentalIds }, cancellationToken: cancellationToken));
        return rentals.ToList();
    }

    public async Task<RentalBatchResult> CreateAsync(RentalBatch batch, CancellationToken cancellationToken = default)
    {
        const string insertSql = """
            INSERT INTO rental (rental_date, due_date, inventory_id, customer_id, staff_id)
            VALUES (@RentalDate, @DueDate, @InventoryId, @CustomerId, @StaffId);
            SELECT LAST_INSERT_ID();
            """;

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        var rentalIds = new List<int>();
        var unavailableFilmIds = new List<ushort>();
        var assignedInventoryIds = new List<uint>();

        foreach (var filmId in batch.FilmIds)
        {
            // Copies already assigned inside this batch are excluded explicitly:
            // their rental rows are not committed yet. The values are numeric
            // ids read from the database itself, so concatenating them is safe.
            var assignedCondition = assignedInventoryIds.Count == 0
                ? string.Empty
                : "\n  AND i.inventory_id NOT IN (" + string.Join(", ", assignedInventoryIds) + ")";

            var selectSql = AvailableCopyQuery
                + assignedCondition
                + "\nORDER BY i.inventory_id"
                + "\nLIMIT 1"
                + "\nFOR UPDATE";

            var inventoryId = await connection.ExecuteScalarAsync<uint?>(
                new CommandDefinition(
                    selectSql,
                    new { batch.StoreId, FilmId = filmId },
                    transaction,
                    cancellationToken: cancellationToken));

            if (inventoryId is null)
            {
                unavailableFilmIds.Add(filmId);
                continue;
            }

            var rentalId = await connection.ExecuteScalarAsync<ulong>(
                new CommandDefinition(
                    insertSql,
                    new
                    {
                        batch.RentalDate,
                        batch.DueDate,
                        InventoryId = inventoryId,
                        batch.CustomerId,
                        batch.StaffId,
                    },
                    transaction,
                    cancellationToken: cancellationToken));

            rentalIds.Add((int)rentalId);
            assignedInventoryIds.Add(inventoryId.Value);
        }

        if (unavailableFilmIds.Count > 0)
        {
            // All-or-nothing: the operator gets a conflict and can refresh.
            await transaction.RollbackAsync(cancellationToken);
            return new RentalBatchResult { RentalIds = [], UnavailableFilmIds = unavailableFilmIds };
        }

        await transaction.CommitAsync(cancellationToken);
        return new RentalBatchResult { RentalIds = rentalIds, UnavailableFilmIds = [] };
    }

    public async Task<bool> MarkReturnedAsync(int rentalId, DateTime returnDate, CancellationToken cancellationToken = default)
    {
        // The `AND return_date IS NULL` guard makes a double return a no-op.
        var sql = """
            UPDATE rental
            SET return_date = @ReturnDate
            WHERE rental_id = @RentalId AND return_date IS NULL
            """;

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var affectedRows = await connection.ExecuteAsync(
            new CommandDefinition(sql, new { RentalId = rentalId, ReturnDate = returnDate }, cancellationToken: cancellationToken));
        return affectedRows > 0;
    }

    public async Task<int> CountOpenRentalsAsync(ushort customerId, CancellationToken cancellationToken = default)
    {
        const string sql = "SELECT COUNT(*) FROM rental WHERE customer_id = @CustomerId AND return_date IS NULL";

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { CustomerId = customerId }, cancellationToken: cancellationToken));
    }

    /// <summary>Escapes LIKE wildcards so user input is matched literally.</summary>
    private static string EscapeLikePattern(string value) =>
        value.Replace("%", "\\%").Replace("_", "\\_");
}
