"""Streamlit integration for the time series annotator.

Uses a small ``streamlit-component-lib`` wrapper around the widget to
support bidirectional value passing.

Example
-------
>>> import streamlit as st
>>> from ts_annotator.streamlit import streamlit_annotator
>>> from ts_annotator import LabelConfig
>>>
>>> streamlit_annotator(
...     data=my_data,
...     labels=[LabelConfig("Peak", "#E5484D", "point")],
... )
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ts_annotator._label import LabelConfig

_STATIC_DIR = Path(__file__).parent / "static"


def streamlit_annotator(
    data: list[float],
    labels: list[LabelConfig],
    sample_rate: float = 1.0,
    x_label: str = "Sample",
    y_label: str = "Value",
    default_annotations: list[dict] | None = None,
    key: str | None = None,
) -> list[dict]:
    """Render the annotator in Streamlit and return current annotations.

    Parameters
    ----------
    data : list[float]
        The time series values.
    labels : list[LabelConfig]
        Annotation label definitions.
    sample_rate : float
        X-axis scaling factor.
    x_label, y_label : str
        Axis labels.
    default_annotations : list[dict] | None
        Initial annotation value used on first render. If ``key`` is set,
        the latest value is persisted in ``st.session_state`` and used as
        the default for subsequent reruns unless this parameter is provided.
    key : str | None
        Streamlit component key.

    Returns
    -------
    list[dict]
        Annotation output in the same format as ``TimeSeriesAnnotator.annotations``.
    """
    import streamlit as st
    import streamlit.components.v1 as components

    component = components.declare_component("ts_annotator", path=str(_STATIC_DIR))

    state_key = f"_ts_annotator_annotations_{key}" if key else None
    if default_annotations is None and state_key and state_key in st.session_state:
        initial = st.session_state[state_key]
    else:
        initial = default_annotations or []


    result = component(
        data=list(data),
        labels=[label.to_dict() for label in labels],
        sample_rate=sample_rate,
        x_label=x_label,
        y_label=y_label,
        default_annotations=initial,
        default=initial,
        key=key,
    )

    if result is None:
        result = initial

    if state_key:
        st.session_state[state_key] = result

    return result
