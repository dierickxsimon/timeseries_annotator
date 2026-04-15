"""Tests for ts_annotator._widget.TimeSeriesAnnotator."""

import json

import pytest

from ts_annotator._label import LabelConfig
from ts_annotator._widget import TimeSeriesAnnotator


class TestTimeSeriesAnnotator:
    @pytest.fixture()
    def sample_labels(self) -> list[LabelConfig]:
        return [
            LabelConfig(name="Peak", color="#E5484D", type="point"),
            LabelConfig(name="Region", color="#7C5CFC", type="range"),
        ]

    @pytest.fixture()
    def sample_data(self) -> list[float]:
        return [1.0, 2.0, 3.0, 2.5, 1.5, 0.5]

    def test_init_sets_traits(
        self, sample_data: list[float], sample_labels: list[LabelConfig]
    ) -> None:
        w = TimeSeriesAnnotator(data=sample_data, labels=sample_labels)
        assert json.loads(w.data_json) == sample_data
        assert len(json.loads(w.labels_json)) == 2
        assert w.sample_rate == 1.0

    def test_custom_sample_rate(
        self, sample_data: list[float], sample_labels: list[LabelConfig]
    ) -> None:
        w = TimeSeriesAnnotator(data=sample_data, labels=sample_labels, sample_rate=100.0)
        assert w.sample_rate == 100.0

    def test_annotations_empty_initially(
        self, sample_data: list[float], sample_labels: list[LabelConfig]
    ) -> None:
        w = TimeSeriesAnnotator(data=sample_data, labels=sample_labels)
        assert w.annotations == []

    def test_annotations_reads_from_trait(
        self, sample_data: list[float], sample_labels: list[LabelConfig]
    ) -> None:
        w = TimeSeriesAnnotator(data=sample_data, labels=sample_labels)
        # Simulate JS setting the trait
        fake_output = [
            {"name": "Peak", "color": "#E5484D", "type": "point", "value": [2]},
            {
                "name": "Region",
                "color": "#7C5CFC",
                "type": "range",
                "value": [[1, 4], [7, 9]],
            },
        ]
        w.annotations_json = json.dumps(fake_output)
        result = w.annotations
        assert result[0]["value"] == [2]
        assert result[1]["value"] == [(1, 4), (7, 9)]

    def test_repr(self, sample_data: list[float], sample_labels: list[LabelConfig]) -> None:
        w = TimeSeriesAnnotator(data=sample_data, labels=sample_labels)
        assert "6 samples" in repr(w)
        assert "2 labels" in repr(w)

    def test_custom_axis_labels(
        self, sample_data: list[float], sample_labels: list[LabelConfig]
    ) -> None:
        w = TimeSeriesAnnotator(
            data=sample_data,
            labels=sample_labels,
            x_label="Time (s)",
            y_label="Force (N)",
        )
        assert w.x_label == "Time (s)"
        assert w.y_label == "Force (N)"
