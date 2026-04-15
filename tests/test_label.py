"""Tests for ts_annotator._label.LabelConfig."""

import pytest

from ts_annotator._label import LabelConfig


class TestLabelConfig:
    def test_valid_point_label(self) -> None:
        lc = LabelConfig(name="Peak", color="#E5484D", type="point")
        assert lc.name == "Peak"
        assert lc.type == "point"

    def test_valid_range_label(self) -> None:
        lc = LabelConfig(name="Artifact", color="#E5960B", type="range")
        assert lc.type == "range"

    def test_to_dict(self) -> None:
        lc = LabelConfig(name="Peak", color="#E5484D", type="point")
        d = lc.to_dict()
        assert d == {"name": "Peak", "color": "#E5484D", "type": "point"}


    def test_invalid_type_raises(self) -> None:
        with pytest.raises(ValueError, match="type must be"):
            LabelConfig(name="Bad", color="#000", type="invalid")

    def test_empty_name_raises(self) -> None:
        with pytest.raises(ValueError, match="name must be"):
            LabelConfig(name="", color="#000", type="point")

    def test_empty_color_raises(self) -> None:
        with pytest.raises(ValueError, match="color must be"):
            LabelConfig(name="Peak", color="", type="point")
