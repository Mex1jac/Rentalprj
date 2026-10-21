namespace RentalApp.Api.Domain.Entities;

/// <summary>
/// One rented copy (sakila.rental) joined with its display data. DueDate is
/// the agreed return deadline (rental date + operator-captured days; see
/// db/migrations/001_add_rental_due_date.sql).
/// </summary>
public class Rental
{
    public int RentalId { get; set; }
    public DateTime RentalDate { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime? ReturnDate { get; set; }
    public ushort CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public byte StoreId { get; set; }
    public string StoreDisplay { get; set; } = string.Empty;
    public string StaffName { get; set; } = string.Empty;
    public ushort FilmId { get; set; }
    public string FilmTitle { get; set; } = string.Empty;
    public uint InventoryId { get; set; }

    public bool IsOpen => ReturnDate is null;

    /// <summary>Open and past its due date.</summary>
    public bool IsOverdue => IsOpen && DueDate < DateTime.Now;
}
