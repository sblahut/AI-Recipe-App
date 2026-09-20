import socket


def primary_lan_ipv4() -> str | None:
    """Best-effort LAN IPv4 for phones on the same Wi-Fi (not loopback)."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            ip = sock.getsockname()[0]
    except OSError:
        return None
    if ip.startswith("127.") or ip.startswith("169.254."):
        return None
    return ip
