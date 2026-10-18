using Dapper;
using RentalApp.Api.Domain.Entities;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Api.Infrastructure.Persistence;

/// <summary>Dapper adapter for the sakila lookup tables (address, city, store).</summary>
public class LookupRepository : ILookupRepository
{
    private readonly MySqlConnectionFactory _connectionFactory;

    public LookupRepository(MySqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<AddressOption>> GetAddressesAsync(CancellationToken cancellationToken = default)
    {
        var sql = """
            SELECT a.address_id AS AddressId,
                   CONCAT(a.address, ', ', ci.city, ' (', a.district, ')') AS Display
            FROM address a
            JOIN city ci ON ci.city_id = a.city_id
            ORDER BY a.address_id
            """;

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var addresses = await connection.QueryAsync<AddressOption>(
            new CommandDefinition(sql, cancellationToken: cancellationToken));
        return addresses.ToList();
    }

    public async Task<IReadOnlyList<StoreOption>> GetStoresAsync(CancellationToken cancellationToken = default)
    {
        var sql = """
            SELECT st.store_id AS StoreId,
                   CONCAT('Store ', st.store_id, ' - ', a.address, ', ', ci.city) AS Display
            FROM store st
            JOIN address a ON a.address_id = st.address_id
            JOIN city ci ON ci.city_id = a.city_id
            ORDER BY st.store_id
            """;

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var stores = await connection.QueryAsync<StoreOption>(
            new CommandDefinition(sql, cancellationToken: cancellationToken));
        return stores.ToList();
    }

    public async Task<bool> AddressExistsAsync(ushort addressId, CancellationToken cancellationToken = default)
    {
        const string sql = "SELECT COUNT(*) FROM address WHERE address_id = @AddressId";

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var count = await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { AddressId = addressId }, cancellationToken: cancellationToken));
        return count > 0;
    }

    public async Task<bool> StoreExistsAsync(byte storeId, CancellationToken cancellationToken = default)
    {
        const string sql = "SELECT COUNT(*) FROM store WHERE store_id = @StoreId";

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var count = await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { StoreId = storeId }, cancellationToken: cancellationToken));
        return count > 0;
    }
}
