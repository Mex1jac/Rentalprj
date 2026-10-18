using System.Security.Cryptography;
using System.Text;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Api.Infrastructure.Security;

/// <summary>
/// Hides passwords at rest using SHA-1 with an uppercase hex digest, which is
/// the format expected by the sakila staff.password CHAR(40) column.
/// The clear password is never stored nor returned.
/// </summary>
public class Sha1PasswordHasher : IPasswordHasher
{
    public string Hash(string password)
    {
        ArgumentException.ThrowIfNullOrEmpty(password);

        var hashBytes = SHA1.HashData(Encoding.UTF8.GetBytes(password));
        return Convert.ToHexString(hashBytes);
    }

    public bool Verify(string password, string passwordHash)
    {
        if (string.IsNullOrEmpty(password) || string.IsNullOrEmpty(passwordHash))
        {
            return false;
        }

        var computedHash = Hash(password);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computedHash),
            Encoding.UTF8.GetBytes(passwordHash.ToUpperInvariant()));
    }
}
