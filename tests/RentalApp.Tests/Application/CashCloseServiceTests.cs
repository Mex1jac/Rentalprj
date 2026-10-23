using Moq;
using RentalApp.Api.Application.Dtos;
using RentalApp.Api.Application.Services;
using RentalApp.Api.Domain.Entities;
using RentalApp.Api.Domain.Exceptions;
using RentalApp.Api.Domain.Ports;

namespace RentalApp.Tests.Application;

public class CashCloseServiceTests
{
    private readonly Mock<ICashCloseRepository> _cashCloseRepository = new();
    private readonly CashCloseService _service;

    public CashCloseServiceTests()
    {
        _service = new CashCloseService(_cashCloseRepository.Object);
    }

    private void SetupReport(IReadOnlyList<CashCloseFilm> films)
    {
        _cashCloseRepository.Setup(r => r.GetReportAsync(
                It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(films);
    }

    private static CashCloseFilm Row(ushort filmId, string title, int rentals, int open, decimal amount) => new()
    {
        FilmId = filmId,
        Title = title,
        Rentals = rentals,
        OpenRentals = open,
        Amount = amount,
    };

    // --- Validation -----------------------------------------------------------

    [Fact]
    public async Task GetReport_FromAfterTo_ThrowsValidation()
    {
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _service.GetReportAsync(new DateOnly(2026, 10, 22), new DateOnly(2026, 10, 21)));

        Assert.Equal("From must be on or before To.", ex.Message);
        _cashCloseRepository.Verify(r => r.GetReportAsync(
            It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetReport_PeriodSpanningMoreThanMaxDays_ThrowsValidation()
    {
        // 367 days apart (2024 is a leap year): beyond MaxPeriodDays = 366.
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            _service.GetReportAsync(new DateOnly(2024, 1, 1), new DateOnly(2025, 1, 2)));

        Assert.Equal(
            $"The selected period cannot span more than {CashCloseService.MaxPeriodDays} days.",
            ex.Message);
        _cashCloseRepository.Verify(r => r.GetReportAsync(
            It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetReport_PeriodOfExactlyMaxDays_IsAccepted()
    {
        // 366 days apart: the boundary is inclusive.
        SetupReport([]);

        var report = await _service.GetReportAsync(new DateOnly(2024, 1, 1), new DateOnly(2025, 1, 1));

        Assert.Equal(0, report.Rentals);
        _cashCloseRepository.Verify(r => r.GetReportAsync(
            new DateOnly(2024, 1, 1), new DateOnly(2025, 1, 1), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetReport_SingleDayPeriod_IsAccepted()
    {
        SetupReport([Row(1, "ACADEMY DINOSAUR", 2, 1, 5.98m)]);

        var report = await _service.GetReportAsync(new DateOnly(2026, 10, 22), new DateOnly(2026, 10, 22));

        Assert.Equal(new DateOnly(2026, 10, 22), report.From);
        Assert.Equal(new DateOnly(2026, 10, 22), report.To);
        _cashCloseRepository.Verify(r => r.GetReportAsync(
            new DateOnly(2026, 10, 22), new DateOnly(2026, 10, 22), It.IsAny<CancellationToken>()), Times.Once);
    }

    // --- Report shape ---------------------------------------------------------

    [Fact]
    public async Task GetReport_AggregatesTotalsFromTheFilmRows()
    {
        SetupReport(
        [
            Row(1, "AIRPLANE SIERRA", rentals: 3, open: 2, amount: 15.96m),
            Row(2, "ACADEMY DINOSAUR", rentals: 1, open: 0, amount: 4.99m),
        ]);

        var report = await _service.GetReportAsync(new DateOnly(2026, 10, 1), new DateOnly(2026, 10, 31));

        Assert.Equal(4, report.Rentals);
        Assert.Equal(2, report.OpenRentals);
        // Returned = rentals - open (the split always adds up to the total).
        Assert.Equal(2, report.ReturnedRentals);
        Assert.Equal(2, report.DistinctFilms);
        Assert.Equal(20.95m, report.Amount);
        Assert.Equal(2, report.Films.Count);
        Assert.Equal("AIRPLANE SIERRA", report.Films[0].Title);
        Assert.Equal(15.96m, report.Films[0].Amount);
    }

    [Fact]
    public async Task GetReport_EmptyPeriod_ReturnsZeroTotals()
    {
        SetupReport([]);

        var report = await _service.GetReportAsync(new DateOnly(2026, 10, 22), new DateOnly(2026, 10, 22));

        Assert.Equal(0, report.Rentals);
        Assert.Equal(0, report.OpenRentals);
        Assert.Equal(0, report.ReturnedRentals);
        Assert.Equal(0, report.DistinctFilms);
        Assert.Equal(0m, report.Amount);
        Assert.Empty(report.Films);
    }

    [Fact]
    public async Task GetReport_MapsEveryFilmRow()
    {
        SetupReport([Row(42, "ACE GOLDFINGER", rentals: 5, open: 5, amount: 14.95m)]);

        var report = await _service.GetReportAsync(new DateOnly(2026, 10, 22), new DateOnly(2026, 10, 22));

        var film = Assert.Single(report.Films);
        Assert.Equal((ushort)42, film.FilmId);
        Assert.Equal("ACE GOLDFINGER", film.Title);
        Assert.Equal(5, film.Rentals);
        Assert.Equal(5, film.OpenRentals);
        Assert.Equal(14.95m, film.Amount);
    }
}
