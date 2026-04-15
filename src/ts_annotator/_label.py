"""Label configuration dataclass for annotation definitions."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Literal


@dataclass
class LabelConfig:
    """Configuration for a single annotation label.

    Parameters
    ----------
    name : str
        Display name for the label (e.g. "Peak", "Artifact").
    color : str
        CSS color string (e.g. "#E5484D", "rgb(229,72,77)").
    type : Literal["point", "range"]
        "point" for single-click annotations (returns an index),
        "range" for click-drag annotations (returns a tuple of indices).
    value : int | tuple[int, int] | list | None
        Output field. ``None`` on input; filled by the widget after annotation.

        - point: ``int`` (single annotation) or ``list[int]`` (multiple)
        - range: ``[int, int]`` (single) or ``list[[int, int]]`` (multiple)
    """

    name: str
    color: str
    type: Literal["point", "range"]

    def __post_init__(self) -> None:
        if self.type not in ("point", "range"):
            msg = f"type must be 'point' or 'range', got {self.type!r}"
            raise ValueError(msg)
        if not self.name:
            msg = "name must be a non-empty string"
            raise ValueError(msg)
        if not self.color:
            msg = "color must be a non-empty CSS color string"
            raise ValueError(msg)

    def to_dict(self) -> dict:
        """Serialize to a plain dict for JSON transport."""
        return asdict(self)
