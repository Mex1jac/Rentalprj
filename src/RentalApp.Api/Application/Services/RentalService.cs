using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Domain.Entities;
using RentalApp.Api.Domain.Exceptions;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Api.Application.Services;

/// <summary>
/// Use cases behind the rentals page: list rentals for tracking, rent one or
/// more films to a member for a number of days (Task-02) and register returns.
/// </summary>
public class RentalService
{
    /// <summary>Maximum number of days an operator can grant on one rental.</summary>
    public const int MaxRentalDays = 90;
    private const int MaxFilmsPerRental = 50;

    private readonly IRentalRepository _rentalRepository;
    private readonly ICustomerRepository _customerRepository;
    private readonly IStaffRepository _staffRepository;
    private readonly ILookupRepository _lookupRepository;

    public RentalService(
        IRentalRepository rentalRepository,
        ICustomerRepository customerRepository,
        IStaffRepository staffRepository,
        ILookupRepository lookupRepository)
    {
        _rentalRepository = rentalRepository;
        _customerRepository = customerRepository;
        _staffRepository = staffRepository;
        _lookupRepository = lookupRepository;
    }

    public async Task<PagedResultDto<RentalDto>> GetListAsync(
        string? search,
        RentalListStatus status,
        int page = Pagination.DefaultPage,
        int? pageSize = null,
        CancellationToken cancellationToken = default)
    {
        Pagination.Validate(page, pageSize);

        if (pageSize is null)
        {
            // Unbounded list (rentals are capped by the repository at 500 rows).
            var all = await _rentalRepository.GetAllAsync(search, status, cancellationToken);
            return new PagedResultDto<RentalDto>
            {
                Items = all.Select(MapToDto).ToList(),
                Page = 1,
                PageSize = all.Count,
                Total = all.Count,
            };
        }

        var total = await _rentalRepository.CountAsync(search, status, cancellationToken);
        var rows = await _rentalRepository.GetPageAsync(
            search, status, pageSize.Value, (page - 1) * pageSize.Value, cancellationToken);

        return new PagedResultDto<RentalDto>
        {
            Items = rows.Select(MapToDto).ToList(),
            Page = page,
            PageSize = pageSize.Value,
            Total = total,
        };
    }

    public async Task<RentalDto> GetByIdAsync(int rentalId, CancellationToken cancellationToken = default)
    {
        var rental = await _rentalRepository.GetByIdAsync(rentalId, cancellationToken);
        if (rental is null)
        {
            throw new NotFoundException($"Rental with id {rentalId} was not found.");
        }

        return MapToDto(rental);
    }

    /// <summary>
    /// Rents one physical copy of each requested film to a member. The copy
    /// assignment and the inserts run in a single repository transaction; the
    /// due date is the rental date plus the captured number of days.
    /// </summary>
    public async Task<IReadOnlyList<RentalDto>> CreateAsync(RentalCreateDto dto, CancellationToken cancellationToken = default)
    {
        if (dto.FilmIds.Count == 0)
        {
            throw new ValidationException("At least one film must be selected.");
        }

        if (dto.FilmIds.Count > MaxFilmsPerRental)
        {
            throw new ValidationException($"A rental can include at most {MaxFilmsPerRental} films.");
        }

        if (dto.RentalDays < 1 || dto.RentalDays > MaxRentalDays)
        {
            throw new ValidationException($"Rental days must be between 1 and {MaxRentalDays}.");
        }

        var customer = await _customerRepository.GetByIdAsync(dto.CustomerId, cancellationToken)
            ?? throw new NotFoundException($"Customer with id {dto.CustomerId} was not found.");
        if (!customer.Active)
        {
            throw new ConflictException(
                $"Customer {customer.FirstName} {customer.LastName} is inactive and cannot rent films.");
        }

        var staff = await _staffRepository.GetByIdAsync(dto.StaffId, cancellationToken)
            ?? throw new NotFoundException($"Staff with id {dto.StaffId} was not found.");
        if (!staff.Active)
        {
            throw new ConflictException(
                $"Staff {staff.FirstName} {staff.LastName} is inactive and cannot process rentals.");
        }

        if (!await _lookupRepository.StoreExistsAsync(dto.StoreId, cancellationToken))
        {
            throw new ValidationException($"Store with id {dto.StoreId} does not exist.");
        }

        await EnsureStockAsync(dto, cancellationToken);

        var rentalDate = DateTime.Now;
        var result = await _rentalRepository.CreateAsync(new RentalBatch
        {
            CustomerId = dto.CustomerId,
            StaffId = dto.StaffId,
            StoreId = dto.StoreId,
            RentalDate = rentalDate,
            DueDate = rentalDate.AddDays(dto.RentalDays),
            RentalDays = dto.RentalDays,
            FilmIds = dto.FilmIds,
        }, cancellationToken);

        if (result.UnavailableFilmIds.Count > 0)
        {
            // A concurrent operator took the last copy between the check and the insert.
            throw new ConflictException(
                "The selected films no longer have enough available copies. Refresh and try again.");
        }

        var created = await _rentalRepository.GetByIdsAsync(result.RentalIds, cancellationToken);
        return created.Select(MapToDto).ToList();
    }

    public async Task<RentalDto> ReturnAsync(int rentalId, CancellationToken cancellationToken = default)
    {
        var rental = await _rentalRepository.GetByIdAsync(rentalId, cancellationToken)
            ?? throw new NotFoundException($"Rental with id {rentalId} was not found.");
        if (rental.ReturnDate is not null)
        {
            throw new ConflictException($"Rental with id {rentalId} was already returned.");
        }

        var returnDate = DateTime.Now;
        var marked = await _rentalRepository.MarkReturnedAsync(rentalId, returnDate, cancellationToken);
        if (!marked)
        {
            // Lost a race against another operator registering the same return.
            throw new ConflictException($"Rental with id {rentalId} was already returned.");
        }

        rental.ReturnDate = returnDate;
        return MapToDto(rental);
    }

    /// <summary>
    /// Pre-checks that every requested film is stocked at the store and has
    /// enough copies not currently on rental, so the conflict message can name
    /// the exact film.
    /// </summary>
    private async Task EnsureStockAsync(RentalCreateDto dto, CancellationToken cancellationToken)
    {
        var filmsAtStore = await _lookupRepository.GetFilmsAsync(dto.StoreId, cancellationToken);
        var byId = filmsAtStore.ToDictionary(f => f.FilmId);
        var requested = dto.FilmIds
            .GroupBy(filmId => filmId)
            .ToDictionary(group => group.Key, group => group.Count());

        foreach (var (filmId, count) in requested)
        {
            if (!byId.TryGetValue(filmId, out var film))
            {
                throw new ConflictException($"Film with id {filmId} is not stocked at the selected store.");
            }

            if (film.AvailableCopies < count)
            {
                throw new ConflictException(
                    $"Film '{film.Title}' does not have enough available copies at the selected store.");
            }
        }
    }

    private static RentalDto MapToDto(Rental rental) => new()
    {
        RentalId = rental.RentalId,
        RentalDate = rental.RentalDate,
        DueDate = rental.DueDate,
        ReturnDate = rental.ReturnDate,
        Overdue = rental.IsOverdue,
        CustomerId = rental.CustomerId,
        Customer = rental.CustomerName,
        StoreId = rental.StoreId,
        Store = rental.StoreDisplay,
        Staff = rental.StaffName,
        FilmId = rental.FilmId,
        FilmTitle = rental.FilmTitle,
        InventoryId = rental.InventoryId,
    };
}
