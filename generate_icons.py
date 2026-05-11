"""
Generate PWA icons for Smart Resource Allocation
Creates PNG icons at required sizes using only stdlib (no Pillow needed)
"""
import struct
import zlib
import math
import os

def create_png(width, height, pixels):
    """Create a PNG file from RGBA pixel data."""
    def png_chunk(chunk_type, data):
        chunk_len = len(data)
        chunk_data = chunk_type + data
        crc = zlib.crc32(chunk_data) & 0xffffffff
        return struct.pack('>I', chunk_len) + chunk_data + struct.pack('>I', crc)

    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    # color type 2 = RGB, but we'll use 6 = RGBA
    ihdr_data = struct.pack('>II', width, height) + bytes([8, 6, 0, 0, 0])
    ihdr = png_chunk(b'IHDR', ihdr_data)

    # IDAT chunk - image data
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # filter type none
        for x in range(width):
            r, g, b, a = pixels[y][x]
            raw_data += bytes([r, g, b, a])

    compressed = zlib.compress(raw_data, 9)
    idat = png_chunk(b'IDAT', compressed)

    # IEND chunk
    iend = png_chunk(b'IEND', b'')

    return signature + ihdr + idat + iend


def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def draw_icon(size, maskable=False):
    """Draw the Smart Resource Allocation icon."""
    pixels = [[(0, 0, 0, 0)] * size for _ in range(size)]

    # Colors
    bg_top = (30, 58, 138)    # #1e3a8a
    bg_bot = (37, 99, 235)    # #2563eb
    white = (255, 255, 255, 255)

    padding = int(size * 0.15) if maskable else 0
    radius = size * 0.2 if not maskable else 0

    # Draw background
    for y in range(size):
        for x in range(size):
            # Gradient color
            t = (x + y) / (2 * size)
            r, g, b = lerp_color(bg_top, bg_bot, t)

            if maskable:
                pixels[y][x] = (r, g, b, 255)
            else:
                # Rounded rectangle
                in_rect = True
                if x < radius and y < radius:
                    dist = math.sqrt((x - radius)**2 + (y - radius)**2)
                    in_rect = dist <= radius
                elif x > size - radius and y < radius:
                    dist = math.sqrt((x - (size - radius))**2 + (y - radius)**2)
                    in_rect = dist <= radius
                elif x < radius and y > size - radius:
                    dist = math.sqrt((x - radius)**2 + (y - (size - radius))**2)
                    in_rect = dist <= radius
                elif x > size - radius and y > size - radius:
                    dist = math.sqrt((x - (size - radius))**2 + (y - (size - radius))**2)
                    in_rect = dist <= radius

                if in_rect:
                    pixels[y][x] = (r, g, b, 255)

    # Draw heart shape
    cx = size / 2
    cy = size / 2
    heart_size = (size - 2 * padding) * 0.42

    hx = cx - heart_size / 2
    hy = cy - heart_size / 2 + heart_size * 0.05

    for y in range(size):
        for x in range(size):
            if pixels[y][x][3] == 0:
                continue
            # Normalize to heart coordinate space
            nx = (x - hx) / heart_size
            ny = (y - hy) / heart_size

            # Heart equation: (x^2 + y^2 - 1)^3 - x^2*y^3 <= 0
            # Adjusted for top-down orientation
            tx = (nx - 0.5) * 2
            ty = (ny - 0.7) * 2

            val = (tx**2 + ty**2 - 1)**3 - tx**2 * ty**3
            if val <= 0.05:
                pixels[y][x] = white

    return pixels


def save_icon(filename, size, maskable=False):
    pixels = draw_icon(size, maskable)
    png_data = create_png(size, size, pixels)
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, 'wb') as f:
        f.write(png_data)
    print(f"  Created: {filename} ({size}x{size})")


base = os.path.join(os.path.dirname(__file__), 'frontend', 'public')
os.makedirs(base, exist_ok=True)

print("Generating PWA icons...")
save_icon(os.path.join(base, 'pwa-64x64.png'), 64)
save_icon(os.path.join(base, 'pwa-192x192.png'), 192)
save_icon(os.path.join(base, 'pwa-512x512.png'), 512)
save_icon(os.path.join(base, 'maskable-icon-512x512.png'), 512, maskable=True)
save_icon(os.path.join(base, 'apple-touch-icon.png'), 180)
save_icon(os.path.join(base, 'favicon.ico'), 32)
print("Done!")
