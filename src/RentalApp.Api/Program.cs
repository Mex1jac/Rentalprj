using RentalApp.Api.Application.Services;
using RentalApp.Api.Domain.Ports;
using RentalApp.Api.Infrastructure.Middleware;
using RentalApp.Api.Infrastructure.Persistence;
using RentalApp.Api.Infrastructure.Security;

var builder = WebApplication.CreateBuilder(args);

// Layered (DDD) composition: ports are implemented by infrastructure adapters.
builder.Services.AddSingleton<MySqlConnectionFactory>();
builder.Services.AddSingleton<IStaffRepository, StaffRepository>();
builder.Services.AddSingleton<ICustomerRepository, CustomerRepository>();
builder.Services.AddSingleton<IRentalRepository, RentalRepository>();
builder.Services.AddSingleton<ILookupRepository, LookupRepository>();
builder.Services.AddSingleton<IPasswordHasher, Sha1PasswordHasher>();
builder.Services.AddScoped<StaffService>();
builder.Services.AddScoped<CustomerService>();
builder.Services.AddScoped<RentalService>();
builder.Services.AddScoped<LookupService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS is driven by the "Cors:AllowedOrigins" section (empty by default).
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
if (allowedOrigins.Length > 0)
{
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowedOrigins", policy => policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
    });
}

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (allowedOrigins.Length > 0)
{
    app.UseCors("AllowedOrigins");
}

app.UseAuthorization();
app.MapControllers();

app.Run();
