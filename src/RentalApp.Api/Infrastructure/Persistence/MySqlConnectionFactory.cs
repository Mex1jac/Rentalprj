using MySqlConnector;

namespace RentalApp.Api.Infrastructure.Persistence;

/// <summary>Factory that opens a fresh MySQL connection per operation.</summary>
public class MySqlConnectionFactory
{
    private readonly string _connectionString;

    public MySqlConnectionFactory(IConfiguration configuration)
    {
        // Connection string comes from configuration (never hard-coded in source).
        _connectionString = configuration.GetConnectionString("Sakila")
            ?? throw new InvalidOperationException(
                "Connection string 'Sakila' is missing. Set it in appsettings.Development.json " +
                "or in the ConnectionStrings__Sakila environment variable.");
    }

    public async Task<MySqlConnection> OpenConnectionAsync(CancellationToken cancellationToken = default)
    {
        var connection = new MySqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        return connection;
    }
}
