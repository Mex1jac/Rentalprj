using Dapper;
using RentalApp.Api.Domain.Entities;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Api.Infrastructure.Persistence;

/// <summary>Dapper adapter for the sakila.film table.</summary>
public class FilmRepository : IFilmRepository
{
    private const string BaseSelect = """
        SELECT f.film_id AS FilmId,
               f.title AS Title,
               f.description AS Description,
               f.release_year AS ReleaseYear,
               f.language_id AS LanguageId,
               f.original_language_id AS OriginalLanguageId,
               f.rental_duration AS RentalDurationDays,
               f.rental_rate AS RentalRate,
               f.length AS LengthMinutes,
               f.replacement_cost AS ReplacementCost,
               f.rating AS Rating,
               f.special_features AS SpecialFeaturesCsv,
               (SELECT COUNT(*) FROM inventory i WHERE i.film_id = f.film_id) AS TotalCopies,
               l.name AS LanguageDisplay,
               l2.name AS OriginalLanguageDisplay
        FROM film f
        JOIN language l ON l.language_id = f.language_id
        LEFT JOIN language l2 ON l2.language_id = f.original_language_id
        """;

    /// <summary>Filters shared by the full list, the paged list and the count.</summary>
    private const string WhereClause = """
        WHERE (@Search IS NULL OR f.title LIKE @SearchPattern)
        """;

    private readonly MySqlConnectionFactory _connectionFactory;

    public FilmRepository(MySqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<Film>> GetAllAsync(
        string? search,
        CancellationToken cancellationToken = default)
    {
        var sql = BaseSelect + "\n" + WhereClause + "\nORDER BY f.title, f.film_id";

        var (normalizedSearch, searchPattern) = NormalizeSearch(search);
        var parameters = new { Search = normalizedSearch, SearchPattern = searchPattern };

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var films = await connection.QueryAsync<Film>(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return films.ToList();
    }

    public async Task<int> CountAsync(string? search, CancellationToken cancellationToken = default)
    {
        // The filters only touch film columns, so no join is needed.
        var sql = "SELECT COUNT(*) FROM film f" + "\n" + WhereClause;

        var (normalizedSearch, searchPattern) = NormalizeSearch(search);
        var parameters = new { Search = normalizedSearch, SearchPattern = searchPattern };

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<Film>> GetPageAsync(
        string? search,
        int limit,
        int offset,
        CancellationToken cancellationToken = default)
    {
        var sql = BaseSelect
            + "\n" + WhereClause
            + "\nORDER BY f.title, f.film_id"
            + "\nLIMIT @Limit OFFSET @Offset";

        var (normalizedSearch, searchPattern) = NormalizeSearch(search);
        var parameters = new
        {
            Search = normalizedSearch,
            SearchPattern = searchPattern,
            Limit = limit,
            Offset = offset,
        };

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var films = await connection.QueryAsync<Film>(
            new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return films.ToList();
    }

    public async Task<Film?> GetByIdAsync(ushort filmId, CancellationToken cancellationToken = default)
    {
        var sql = BaseSelect + "\n WHERE f.film_id = @FilmId";

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        return await connection.QuerySingleOrDefaultAsync<Film>(
            new CommandDefinition(sql, new { FilmId = filmId }, cancellationToken: cancellationToken));
    }

    public async Task<ushort> CreateAsync(
        Film film,
        IReadOnlyList<byte> storeIds,
        int copiesPerStore,
        CancellationToken cancellationToken = default)
    {
        // The film row and its inventory copies are written atomically: a film
        // without copies would never show up in the rental form.
        const string filmSql = """
            INSERT INTO film (title, description, release_year, language_id, original_language_id,
                              rental_duration, rental_rate, length, replacement_cost, rating, special_features)
            VALUES (@Title, @Description, @ReleaseYear, @LanguageId, @OriginalLanguageId,
                    @RentalDurationDays, @RentalRate, @LengthMinutes, @ReplacementCost, @Rating, @SpecialFeaturesCsv);
            SELECT LAST_INSERT_ID();
            """;
        const string copySql = "INSERT INTO inventory (film_id, store_id) VALUES (@FilmId, @StoreId)";

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        try
        {
            var newId = await connection.ExecuteScalarAsync<ulong>(
                new CommandDefinition(filmSql, film, transaction, cancellationToken: cancellationToken));

            foreach (var storeId in storeIds)
            {
                for (var copy = 0; copy < copiesPerStore; copy++)
                {
                    await connection.ExecuteAsync(
                        new CommandDefinition(copySql, new { FilmId = newId, StoreId = storeId },
                            transaction, cancellationToken: cancellationToken));
                }
            }

            await transaction.CommitAsync(cancellationToken);
            return (ushort)newId;
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    public async Task<bool> UpdateAsync(Film film, CancellationToken cancellationToken = default)
    {
        // last_update keeps its ON UPDATE CURRENT_TIMESTAMP behavior.
        var sql = """
            UPDATE film
            SET title = @Title,
                description = @Description,
                release_year = @ReleaseYear,
                language_id = @LanguageId,
                original_language_id = @OriginalLanguageId,
                rental_duration = @RentalDurationDays,
                rental_rate = @RentalRate,
                length = @LengthMinutes,
                replacement_cost = @ReplacementCost,
                rating = @Rating,
                special_features = @SpecialFeaturesCsv
            WHERE film_id = @FilmId
            """;

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var affectedRows = await connection.ExecuteAsync(
            new CommandDefinition(sql, film, cancellationToken: cancellationToken));
        return affectedRows > 0;
    }

    public async Task<int> CountInventoryAsync(ushort filmId, CancellationToken cancellationToken = default)
    {
        const string sql = "SELECT COUNT(*) FROM inventory WHERE film_id = @FilmId";

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { FilmId = filmId }, cancellationToken: cancellationToken));
    }

    public async Task<bool> DeleteAsync(ushort filmId, CancellationToken cancellationToken = default)
    {
        // FK fk_inventory_film is RESTRICT: the service pre-checks references,
        // so a plain delete only reaches here for unused films.
        const string sql = "DELETE FROM film WHERE film_id = @FilmId";

        await using var connection = await _connectionFactory.OpenConnectionAsync(cancellationToken);
        var affectedRows = await connection.ExecuteAsync(
            new CommandDefinition(sql, new { FilmId = filmId }, cancellationToken: cancellationToken));
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
