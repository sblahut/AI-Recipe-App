from app.routers.meta import home_network
from app.services.home_network import primary_lan_ipv4


def test_primary_lan_ipv4_is_not_loopback_when_present():
    ip = primary_lan_ipv4()
    if ip is not None:
        assert not ip.startswith("127.")


def test_home_network_response_shape():
    body = home_network()
    if body.lan_host:
        assert body.expo_go_url == f"exp://{body.lan_host}:8081"
    else:
        assert body.expo_go_url is None
