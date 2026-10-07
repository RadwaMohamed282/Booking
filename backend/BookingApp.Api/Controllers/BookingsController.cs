using BookingApp.Api.Data;
using BookingApp.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public BookingsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("GetAllBookings")]
    public async Task<ActionResult<IEnumerable<Booking>>> GetAllBookings()
    {
        var bookings = await _context.Bookings
            .Include(b => b.Room)
            .AsNoTracking()
            .ToListAsync();

        bookings.ForEach(RemoveRoomBookingsBackReference);

        return Ok(bookings);
    }

    [HttpGet("GetBookingById/{id}")]
    public async Task<ActionResult<Booking>> GetBookingById(int id)
    {
        var booking = await _context.Bookings
            .Include(b => b.Room)
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null)
        {
            return NotFound();
        }

        RemoveRoomBookingsBackReference(booking);

        return Ok(booking);
    }

    [HttpPost("CreateBooking")]
    public async Task<ActionResult<Booking>> CreateBooking(Booking booking)
    {
        var roomExists = await _context.Rooms.AnyAsync(r => r.Id == booking.RoomId);
        if (!roomExists)
        {
            return BadRequest($"Room with id {booking.RoomId} does not exist.");
        }

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBookingById), new { id = booking.Id }, booking);
    }

    [HttpPut("UpdateBookingById/{id}")]
    public async Task<IActionResult> UpdateBookingById(int id, Booking updatedBooking)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null)
        {
            return NotFound();
        }

        var roomExists = await _context.Rooms.AnyAsync(r => r.Id == updatedBooking.RoomId);
        if (!roomExists)
        {
            return BadRequest($"Room with id {updatedBooking.RoomId} does not exist.");
        }

        booking.GuestFirstName = updatedBooking.GuestFirstName;
        booking.GuestLastName = updatedBooking.GuestLastName;
        booking.CheckInDate = updatedBooking.CheckInDate;
        booking.CheckOutDate = updatedBooking.CheckOutDate;
        booking.NumberOfAdults = updatedBooking.NumberOfAdults;
        booking.NumberOfChildren = updatedBooking.NumberOfChildren;
        booking.RoomId = updatedBooking.RoomId;
        booking.Status = updatedBooking.Status;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("DeleteBookingById/{id}")]
    public async Task<IActionResult> DeleteBookingById(int id)
    {
        var booking = await _context.Bookings.FindAsync(id);
        if (booking == null)
        {
            return NotFound();
        }

        _context.Bookings.Remove(booking);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("SearchBookings")]
    public async Task<ActionResult<IEnumerable<Booking>>> SearchBookings(
        [FromQuery] string? guestName,
        [FromQuery] string? status)
    {
        var query = _context.Bookings.Include(b => b.Room).AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(guestName))
        {
            query = query.Where(b =>
                EF.Functions.Like(b.GuestFirstName, $"%{guestName}%") ||
                EF.Functions.Like(b.GuestLastName, $"%{guestName}%"));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<BookingStatus>(status, ignoreCase: true, out var parsedStatus))
            {
                var allowedValues = string.Join(", ", Enum.GetNames<BookingStatus>());
                return BadRequest($"Invalid status '{status}'. Allowed values: {allowedValues}");
            }

            query = query.Where(b => b.Status == parsedStatus);
        }

        var results = await query.ToListAsync();
        results.ForEach(RemoveRoomBookingsBackReference);

        return Ok(results);
    }

    // EF Core fixes up the inverse Room.Bookings navigation from the Include(b => b.Room)
    // query, which would otherwise serialize as a self-referencing cycle.
    private static void RemoveRoomBookingsBackReference(Booking booking)
    {
        if (booking.Room != null)
        {
            booking.Room.Bookings = new List<Booking>();
        }
    }
}
