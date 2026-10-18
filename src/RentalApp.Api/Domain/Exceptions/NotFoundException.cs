namespace RentalApp.Api.Domain.Exceptions;

/// <summary>Raised when a requested entity does not exist (mapped to HTTP 404).</summary>
public sealed class NotFoundException : DomainException
{
    public NotFoundException(string message)
        : base(message)
    {
    }
}
