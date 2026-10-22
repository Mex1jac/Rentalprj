using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Domain.Entities;
using RentalApp.Api.Domain.Exceptions;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Api.Application.Services;

/// <summary>
/// Use cases for the members (socios) page: list, create, edit and logical
/// leave. Validations mirror StaffService wording where the rule is shared.
/// </summary>
public class CustomerService
{
    private readonly ICustomerRepository _customerRepository;
    private readonly ILookupRepository _lookupRepository;
    private readonly IRentalRepository _rentalRepository;

    public CustomerService(
        ICustomerRepository customerRepository,
        ILookupRepository lookupRepository,
        IRentalRepository rentalRepository)
    {
        _customerRepository = customerRepository;
        _lookupRepository = lookupRepository;
        _rentalRepository = rentalRepository;
    }

    public async Task<PagedResultDto<CustomerDto>> GetListAsync(
        string? search,
        bool? active,
        int page = Pagination.DefaultPage,
        int? pageSize = null,
        CancellationToken cancellationToken = default)
    {
        Pagination.Validate(page, pageSize);

        if (pageSize is null)
        {
            // Unbounded list, kept for callers that need every row (e.g. the
            // rental-form member dropdown).
            var all = await _customerRepository.GetAllAsync(search, active, cancellationToken);
            return new PagedResultDto<CustomerDto>
            {
                Items = all.Select(MapToDto).ToList(),
                Page = 1,
                PageSize = all.Count,
                Total = all.Count,
            };
        }

        var total = await _customerRepository.CountAsync(search, active, cancellationToken);
        var rows = await _customerRepository.GetPageAsync(
            search, active, pageSize.Value, (page - 1) * pageSize.Value, cancellationToken);

        return new PagedResultDto<CustomerDto>
        {
            Items = rows.Select(MapToDto).ToList(),
            Page = page,
            PageSize = pageSize.Value,
            Total = total,
        };
    }

    public async Task<CustomerDto> GetByIdAsync(ushort customerId, CancellationToken cancellationToken = default)
    {
        var customer = await _customerRepository.GetByIdAsync(customerId, cancellationToken);
        if (customer is null)
        {
            throw new NotFoundException($"Customer with id {customerId} was not found.");
        }

        return MapToDto(customer);
    }

    public async Task<CustomerDto> CreateAsync(CustomerCreateDto dto, CancellationToken cancellationToken = default)
    {
        ValidateBasicData(dto.FirstName, dto.LastName, dto.Email);
        await EnsureForeignKeysExistAsync(dto.AddressId, dto.StoreId, cancellationToken);

        var customer = new Customer
        {
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            Email = NormalizeEmail(dto.Email),
            AddressId = dto.AddressId,
            StoreId = dto.StoreId,
            Active = true,
            // The sakila customer.create_date column has no default.
            CreateDate = DateTime.Now,
        };

        var customerId = await _customerRepository.CreateAsync(customer, cancellationToken);
        return await GetByIdAsync(customerId, cancellationToken);
    }

    public async Task<CustomerDto> UpdateAsync(ushort customerId, CustomerUpdateDto dto, CancellationToken cancellationToken = default)
    {
        ValidateBasicData(dto.FirstName, dto.LastName, dto.Email);

        var existing = await _customerRepository.GetByIdAsync(customerId, cancellationToken)
            ?? throw new NotFoundException($"Customer with id {customerId} was not found.");

        await EnsureForeignKeysExistAsync(dto.AddressId, dto.StoreId, cancellationToken);

        existing.FirstName = dto.FirstName.Trim();
        existing.LastName = dto.LastName.Trim();
        existing.Email = NormalizeEmail(dto.Email);
        existing.AddressId = dto.AddressId;
        existing.StoreId = dto.StoreId;

        await _customerRepository.UpdateAsync(existing, cancellationToken);

        return await GetByIdAsync(customerId, cancellationToken);
    }

    public async Task<CustomerStatusDto> SetActiveAsync(
        ushort customerId,
        bool active,
        CancellationToken cancellationToken = default)
    {
        // A member with films still out on rental cannot be deactivated.
        if (!active)
        {
            var openRentals = await _rentalRepository.CountOpenRentalsAsync(customerId, cancellationToken);
            if (openRentals > 0)
            {
                var open = openRentals == 1 ? "1 open rental" : $"{openRentals} open rentals";
                throw new ConflictException(
                    $"Customer with id {customerId} has {open} and cannot be deactivated.");
            }
        }

        var exists = await _customerRepository.SetActiveAsync(customerId, active, cancellationToken);
        if (!exists)
        {
            throw new NotFoundException($"Customer with id {customerId} was not found.");
        }

        return new CustomerStatusDto { CustomerId = customerId, Active = active };
    }

    private static void ValidateBasicData(string firstName, string lastName, string? email)
    {
        if (string.IsNullOrWhiteSpace(firstName) || firstName.Trim().Length > 45)
        {
            throw new ValidationException("First name is required and cannot exceed 45 characters.");
        }

        if (string.IsNullOrWhiteSpace(lastName) || lastName.Trim().Length > 45)
        {
            throw new ValidationException("Last name is required and cannot exceed 45 characters.");
        }

        if (!string.IsNullOrWhiteSpace(email) && email.Trim().Length > 50)
        {
            throw new ValidationException("Email cannot exceed 50 characters.");
        }
    }

    private async Task EnsureForeignKeysExistAsync(
        ushort addressId,
        byte storeId,
        CancellationToken cancellationToken)
    {
        if (!await _lookupRepository.AddressExistsAsync(addressId, cancellationToken))
        {
            throw new ValidationException($"Address with id {addressId} does not exist.");
        }

        if (!await _lookupRepository.StoreExistsAsync(storeId, cancellationToken))
        {
            throw new ValidationException($"Store with id {storeId} does not exist.");
        }
    }

    private static string? NormalizeEmail(string? email) =>
        string.IsNullOrWhiteSpace(email) ? null : email.Trim();

    private static CustomerDto MapToDto(Customer customer) => new()
    {
        CustomerId = customer.CustomerId,
        FirstName = customer.FirstName,
        LastName = customer.LastName,
        Email = customer.Email,
        AddressId = customer.AddressId,
        Address = customer.AddressDisplay,
        StoreId = customer.StoreId,
        Store = customer.StoreDisplay,
        Active = customer.Active,
    };
}
