namespace RentalApp.Api.Domain.Entities;

/// <summary>
/// Input to persist one rental batch: the same customer, staff, store and
/// dates applied to 1+ films (Task-02: rent one or more movies in one
/// operation, for a number of days).
/// </summary>
public class RentalBatch
{
    public ushort CustomerId { get; set; }
    public ushort StaffId { get; set; }
    public byte StoreId { get; set; }
    public DateTime RentalDate { get; set; }
    public DateTime DueDate { get; set; }

    /// <summary>
    /// Days captured by the operator (DueDate - RentalDate): used to charge
    /// one payment per rental at (days * film rental_rate).
    /// </summary>
    public int RentalDays { get; set; }

    public IReadOnlyList<ushort> FilmIds { get; set; } = [];
}
