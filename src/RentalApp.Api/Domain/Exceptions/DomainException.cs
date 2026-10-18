namespace RentalApp.Api.Domain.Exceptions;

/// <summary>Base class for business errors raised by the domain/application layers.</summary>
public abstract class DomainException : Exception
{
    protected DomainException(string message)
        : base(message)
    {
    }
}
