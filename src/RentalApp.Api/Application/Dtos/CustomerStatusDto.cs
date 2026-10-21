namespace RentalApp.Api.Application.Dtos;

/// <summary>Result of a member deactivate/reactivate operation.</summary>
public class CustomerStatusDto
{
    public ushort CustomerId { get; set; }
    public bool Active { get; set; }
}
