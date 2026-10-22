using Microsoft.AspNetCore.Mvc;
using RentalApp.Api.Application;
using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Application.Services;

namespace RentalApp.Api.Controllers;

/// <summary>CRUD endpoints behind the members (socios) page.</summary>
[ApiController]
[Route("api/customers")]
public class CustomerController : ControllerBase
{
    private readonly CustomerService _customerService;

    public CustomerController(CustomerService customerService)
    {
        _customerService = customerService;
    }

    [HttpGet]
    [ProducesResponseType<PagedResultDto<CustomerDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResultDto<CustomerDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] bool? active,
        [FromQuery] int page = Pagination.DefaultPage,
        [FromQuery] int? pageSize = null,
        CancellationToken cancellationToken = default)
    {
        var customers = await _customerService.GetListAsync(search, active, page, pageSize, cancellationToken);
        return Ok(customers);
    }

    [HttpGet("{customerId:int}")]
    [ProducesResponseType<CustomerDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerDto>> GetById(ushort customerId, CancellationToken cancellationToken)
    {
        var customer = await _customerService.GetByIdAsync(customerId, cancellationToken);
        return Ok(customer);
    }

    [HttpPost]
    [ProducesResponseType<CustomerDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CustomerDto>> Create(CustomerCreateDto dto, CancellationToken cancellationToken)
    {
        var created = await _customerService.CreateAsync(dto, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { customerId = created.CustomerId }, created);
    }

    [HttpPut("{customerId:int}")]
    [ProducesResponseType<CustomerDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CustomerDto>> Update(ushort customerId, CustomerUpdateDto dto, CancellationToken cancellationToken)
    {
        var updated = await _customerService.UpdateAsync(customerId, dto, cancellationToken);
        return Ok(updated);
    }

    [HttpPut("{customerId:int}/active")]
    [ProducesResponseType<CustomerStatusDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CustomerStatusDto>> SetActive(
        ushort customerId,
        CustomerSetActiveDto dto,
        CancellationToken cancellationToken)
    {
        var status = await _customerService.SetActiveAsync(customerId, dto.Active, cancellationToken);
        return Ok(status);
    }
}
