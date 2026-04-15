"""Tests for ts_annotator.streamlit.streamlit_annotator."""

from __future__ import annotations

import types

from ts_annotator._label import LabelConfig
from ts_annotator.streamlit import streamlit_annotator


class _FakeComponentsV1:
    def __init__(self, return_value: list[dict] | None) -> None:
        self.return_value = return_value
        self.calls: list[dict] = []
        self.declared: tuple[str, str] | None = None

    def declare_component(self, name: str, path: str):
        self.declared = (name, path)

        def _component(**kwargs):
            self.calls.append(kwargs)
            return self.return_value

        return _component


def _install_fake_streamlit(monkeypatch, return_value: list[dict] | None):
    fake_v1 = _FakeComponentsV1(return_value=return_value)

    fake_streamlit = types.ModuleType("streamlit")
    fake_streamlit.session_state = {}

    fake_components_module = types.ModuleType("streamlit.components")
    fake_v1_module = types.ModuleType("streamlit.components.v1")
    fake_v1_module.declare_component = fake_v1.declare_component

    monkeypatch.setitem(__import__("sys").modules, "streamlit", fake_streamlit)
    monkeypatch.setitem(__import__("sys").modules, "streamlit.components", fake_components_module)
    monkeypatch.setitem(__import__("sys").modules, "streamlit.components.v1", fake_v1_module)

    return fake_streamlit, fake_v1


def test_returns_default_when_component_returns_none(monkeypatch) -> None:
    fake_streamlit, fake_v1 = _install_fake_streamlit(monkeypatch, return_value=None)

    labels = [LabelConfig("Peak", "#E5484D", "point")]
    initial = [{"name": "Peak", "color": "#E5484D", "type": "point", "value": 3}]

    result = streamlit_annotator(
        data=[0.0, 1.0, 2.0],
        labels=labels,
        default_annotations=initial,
        key="a",
    )

    assert result == initial
    assert fake_streamlit.session_state["_ts_annotator_annotations_a"] == initial
    assert fake_v1.declared is not None
    assert fake_v1.declared[0] == "ts_annotator"
    assert fake_v1.calls[0]["default_annotations"] == initial
    assert fake_v1.calls[0]["default"] == initial


def test_uses_session_state_default_on_rerun(monkeypatch) -> None:
    fake_streamlit, fake_v1 = _install_fake_streamlit(
        monkeypatch,
        return_value=[{"name": "Peak", "color": "#E5484D", "type": "point", "value": 7}],
    )

    labels = [LabelConfig("Peak", "#E5484D", "point")]
    first = streamlit_annotator(data=[0.0, 1.0, 2.0], labels=labels, key="persist")
    assert first[0]["value"] == 7

    fake_v1.return_value = None
    second = streamlit_annotator(data=[0.0, 1.0, 2.0], labels=labels, key="persist")

    assert second == first
    assert fake_streamlit.session_state["_ts_annotator_annotations_persist"] == first
    assert fake_v1.calls[-1]["default_annotations"] == first
