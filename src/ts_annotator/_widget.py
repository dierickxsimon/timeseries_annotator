"""Anywidget-based time series annotation widget."""

from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING

import anywidget
import traitlets

if TYPE_CHECKING:
    from ts_annotator._label import LabelConfig

_STATIC_DIR = Path(__file__).parent / "static"


class TimeSeriesAnnotator(anywidget.AnyWidget):
    """Interactive time series annotation widget for Marimo.

    This IS an anywidget, so it works directly in Marimo cells or wrapped in mo.ui.anywidget().

    Parameters
    ----------
    data : list[float]
        The time series values to display and annotate.
    labels : list[LabelConfig]
        Annotation label definitions. Each label defines a name, color,
        and whether it's a point or range annotation.
    sample_rate : float
        X-axis scaling factor (default 1). When set to e.g. 100,
        the x-axis displays values in seconds rather than sample indices.
    x_label : str
        X-axis label text.
    y_label : str
        Y-axis label text.

    Attributes
    ----------
    annotations : list[dict]
        The current annotation results. Each dict has keys:
        ``name``, ``color``, ``type``, ``value``. The ``value`` field
        is filled in by user interaction.

    Examples
    --------
    >>> import marimo as mo
    >>> from ts_annotator import TimeSeriesAnnotator, LabelConfig
    >>>
    >>> widget = TimeSeriesAnnotator(
    ...     data=[1.0, 2.0, 3.0, 2.5, 1.5],
    ...     labels=[LabelConfig("Peak", "#E5484D", "point")],
    ... )
    >>> widget          # cell 1: displays the widget
    >>> widget.annotations  # cell 2: reactive readout
    """

    # Widget assets
    _esm = traitlets.Unicode((_STATIC_DIR / "widget.bundle.js").read_text()).tag(sync=True)
    _css = traitlets.Unicode((_STATIC_DIR / "widget.css").read_text()).tag(sync=True)

    # Input traits
    data_json = traitlets.Unicode("[]").tag(sync=True)
    labels_json = traitlets.Unicode("[]").tag(sync=True)
    sample_rate = traitlets.Float(1.0).tag(sync=True)
    x_label = traitlets.Unicode("Sample").tag(sync=True)
    y_label = traitlets.Unicode("Value").tag(sync=True)

    # Output trait
    annotations_json = traitlets.Unicode("[]").tag(sync=True)

    def __init__(
        self,
        data: list[float],
        labels: list[LabelConfig],
        sample_rate: float = 1.0,
        x_label: str = "Sample",
        y_label: str = "Value",
    ) -> None:
        super().__init__(
            data_json=json.dumps(data),
            labels_json=json.dumps([label.to_dict() for label in labels]),
            sample_rate=sample_rate,
            x_label=x_label,
            y_label=y_label,
        )

    @property
    def annotations(self) -> list[dict]:
        """Current annotation results (reactive in Marimo).

        Returns
        -------
        list[dict]
            Each dict has keys ``name``, ``color``, ``type``, ``value``.
            ``value`` is ``None`` if no annotation has been placed for
            that label, otherwise:

            - point: ``list[int]``
            - range: ``list[tuple[int, int]]``
        """
        raw: str = self.annotations_json
        if not raw:
            return []

        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            return []

        # JSON transports tuples as lists. Normalize range values back to
        # list[tuple[int, int]] for a stable Python API.
        for item in parsed:
            if not isinstance(item, dict):
                continue
            if item.get("type") != "range":
                continue

            value = item.get("value")
            if value is None:
                continue

            if isinstance(value, list):
                tuples: list[tuple[int, int]] = []
                for pair in value:
                    if (
                        isinstance(pair, (list, tuple))
                        and len(pair) == 2
                        and isinstance(pair[0], (int, float))
                        and isinstance(pair[1], (int, float))
                    ):
                        tuples.append((int(pair[0]), int(pair[1])))
                item["value"] = tuples

        return parsed

    def __repr__(self) -> str:
        n_samples = len(json.loads(self.data_json))
        n_labels = len(json.loads(self.labels_json))
        return f"TimeSeriesAnnotator({n_samples} samples, {n_labels} labels)"
