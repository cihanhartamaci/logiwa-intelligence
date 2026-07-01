from src.source_loader import load_default_sources


def test_load_default_sources():
    sources = load_default_sources()
    assert len(sources) >= 8
    assert sources[0]["name"]
    assert sources[0]["url"]
    assert "category" in sources[0]
