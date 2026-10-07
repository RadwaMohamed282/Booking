using BookingApp.Api.Data;
using BookingApp.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BookingApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    private readonly AppDbContext _context;

    public RoomsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("GetAllRooms")]
    public async Task<ActionResult<IEnumerable<Room>>> GetRooms()
    {
        return Ok(await _context.Rooms.ToListAsync());
    }

    [HttpGet("GetRoomById/{id}")]
    public async Task<ActionResult<Room>> GetRoom(int id)
    {
        var room = await _context.Rooms.FindAsync(id);
        if (room == null)
        {
            return NotFound();
        }

        return Ok(room);
    }

    [HttpPost("CreateRoom")]
    public async Task<ActionResult<Room>> CreateRoom(Room room)
    {
        var isDuplicate = await _context.Rooms.AnyAsync(r => r.RoomNumber == room.RoomNumber);
        if (isDuplicate)
        {
            return Conflict($"Room number '{room.RoomNumber}' already exists.");
        }

        _context.Rooms.Add(room);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRoom), new { id = room.Id }, room);
    }

    [HttpPut("UpdateRoomById/{id}")]
    public async Task<IActionResult> UpdateRoom(int id, Room updatedRoom)
    {
        var room = await _context.Rooms.FindAsync(id);
        if (room == null)
        {
            return NotFound();
        }

        var isDuplicate = await _context.Rooms
            .AnyAsync(r => r.Id != id && r.RoomNumber == updatedRoom.RoomNumber);
        if (isDuplicate)
        {
            return Conflict($"Room number '{updatedRoom.RoomNumber}' already exists.");
        }

        room.RoomNumber = updatedRoom.RoomNumber;
        room.AdultsCapacity = updatedRoom.AdultsCapacity;
        room.ChildrenCapacity = updatedRoom.ChildrenCapacity;
        room.Price = updatedRoom.Price;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("DeleteRoomById/{id}")]
    public async Task<IActionResult> DeleteRoom(int id)
    {
        var room = await _context.Rooms.FindAsync(id);
        if (room == null)
        {
            return NotFound();
        }

        _context.Rooms.Remove(room);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
