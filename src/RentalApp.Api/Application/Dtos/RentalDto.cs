namespace RentalApp.Api.Application.Dtos;

/// <summary>Public rental representation (one rented copy).</summary>
public class RentalDto
{
    public int RentalId { get; set; }
    public DateTime RentalDate { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime? ReturnDate { get; set; }

    /// <summary>Open and past its due date (computed server-side).</summary>
    public bool Overdue { get; set; }

    public ushort CustomerId { get; set; }
    public string Customer { get; set; } = string.Empty;
    public byte StoreId { get; set; }
    public string Store { get; set; } = string.Empty;
    public string Staff { get; set; } = string.Empty;
    public ushort FilmId { get; set; }
    public string FilmTitle { get; set; } = string.Empty;
    public uint InventoryId { get; set; }
}
