namespace RentalApp.Api.Domain.Exceptions;

/// <summary>Raised when business validation fails (mapped to HTTP 400).</summary>
public sealed class ValidationException : DomainException
{
    public ValidationException(string message)
        : base(message)
    {
    }
}
