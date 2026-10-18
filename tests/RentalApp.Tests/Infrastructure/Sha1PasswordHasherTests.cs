using RentalApp.Api.Infrastructure.Security;

namespace RentalApp.Tests;

public class Sha1PasswordHasherTests
{
    private readonly Sha1PasswordHasher _hasher = new();

    [Fact]
    public void Hash_ReturnsUppercaseSha1HexOf40Chars()
    {
        var hash = _hasher.Hash("secret123");

        Assert.Equal(40, hash.Length);
        Assert.Matches("^[0-9A-F]{40}$", hash);
    }

    [Fact]
    public void Hash_KnownVector_MatchesExpectedDigest()
    {
        // SHA-1("password") is a well-known test vector.
        var hash = _hasher.Hash("password");

        Assert.Equal("5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8", hash);
    }

    [Fact]
    public void Hash_SameInput_ReturnsSameHash()
    {
        Assert.Equal(_hasher.Hash("secret123"), _hasher.Hash("secret123"));
    }

    [Fact]
    public void Hash_DifferentInput_ReturnsDifferentHash()
    {
        Assert.NotEqual(_hasher.Hash("secret123"), _hasher.Hash("secret124"));
    }

    [Fact]
    public void Hash_NeverReturnsTheClearPassword()
    {
        var hash = _hasher.Hash("secret123");

        Assert.DoesNotContain("secret123", hash, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Hash_EmptyPassword_Throws()
    {
        Assert.ThrowsAny<ArgumentException>(() => _hasher.Hash(string.Empty));
    }

    [Theory]
    [InlineData("secret123")]
    [InlineData("another password!")]
    public void Verify_CorrectPassword_ReturnsTrue(string password)
    {
        var hash = _hasher.Hash(password);

        Assert.True(_hasher.Verify(password, hash));
    }

    [Fact]
    public void Verify_WrongPassword_ReturnsFalse()
    {
        var hash = _hasher.Hash("secret123");

        Assert.False(_hasher.Verify("wrongPassword", hash));
    }

    [Fact]
    public void Verify_LowercaseStoredHash_StillReturnsTrue()
    {
        // Accepts hashes stored in lowercase so legacy rows keep working.
        var hash = _hasher.Hash("secret123").ToLowerInvariant();

        Assert.True(_hasher.Verify("secret123", hash));
    }

    [Theory]
    [InlineData("", "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8")]
    [InlineData("password", "")]
    public void Verify_EmptyArguments_ReturnsFalse(string password, string storedHash)
    {
        Assert.False(_hasher.Verify(password, storedHash));
    }
}
