namespace RentalApp.Api.Domain.Ports;

/// <summary>
/// Hides passwords at rest: only the hash is ever stored or returned.
/// The sakila staff.password column is CHAR(40), which matches an
/// uppercase SHA-1 hex digest.
/// </summary>
public interface IPasswordHasher
{
    string Hash(string password);

    bool Verify(string password, string passwordHash);
}
