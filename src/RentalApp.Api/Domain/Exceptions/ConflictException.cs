namespace RentalApp.Api.Domain.Exceptions;

/// <summary>Raised when a unique business rule is violated (mapped to HTTP 409).</summary>
public sealed class ConflictException : DomainException
{
    public ConflictException(string message)
        : base(message)
    {
    }
}
